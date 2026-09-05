const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const { BlobReader, Uint8ArrayWriter, ZipReader } = require("@zip.js/zip.js");
const ts = require("typescript");

const SEED = "dataset-performance-baseline";

async function loadDatasetGenerator() {
  const sourceDirectory = path.resolve(__dirname, "../src");
  const originalTsLoader = require.extensions[".ts"];
  // Preload this ESM dependency so the benchmark also works on early Node 22
  // versions that cannot require ESM modules directly.
  const uuid = await import("uuid");

  require.extensions[".ts"] = (module, filename) => {
    if (!filename.startsWith(`${sourceDirectory}${path.sep}`)) {
      return (originalTsLoader ?? require.extensions[".js"])(module, filename);
    }

    const requireFromModule = module.require.bind(module);
    module.require = (id) => {
      if (id === "uuid") return uuid;
      return requireFromModule(
        id.startsWith("@/") ? path.join(sourceDirectory, id.slice(2)) : id
      );
    };
    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
      fileName: filename,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    });
    module._compile(outputText, filename);
  };

  try {
    return require(path.join(sourceDirectory, "service/dataset/generate.ts"));
  } finally {
    if (originalTsLoader) require.extensions[".ts"] = originalTsLoader;
    else delete require.extensions[".ts"];
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") {
    console.log("Usage: npm run benchmark:dataset -- [sample-count] (default: 100)");
    return;
  }
  const simulationCount = args.length === 0 ? 100 : Number(args[0]);
  if (args.length > 1 || !Number.isSafeInteger(simulationCount) || simulationCount <= 0) {
    throw new Error("Sample count must be a positive safe integer.");
  }

  const { buildRandomDatasetArchive } = await loadDatasetGenerator();
  const start = performance.now();
  const result = await buildRandomDatasetArchive({
    simulationCount,
    seed: SEED,
    minFrameCount: 100,
    maxFrameCount: 500,
  });
  const generationMs = performance.now() - start;
  assert.ok(result.data instanceof Blob, "Generator must return a ZIP Blob.");

  const reader = new ZipReader(new BlobReader(result.data), { useWebWorkers: false });
  const sampleHash = createHash("sha256");
  let entryCount;
  try {
    const entries = await reader.getEntries();
    const directory = `${result.datasetId}/`;
    const sampleFilenames = Array.from({ length: simulationCount }, (_, index) =>
      `${directory}simulation_${result.datasetId}_${String(index).padStart(String(simulationCount).length, "0")}.msgpack`
    );
    assert.deepEqual(entries.map((entry) => entry.filename), [
      directory,
      ...sampleFilenames,
      `${directory}parameter_dictionary.msgpack`,
      `${directory}manifest.json`,
    ], "ZIP must contain every sample, its dictionary, and its manifest in order.");
    assert.ok(entries[0].directory, "First ZIP entry must be the dataset directory.");

    for (let index = 1; index < entries.length; index++) {
      assert.ok(!entries[index].directory, "Dataset file entries must not be directories.");
      const bytes = await entries[index].getData(new Uint8ArrayWriter(), { checkSignature: true });
      // Only sample contents enter the hash; filenames and metadata contain a
      // fresh dataset UUID and timestamp on every invocation.
      if (index <= simulationCount) sampleHash.update(bytes);
    }
    entryCount = entries.length;
  } finally {
    await reader.close();
  }

  console.log(JSON.stringify({
    node: process.version,
    seed: SEED,
    simulationCount,
    frameCountRange: [100, 500],
    generationMs: Number(generationMs.toFixed(2)),
    samplesPerSecond: Number((simulationCount * 1000 / generationMs).toFixed(2)),
    archiveBytes: result.data.size,
    verifiedZipEntries: entryCount,
    crcVerified: true,
    sampleSha256: sampleHash.digest("hex"),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
