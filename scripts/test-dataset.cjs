const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { test } = require("node:test");
const { BlobReader, Uint8ArrayWriter, ZipReader } = require("@zip.js/zip.js");
const { unpack } = require("msgpackr");
const THREE = require("three");
const { loadDatasetGenerator } = require("./benchmark-dataset.cjs");

function reconstruct(refs, dictionary) {
  const result = {};
  for (const [key, value] of refs) {
    const parts = dictionary.keys[key].split("__");
    let current = result;
    for (const part of parts.slice(0, -1)) current = current[part] ??= {};
    current[parts.at(-1)] = dictionary.values[key][value];
  }
  return result;
}

function decodeGeometry(data) {
  const subject = data[2][0];
  const pose = (f) => ({ position: new THREE.Vector3(...f.slice(0, 3).map(x => x / 1000)),
    rotation: new THREE.Euler(...f.slice(3, 6).map(x => x / 1000)) });
  return {
    subjectInfo: { subject: { id: subject.i, class: subject.c,
      dimensions: { width: subject.d[0] / 1000, height: subject.d[1] / 1000,
        depth: subject.d[2] / 1000 } }, movementType: subject.m, frames: subject.f.map(pose) },
    cameraFrames: data[3].map(f => ({ ...pose(f), focalLength: f[6] / 1000, aspectRatio: f[7] / 1000 })),
  };
}

async function inspectArchive(config) {
  const { buildRandomDatasetArchive } = await loadDatasetGenerator();
  const { deriveCinematographySetupFromPose } = require("../src/service/dataset/finalSetup.ts");
  const { projectBoundingBox } = require("../src/service/simulation/utils.ts");
  const { isProjectedBoundsFullyVisible } = require("../src/service/simulation/rule-based/setup/framing.ts");
  const result = await buildRandomDatasetArchive(config);
  const reader = new ZipReader(new BlobReader(result.data), { useWebWorkers: false });
  try {
    const entries = await reader.getEntries();
    const bytes = async (entry) => entry.getData(new Uint8ArrayWriter(), { checkSignature: true });
    const dictionary = unpack(await bytes(entries.find(e => e.filename.endsWith("parameter_dictionary.msgpack"))));
    const manifest = JSON.parse(new TextDecoder().decode(await bytes(entries.find(e => e.filename.endsWith("manifest.json")))));
    assert.equal(manifest.schemaVersion, 2);
    assert.equal(manifest.generatorVersion, 3);
    assert.equal(manifest.datasetId, dictionary.datasetId);
    assert.equal(manifest.quality.referenceFrameCount, 30);
    const samples = entries.filter(e => /\/simulation_.*\.msgpack$/.test(e.filename));
    assert.equal(samples.length, config.simulationCount);
    const hash = createHash("sha256");
    const counts = {}, cameraCounts = {}, classes = {};
    for (const entry of samples) {
      const payload = await bytes(entry);
      hash.update(payload);
      const data = unpack(payload);
      assert.equal(data.length, 4);
      assert.equal(data[2].length, 1);
      const prompt = reconstruct(data[0], dictionary).cinematography;
      const instruction = reconstruct(data[1], dictionary).simulation;
      const { cameraFrames, subjectInfo } = decodeGeometry(data);
      assert.equal(cameraFrames.length, subjectInfo.frames.length);
      assert.ok(cameraFrames.length >= config.minFrameCount && cameraFrames.length <= config.maxFrameCount);
      counts[subjectInfo.movementType] = (counts[subjectInfo.movementType] ?? 0) + 1;
      classes[subjectInfo.subject.class] = (classes[subjectInfo.subject.class] ?? 0) + 1;
      cameraCounts[prompt.movement.type] = (cameraCounts[prompt.movement.type] ?? 0) + 1;

      if (prompt.movement.type === "static") {
        assert.equal(prompt.movement.speed, "constant");
        assert.equal(instruction.dynamic.easing, "linear");
        assert.ok(data[3].every(f => f.every((x, k) => x === data[3][0][k])));
      }
      // Independent world-space checks on the decoded archive, rather than
      // calling the export validator a second time.
      const half = new THREE.Vector3(subjectInfo.subject.dimensions.width,
        subjectInfo.subject.dimensions.height, subjectInfo.subject.dimensions.depth).multiplyScalar(0.5);
      for (let i = 0; i < cameraFrames.length; i++) {
        const camera = cameraFrames[i], subject = subjectInfo.frames[i];
        assert.ok([...camera.position.toArray(), ...camera.rotation.toArray().slice(0, 3)].every(Number.isFinite));
        const inversePose = new THREE.Matrix4().compose(subject.position,
          new THREE.Quaternion().setFromEuler(subject.rotation), new THREE.Vector3(1, 1, 1)).invert();
        const local = camera.position.clone().applyMatrix4(inversePose);
        assert.ok(Math.abs(local.x) > half.x || Math.abs(local.y) > half.y || Math.abs(local.z) > half.z,
          `${entry.filename}: camera inside subject at ${i}`);
        if (instruction.constraints.allFramesVisibility) {
          assert.ok(isProjectedBoundsFullyVisible(projectBoundingBox(subjectInfo.subject.dimensions,
            subject.position, camera, subject.rotation)), `${entry.filename}: lost required visibility`);
        }
      }
      let previousVelocity;
      const selected = Array.from({ length: 30 }, (_, i) => cameraFrames[Math.round(i * (cameraFrames.length - 1) / 29)]);
      for (let i = 1; i < selected.length; i++) {
        const velocity = selected[i].position.clone().sub(selected[i - 1].position);
        assert.ok(velocity.length() <= 3.01, `${entry.filename}: excessive world translation`);
        if (previousVelocity) assert.ok(velocity.clone().sub(previousVelocity).length() <= 1.01,
          `${entry.filename}: excessive world acceleration`);
        const angle = new THREE.Quaternion().setFromEuler(selected[i - 1].rotation)
          .angleTo(new THREE.Quaternion().setFromEuler(selected[i].rotation));
        assert.ok(angle <= Math.PI / 6 + 0.004, `${entry.filename}: excessive world rotation`);
        previousVelocity = velocity;
      }
      for (const [index, supplied] of [[0, prompt.initial], [cameraFrames.length - 1, { ...prompt.initial, ...prompt.final }]]) {
        const subject = subjectInfo.frames[index];
        const observed = deriveCinematographySetupFromPose(cameraFrames[index], subjectInfo.subject, subject);
        assert.deepEqual(supplied, observed, `${entry.filename}: incorrect endpoint labels`);
        const bounds = projectBoundingBox(subjectInfo.subject.dimensions, subject.position,
          cameraFrames[index], subject.rotation);
        const completelyOffscreen = bounds.max.x < -1 || bounds.min.x > 1 || bounds.max.y < -1 || bounds.min.y > 1;
        if (completelyOffscreen) assert.ok(supplied.subjectFraming.startsWith("outer"),
          `${entry.filename}: fully offscreen endpoint labeled as ordinary framing`);
      }
    }
    for (const [name, value] of Object.entries(manifest.realized.movementCounts)) assert.equal(counts[name] ?? 0, value);
    for (const [name, value] of Object.entries(manifest.realized.subjectClassCounts)) assert.equal(classes[name] ?? 0, value);
    assert.deepEqual(cameraCounts, manifest.realized.cameraMovementCounts);
    return { hash: hash.digest("hex"), manifest };
  } finally {
    await reader.close();
  }
}

test("quantized noisy dataset is clean at source and training resolution and remains repeatable", async (context) => {
  const simulationCount = Number(process.env.LENSCRAFT_DATASET_TEST_SAMPLE_COUNT ?? 64);
  assert.ok(Number.isSafeInteger(simulationCount) && simulationCount >= 64);
  const config = { simulationCount, seed: "training-quality-noisy-regression",
    minFrameCount: 100, maxFrameCount: 500,
    noiseConfig: { applyNoise: true, positionAmplitude: 0.1, rotationAmplitude: 0.02, frequency: 0.5 } };
  const first = await inspectArchive(config);
  const second = await inspectArchive(config);
  assert.equal(first.hash, second.hash, "same seed must reproduce sample contents");
  assert.deepEqual(first.manifest.realized, second.manifest.realized);
  if (simulationCount >= 1000) {
    assert.equal(Object.keys(first.manifest.realized.cameraMovementCounts).length, 17,
      "quality rejection must retain coverage of all supported camera movements");
    context.diagnostic(JSON.stringify({ simulationCount,
      cameraMovementCounts: first.manifest.realized.cameraMovementCounts,
      rejectedCameraCandidates: first.manifest.realized.rejectedCameraCandidates,
      sampleSha256: first.hash }));
  }
});

for (const frameCount of [100, 500]) {
  test(`export quality holds at ${frameCount} source frames`, async () => {
    await inspectArchive({ simulationCount: 32, seed: `training-quality-${frameCount}`,
      minFrameCount: frameCount, maxFrameCount: frameCount });
  });
}
