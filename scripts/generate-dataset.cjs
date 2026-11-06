#!/usr/bin/env node
// The browser, worker and CLI all call this same archive builder.
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { once } = require('node:events');
const { Writable } = require('node:stream');
const { finished } = require('node:stream/promises');
const { Reader, TextWriter, ZipReader } = require('@zip.js/zip.js');

const USAGE = `Usage: npm run generate:dataset -- --output dataset.zip [--count 1000] [--seed normal-diversity-v1] [--config config.json] [--legacy]

The standard generator enables scene, camera-movement and optics diversity by default.
--config accepts a JSON GenerateDatasetConfig; explicit --count/--seed override it.
--legacy sets diversity:false. Existing output files are never overwritten.
`;

function parseArgs(args) {
  const options = {};
  const valued = new Set(['--count', '--seed', '--output', '--config']);
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (Object.hasOwn(options, flag)) throw new Error(`Duplicate option: ${flag}`);
    if (flag === '--help' || flag === '--legacy') options[flag] = true;
    else if (valued.has(flag) && args[index + 1] !== undefined && !args[index + 1].startsWith('--')) {
      options[flag] = args[++index];
    } else throw new Error(`Unknown option or missing value: ${flag}`);
  }
  return options;
}

async function loadConfig(options) {
  const supplied = options['--config'] ? JSON.parse(await fsp.readFile(path.resolve(options['--config']), 'utf8')) : {};
  if (!supplied || typeof supplied !== 'object' || Array.isArray(supplied)) throw new Error('--config must contain a JSON object');
  const simulationCount = options['--count'] === undefined ? (supplied.simulationCount ?? 1000) : Number(options['--count']);
  if (!Number.isSafeInteger(simulationCount) || simulationCount <= 0) throw new Error('--count/simulationCount must be a positive safe integer');
  const seed = options['--seed'] ?? supplied.seed ?? 'normal-diversity-v1';
  if (!['string', 'number'].includes(typeof seed) || (typeof seed === 'number' && !Number.isFinite(seed))) {
    throw new Error('seed must be a string or finite number');
  }
  return { ...supplied, simulationCount, seed, ...(options['--legacy'] ? { diversity: false } : {}) };
}

class LocalFileReader extends Reader {
  constructor(handle, size) { super(); this.handle = handle; this.size = size; }
  async readUint8Array(offset, length) {
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(length) || length < 0) {
      throw new Error('Invalid ZIP read bounds');
    }
    const bytes = Buffer.alloc(Math.max(0, Math.min(length, this.size - offset)));
    let received = 0;
    while (received < bytes.length) {
      const result = await this.handle.read(bytes, received, bytes.length - received, offset + received);
      if (!result.bytesRead) throw new Error('Unexpected end of generated ZIP');
      received += result.bytesRead;
    }
    // zip.js attaches its own offset to sliced arrays. Buffer.offset has a
    // different built-in meaning, so expose a plain Uint8Array view instead.
    return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
}

async function inspectArchive(output, datasetId) {
  const handle = await fsp.open(output, 'r');
  const zip = new ZipReader(new LocalFileReader(handle, (await handle.stat()).size), { useWebWorkers: false });
  try {
    let manifestText, clips = 0, dictionaries = 0;
    const manifestEntry = `${datasetId}/manifest.json`;
    for await (const entry of zip.getEntriesGenerator()) {
      if (entry.filename === manifestEntry) {
        if (manifestText !== undefined) throw new Error('Generated ZIP contains duplicate manifests');
        manifestText = await entry.getData(new TextWriter(), { checkSignature: true });
      } else if (entry.filename === `${datasetId}/parameter_dictionary.msgpack`) dictionaries++;
      else if (entry.filename.startsWith(`${datasetId}/simulation_${datasetId}_`) && entry.filename.endsWith('.msgpack')) clips++;
    }
    if (manifestText === undefined || dictionaries !== 1) throw new Error('Generated ZIP is missing its manifest or parameter dictionary');
    const manifest = JSON.parse(manifestText);
    if (manifest.datasetId !== datasetId || manifest.config?.simulationCount !== clips) {
      throw new Error('Actual ZIP sample count differs from its manifest');
    }
    return { manifest, clips, manifestEntry, manifestSha256: crypto.createHash('sha256').update(manifestText).digest('hex') };
  } finally {
    await zip.close();
    await handle.close();
  }
}

async function fileSha256(output) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(output)) hash.update(chunk);
  return hash.digest('hex');
}

async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (options['--help']) { process.stdout.write(USAGE); return; }
  if (!options['--output']) throw new Error('--output is required');
  const config = await loadConfig(options);
  require('./register-typescript.cjs');
  const { buildRandomDatasetArchive, normalizeDatasetConfig } = require('../src/service/dataset/generate.ts');
  normalizeDatasetConfig(config); // Fail invalid options before reserving a file.
  const output = path.resolve(options['--output']);
  const controller = new AbortController();
  const interrupt = () => controller.abort(new Error('Dataset generation interrupted'));
  let reserved = false, destination;
  try {
    destination = fs.createWriteStream(output, { flags: 'wx', mode: 0o600 });
    await once(destination, 'open');
    reserved = true;
    process.once('SIGINT', interrupt); process.once('SIGTERM', interrupt);
    const result = await buildRandomDatasetArchive(config, { writable: Writable.toWeb(destination), signal: controller.signal });
    await finished(destination);
    const actual = await inspectArchive(output, result.datasetId);
    if (actual.clips !== config.simulationCount) throw new Error('Actual ZIP sample count differs from the requested count');
    const receipt = {
      output, datasetId: result.datasetId, clips: actual.clips,
      bytes: (await fsp.stat(output)).size, sha256: await fileSha256(output),
      manifest: actual.manifestEntry, manifestSha256: actual.manifestSha256,
      schemaVersion: actual.manifest.schemaVersion, generatorVersion: actual.manifest.generatorVersion,
      generationProfile: actual.manifest.generationProfile,
      seed: actual.manifest.seed, cameraMovementCounts: actual.manifest.realized?.cameraMovementCounts,
    };
    process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
    return receipt;
  } catch (error) {
    if (destination) { destination.destroy(); await finished(destination).catch(() => {}); }
    if (reserved) await fsp.unlink(output).catch((cleanupError) => {
      if (cleanupError.code !== 'ENOENT') error.message += `; failed to remove partial output: ${cleanupError.message}`;
    });
    throw error;
  } finally {
    process.removeListener('SIGINT', interrupt); process.removeListener('SIGTERM', interrupt);
  }
}

module.exports = { main, parseArgs, loadConfig, inspectArchive, LocalFileReader };
if (require.main === module) main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
