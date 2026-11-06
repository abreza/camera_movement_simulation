#!/usr/bin/env node
// Generate an additive, seeded ET-compatible synthetic export without a browser.
require('./register-typescript.cjs');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { buildRandomDatasetArchive } = require('../src/service/dataset/generate.ts');

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    process.stdout.write('Usage: node scripts/generate-et-dataset.cjs --profile calibration.json --count 1000 --seed et-sim-v1 --lens et-proxy|fixed --output dataset.zip\n');
    return;
  }
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--profile', '--count', '--seed', '--output', '--lens'].includes(args[i]) || !args[i + 1]) {
      throw new Error(`Invalid option: ${args[i]}`);
    }
    options[args[i].slice(2)] = args[i + 1];
  }
  if (!options.profile || !options.output) throw new Error('--profile and --output are required');
  const lens = options.lens ?? 'et-proxy';
  if (!['et-proxy', 'fixed'].includes(lens)) throw new Error('--lens must be et-proxy or fixed');
  const output = path.resolve(options.output);
  // Reserve the destination first so existing exports are never replaced.
  const destination = await fs.open(output, 'wx');
  try {
    const calibrationBytes = await fs.readFile(path.resolve(options.profile));
    const calibration = JSON.parse(calibrationBytes.toString('utf8'));
    const result = await buildRandomDatasetArchive({
      simulationCount: Number(options.count ?? 1000),
      seed: options.seed ?? 'et-sim-v1',
      etTrainingProfile: { calibration, useCenteredPrincipalPointFovProxy: lens === 'et-proxy' },
    });
    if (!result.data) throw new Error('Archive writer returned no data');
    const bytes = Buffer.from(await result.data.arrayBuffer());
    await destination.writeFile(bytes);
    process.stdout.write(`${JSON.stringify({
      output,
      datasetId: result.datasetId,
      clips: Number(options.count ?? 1000),
      bytes: bytes.length,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      calibrationSha256: crypto.createHash('sha256').update(calibrationBytes).digest('hex'),
      lens,
    }, null, 2)}\n`);
  } catch (error) {
    await destination.close();
    await fs.unlink(output);
    throw error;
  }
  await destination.close();
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
