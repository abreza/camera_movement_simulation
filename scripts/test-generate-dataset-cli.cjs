// Small real exports exercise the user CLI; no native data or large batches.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { ZipReader, Uint8ArrayReader, Uint8ArrayWriter } = require('@zip.js/zip.js');
const { unpack } = require('msgpackr');
const cli = require('./generate-dataset.cjs');
const CLI_PATH = path.join(__dirname, 'generate-dataset.cjs');

async function temporary(callback) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'lenscraft-cli-test-'));
  try { return await callback(root); }
  finally { await fs.rm(root, { recursive: true, force: true }); }
}

function run(args, expected = 0) {
  const result = spawnSync(process.execPath, [CLI_PATH, ...args], { encoding: 'utf8', timeout: 60_000 });
  assert.ifError(result.error);
  assert.equal(result.status, expected, result.stderr || result.stdout);
  return result;
}

async function decode(output) {
  const bytes = await fs.readFile(output);
  const zip = new ZipReader(new Uint8ArrayReader(new Uint8Array(bytes)), { useWebWorkers: false });
  try {
    const files = new Map();
    for (const entry of await zip.getEntries()) {
      if (!entry.directory) files.set(entry.filename.split('/').at(-1), Buffer.from(
        await entry.getData(new Uint8ArrayWriter(), { checkSignature: true })));
    }
    const payloads = [...files].filter(([name]) => name.startsWith('simulation_')).map(([, data]) => data);
    return { bytes, files, payloads, manifest: JSON.parse(files.get('manifest.json').toString('utf8')),
             dictionary: unpack(files.get('parameter_dictionary.msgpack')) };
  } finally { await zip.close(); }
}

test('help and strict option errors do not generate an archive', async () => {
  assert.match(run(['--help']).stdout, /--config.*--legacy/);
  for (const args of [['--unexpected', 'x'], ['--output'], ['--seed', 'one', '--seed', 'two']]) {
    assert.throws(() => cli.parseArgs(args));
  }
  await temporary(async (root) => {
    const output = path.join(root, 'invalid.zip');
    assert.match(run(['--count', '0', '--output', output], 1).stderr, /positive safe integer/);
    await assert.rejects(fs.stat(output), { code: 'ENOENT' });
    const config = path.join(root, 'array.json'); await fs.writeFile(config, '[]');
    assert.match(run(['--config', config, '--output', output], 1).stderr, /JSON object/);
    await assert.rejects(fs.stat(output), { code: 'ENOENT' });
  });
});

test('standard CLI streams real diverse exports and reports actual manifest counts and hashes', async () => {
  await temporary(async (root) => {
    const config = path.join(root, 'config.json');
    await fs.writeFile(config, JSON.stringify({ simulationCount: 99, seed: 'overridden', minFrameCount: 100,
      maxFrameCount: 100, diversity: { focalLength: { min: 40, max: 40 }, aspectRatios: [1] } }));
    const outputs = [path.join(root, 'one.zip'), path.join(root, 'two.zip')];
    const decoded = [];
    for (const output of outputs) {
      const receipt = JSON.parse(run(['--count', '2', '--seed', 'normal-cli-repeatable', '--config', config, '--output', output]).stdout);
      const archive = await decode(output); decoded.push(archive);
      assert.equal(receipt.output, output);
      assert.equal(receipt.clips, 2); assert.equal(archive.payloads.length, 2);
      assert.equal(receipt.bytes, archive.bytes.length);
      assert.equal(receipt.sha256, crypto.createHash('sha256').update(archive.bytes).digest('hex'));
      assert.equal(receipt.manifest, `${receipt.datasetId}/manifest.json`);
      assert.equal(receipt.manifestSha256, crypto.createHash('sha256').update(archive.files.get('manifest.json')).digest('hex'));
      assert.equal(archive.manifest.generationProfile, 'rule-based-diversity-v1');
      assert.equal(archive.manifest.config.simulationCount, 2);
      assert.equal(archive.manifest.seed, 'normal-cli-repeatable');
      assert.deepEqual(archive.manifest.config.diversity.focalLength, { min: 40, max: 40 });
      assert.deepEqual(archive.manifest.config.diversity.aspectRatios, [1]);
      assert.equal(archive.manifest.diversity.realized.sampleCount, 2);
      assert.equal(Object.values(receipt.cameraMovementCounts).reduce((a, b) => a + b, 0), 2);
      for (const payload of archive.payloads) {
        const tuple = unpack(payload);
        assert.equal(tuple.length, 4); assert.equal(tuple[2].length, 1); assert.equal(tuple[3].length, 100);
      }
    }
    assert.deepEqual(decoded[0].payloads, decoded[1].payloads, 'identical config/seed must reproduce sample contents');
    assert.deepEqual(decoded[0].dictionary.keys, decoded[1].dictionary.keys);
    assert.deepEqual(decoded[0].dictionary.values, decoded[1].dictionary.values);
  });
});

test('--legacy overrides a diversity JSON profile while retaining the standard archive format', async () => {
  await temporary(async (root) => {
    const config = path.join(root, 'config.json'); const output = path.join(root, 'legacy.zip');
    await fs.writeFile(config, JSON.stringify({ simulationCount: 1, seed: 42, minFrameCount: 100,
      maxFrameCount: 100, diversity: { focalLength: { min: 40, max: 40 } } }));
    const receipt = JSON.parse(run(['--legacy', '--config', config, '--output', output]).stdout);
    const archive = await decode(output);
    assert.equal(receipt.clips, 1); assert.equal(receipt.seed, '42');
    assert.equal(archive.manifest.generationProfile, 'legacy-rule-based');
    assert.equal(archive.manifest.config.diversity, false);
    assert.equal(archive.manifest.schemaVersion, 2); assert.equal(archive.manifest.generatorVersion, 5);
    assert.equal(archive.payloads.length, 1); assert.equal(unpack(archive.payloads[0]).length, 4);
  });
});

test('an existing export is preserved byte-for-byte', async () => {
  await temporary(async (root) => {
    const output = path.join(root, 'existing.zip'); const original = Buffer.from('existing export');
    await fs.writeFile(output, original);
    assert.match(run(['--count', '1', '--output', output], 1).stderr, /EEXIST/);
    assert.deepEqual(await fs.readFile(output), original);
  });
});

test('a failure after opening and writing the stream removes only its partial export', async () => {
  require('./register-typescript.cjs');
  const generator = require('../src/service/dataset/generate.ts');
  const original = generator.buildRandomDatasetArchive;
  try {
    generator.buildRandomDatasetArchive = async (_config, options) => {
      const writer = options.writable.getWriter();
      await writer.write(new Uint8Array([1, 2, 3])); writer.releaseLock();
      throw new Error('controlled failure after a partial stream write');
    };
    await temporary(async (root) => {
      const output = path.join(root, 'partial.zip');
      await assert.rejects(cli.main(['--count', '1', '--output', output]), /controlled failure/);
      await assert.rejects(fs.stat(output), { code: 'ENOENT' });
    });
  } finally { generator.buildRandomDatasetArchive = original; }
});
