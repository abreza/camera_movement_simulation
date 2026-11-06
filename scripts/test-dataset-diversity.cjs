require('./register-typescript.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { Euler, Quaternion, Vector3 } = require('three');
const { unpack } = require('msgpackr');
const { BlobReader, Uint8ArrayWriter, ZipReader } = require('@zip.js/zip.js');
const { buildRandomDatasetArchive, normalizeDatasetConfig } = require('../src/service/dataset/generate.ts');
const { DATASET_CAMERA_MOVEMENT_TYPES } = require('../src/service/dataset/diversity.ts');
const { validateDatasetTrajectory } = require('../src/service/dataset/quality.ts');
const { reconstructFromReference } = require('../src/service/dataset/parameterDictionary.ts');
const { deriveCinematographySetupFromPose } = require('../src/service/dataset/finalSetup.ts');
const { windowDatasetSubjectFrames } = require('../src/service/dataset/subjectProgress.ts');
const { HUMAN_DIMENSION_BOUNDS } = require('../src/service/subjects/constants.ts');
const { HUMAN_MOVEMENT_TYPES } = require('../src/service/subjects/movements/human.ts');

function assertQuotaPreservation(diversity) {
  for (const key of ['sampleCount', 'cameraMovementCounts', 'sceneScaleStratumCounts']) {
    assert.deepEqual(diversity.realized[key], diversity.planned[key], key);
  }
  const quantizedAspects = {};
  for (const [value, count] of Object.entries(diversity.planned.aspectRatioCounts)) {
    const stored = String(Math.round(Number(value) * 1000) / 1000);
    quantizedAspects[stored] = (quantizedAspects[stored] ?? 0) + count;
  }
  assert.deepEqual(diversity.realized.aspectRatioCounts, quantizedAspects);
}

async function decode(result) {
  const reader = new ZipReader(new BlobReader(result.data));
  const clips = [];
  let manifest, dictionary;
  try {
    for (const entry of await reader.getEntries()) {
      if (entry.directory) continue;
      const bytes = Buffer.from(await entry.getData(new Uint8ArrayWriter()));
      if (entry.filename.endsWith('/manifest.json')) manifest = JSON.parse(bytes);
      else if (entry.filename.endsWith('/parameter_dictionary.msgpack')) dictionary = unpack(bytes);
      else if (entry.filename.endsWith('.msgpack')) clips.push({ bytes, data: unpack(bytes) });
    }
  } finally { await reader.close(); }
  return { manifest, dictionary, clips };
}

function geometry(data) {
  const packed = data[2][0];
  const subject = {
    subject: { id: packed.i, class: packed.c,
      dimensions: Object.fromEntries(['width', 'height', 'depth'].map((key, i) => [key, packed.d[i] / 1000])) },
    frames: packed.f.map((row) => ({ position: new Vector3(...row.slice(0, 3).map((v) => v / 1000)),
      rotation: new Euler(...row.slice(3, 6).map((v) => v / 1000), 'XYZ') })),
    movementType: packed.m,
  };
  const cameras = data[3].map((row) => ({ position: new Vector3(...row.slice(0, 3).map((v) => v / 1000)),
    rotation: new Euler(...row.slice(3, 6).map((v) => v / 1000), 'XYZ'),
    focalLength: row[6] / 1000, aspectRatio: row[7] / 1000 }));
  return { subject, cameras };
}

let pilot;
const getPilot = () => pilot ??= buildRandomDatasetArchive({
  simulationCount: 170, seed: 'unified-diversity-contract-v1', minFrameCount: 100, maxFrameCount: 140,
}).then(decode);

test('normal generation enables diversity; legacy remains explicit and invalid profiles fail early', () => {
  assert.equal(normalizeDatasetConfig({ simulationCount: 1 }).diversity.sceneScale.baseFraction, .5);
  assert.equal(normalizeDatasetConfig({ simulationCount: 1, diversity: false }).diversity, false);
  for (const diversity of [true, null, [], { typo: 1 }, { sceneScale: { min: 0 } },
    { sceneScale: { baseFraction: 1.1 } }, { focalLength: { min: 90, max: 20 } },
    { aspectRatios: [] }, { aspectRatios: [1, 1] }, { aspectRatios: [Infinity] }]) {
    assert.throws(() => normalizeDatasetConfig({ simulationCount: 1, diversity }));
  }
});

test('real standard archive preserves all intended quotas across quality rejection', async () => {
  const { manifest, clips } = await getPilot();
  assert.equal(clips.length, 170);
  assert.equal(manifest.generationProfile, 'rule-based-diversity-v1');
  assertQuotaPreservation(manifest.diversity);
  assert.equal(manifest.diversity.sampleReceipts.length, clips.length);
  const counts = manifest.realized.cameraMovementCounts;
  assert.deepEqual(Object.keys(counts).sort(), [...DATASET_CAMERA_MOVEMENT_TYPES].sort());
  for (const movement of DATASET_CAMERA_MOVEMENT_TYPES) assert.equal(counts[movement], 10, movement);
  assert.deepEqual(manifest.diversity.realized.sceneScaleStratumCounts, { base: 85, smaller: 43, larger: 42 });
  assert.equal(manifest.realized.movementCounts.static, 85);
  assert.ok(Object.keys(manifest.realized.subjectClassCounts).length >= 8);
});

test('serialized dimensions, optics, endpoints and geometry agree with the generation receipt', async () => {
  const { clips, manifest, dictionary } = await getPilot();
  let belowBase = false, aboveBase = false, smallHuman = false, largeHuman = false;
  for (const [index, { data }] of clips.entries()) {
    const receipt = manifest.diversity.sampleReceipts[index];
    const { subject, cameras } = geometry(data);
    assert.equal(data.length, 4);
    assert.equal(receipt.sampleIndex, index);
    assert.equal(cameras.length, receipt.frameCount);
    assert.equal(subject.frames.length, cameras.length);
    assert.ok(receipt.subjectPathFraction > 0 && receipt.subjectPathFraction <= 1);
    assert.ok(receipt.subjectPathStart >= 0 && receipt.subjectPathStart + receipt.subjectPathFraction <= 1 + 1e-12);
    assert.equal(cameras[0].focalLength, Math.round(receipt.focalLength * 1000) / 1000);
    assert.equal(cameras[0].aspectRatio, Math.round(receipt.aspectRatio * 1000) / 1000);
    for (const key of ['width', 'height', 'depth']) {
      const expected = Math.round(receipt.baseSubjectDimensions[key] * receipt.sceneScale * 1000) / 1000;
      assert.ok(Math.abs(subject.subject.dimensions[key] - expected) < 1e-12);
    }
    for (const camera of cameras) {
      assert.equal(camera.focalLength, cameras[0].focalLength);
      assert.equal(camera.aspectRatio, cameras[0].aspectRatio);
    }
    assert.doesNotThrow(() => validateDatasetTrajectory(cameras, subject, receipt.sceneScale));
    const prompt = reconstructFromReference(data[0], dictionary).cinematography;
    const instruction = reconstructFromReference(data[1], dictionary).simulation;
    for (const setup of [instruction.setup.config, instruction.dynamic.complementSetup].filter(Boolean)) {
      assert.equal(setup.focalLength, cameras[0].focalLength);
      assert.equal(setup.aspectRatio, cameras[0].aspectRatio);
    }
    assert.equal(prompt.movement.type, receipt.cameraMovement);
    assert.deepEqual(prompt.initial, deriveCinematographySetupFromPose(cameras[0], subject.subject, subject.frames[0]));
    if (['follow', 'track'].includes(prompt.movement.type)) {
      assert.ok(!['static', 'idle', 'turnInPlace'].includes(subject.movementType));
    }
    belowBase ||= receipt.sceneScale < .4;
    aboveBase ||= receipt.sceneScale > 2;
    if (subject.subject.class === 'human') {
      smallHuman ||= subject.subject.dimensions.height < HUMAN_DIMENSION_BOUNDS.height.min;
      largeHuman ||= subject.subject.dimensions.height > HUMAN_DIMENSION_BOUNDS.height.max;
    }
  }
  assert.ok(belowBase && aboveBase, 'actual exports must cover smaller and larger physical scenes');
  assert.ok(smallHuman && largeHuman, 'whole-scene scaling must not silently clamp human proxies back to base size bounds');
});

test('named human motions retain complete timelines including the stop and restart event', async () => {
  const { clips, manifest } = await getPilot();
  const observed = new Set();
  for (const [index, { data }] of clips.entries()) {
    const { subject } = geometry(data);
    if (!HUMAN_MOVEMENT_TYPES.includes(subject.movementType)) continue;
    observed.add(subject.movementType);
    const receipt = manifest.diversity.sampleReceipts[index];
    assert.equal(receipt.subjectPathFraction, 1, subject.movementType);
    assert.equal(receipt.subjectPathStart, 0, subject.movementType);
    if (subject.movementType === 'stopStart') {
      const steps = subject.frames.slice(1).map((frame, frameIndex) =>
        frame.position.distanceTo(subject.frames[frameIndex].position));
      const pause = steps.findIndex((step, stepIndex) => step === 0 &&
        steps[stepIndex + 1] === 0 && steps[stepIndex + 2] === 0);
      assert.ok(pause > 0, 'stored stopStart must include a stationary interval');
      assert.ok(steps.slice(0, pause).some((step) => step > .001), 'movement before the stop');
      assert.ok(steps.slice(pause + 3).some((step) => step > .001), 'movement resumes after the stop');
    }
  }
  assert.deepEqual([...observed].sort(), [...HUMAN_MOVEMENT_TYPES].sort());
});

test('same seed survives different cooperative chunk sizes without changing exported samples', async () => {
  const settings = { simulationCount: 24, seed: 'diversity-repeatability-v1', minFrameCount: 100, maxFrameCount: 110 };
  const first = await decode(await buildRandomDatasetArchive({ ...settings, chunkSize: 7 }));
  const second = await decode(await buildRandomDatasetArchive({ ...settings, chunkSize: 101 }));
  assert.deepEqual(first.manifest.diversity, second.manifest.diversity);
  assert.deepEqual(first.dictionary.keys, second.dictionary.keys);
  assert.deepEqual(first.dictionary.values, second.dictionary.values);
  for (const [index, clip] of first.clips.entries()) assert.deepEqual(clip.bytes, second.clips[index].bytes);
});

test('static-only subject distribution excludes tracking without dropping camera or scene quotas', async () => {
  const { manifest, clips } = await decode(await buildRandomDatasetArchive({
    simulationCount: 30, seed: 'diversity-static-only-v1', movementDistribution: { static: 1 },
    minFrameCount: 100, maxFrameCount: 100,
  }));
  assert.equal(clips.length, 30);
  assertQuotaPreservation(manifest.diversity);
  assert.equal(manifest.realized.cameraMovementCounts.follow ?? 0, 0);
  assert.equal(manifest.realized.cameraMovementCounts.track ?? 0, 0);
  assert.equal(Object.values(manifest.realized.cameraMovementCounts).reduce((a, b) => a + b, 0), 30);
});

function fixture(scale, step = 2) {
  const subject = { subject: { id: 'test', class: 'human', dimensions: { width: scale, height: scale, depth: scale } },
    frames: Array.from({ length: 30 }, () => ({ position: new Vector3(), rotation: new Euler(0, 0, 0, 'XYZ') })) };
  const cameras = Array.from({ length: 30 }, (_, index) => ({ position: new Vector3(index * step * scale, 0, 10 * scale),
    rotation: new Euler(0, 0, 0, 'XYZ'), focalLength: 35, aspectRatio: 16 / 9 }));
  return { subject, cameras };
}

test('linear quality uses declared scene units while angular spikes still fail at every scale', () => {
  for (const scale of [.05, 1, 20]) {
    const { subject, cameras } = fixture(scale);
    const measured = validateDatasetTrajectory(cameras, subject, scale);
    assert.ok(Math.abs(measured.maxTrainingTranslation - 2 * scale) < 1e-10);
    cameras[15].rotation.y = Math.PI / 2;
    assert.throws(() => validateDatasetTrajectory(cameras, subject, scale), /rotation/);
    const fast = fixture(scale, 4);
    assert.throws(() => validateDatasetTrajectory(fast.cameras, fast.subject, scale), /translation/);
  }
  const large = fixture(20);
  assert.throws(() => validateDatasetTrajectory(large.cameras, large.subject), /translation/);
  for (const value of [0, -1, NaN, Infinity]) {
    const { subject, cameras } = fixture(1);
    assert.throws(() => validateDatasetTrajectory(cameras, subject, value), /sceneScale/);
  }
});

test('scaled clearance still detects a camera inside the actual oriented subject volume', () => {
  for (const scale of [.05, 1, 20]) {
    const { subject, cameras } = fixture(scale);
    cameras[0].position.set(0, 0, 0);
    assert.throws(() => validateDatasetTrajectory(cameras, subject, scale), /collision/);
  }
});

test('subject windows preserve source extent, frame count and shortest-arc body orientation', () => {
  const radians = (degrees) => degrees * Math.PI / 180;
  const frames = [170, -170].map((angle, index) => ({
    position: new Vector3(index, 2, 3), rotation: new Euler(0, radians(angle), 0, 'XYZ'),
  }));
  const original = frames.map((frame) => [frame.position.toArray(), frame.rotation.toArray()]);
  const window = windowDatasetSubjectFrames(frames, .25, .5);
  assert.equal(window.length, frames.length);
  assert.deepEqual(window.map((frame) => frame.position.toArray()), [[.25, 2, 3], [.75, 2, 3]]);
  for (const [index, degrees] of [175, -175].entries()) {
    const expected = new Quaternion().setFromEuler(new Euler(0, radians(degrees), 0, 'XYZ'));
    assert.ok(new Quaternion().setFromEuler(window[index].rotation).angleTo(expected) < 1e-7);
  }
  assert.deepEqual(frames.map((frame) => [frame.position.toArray(), frame.rotation.toArray()]), original);
  const full = windowDatasetSubjectFrames(frames, 0, 1);
  assert.deepEqual(full.map((frame) => [frame.position.toArray(), frame.rotation.toArray()]), original);
  assert.notEqual(full[0].position, frames[0].position);
  for (const [start, fraction] of [[-.1, .5], [0, 0], [0, 1.1], [.8, .3], [NaN, .5]]) {
    assert.throws(() => windowDatasetSubjectFrames(frames, start, fraction), /window/);
  }
});
