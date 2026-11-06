require('./register-typescript.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Euler, Quaternion, Vector3 } = require('three');
const { unpack } = require('msgpackr');
const { BlobReader, Uint8ArrayWriter, ZipReader } = require('@zip.js/zip.js');
const {
  normalizeETTrainingProfile, sampleETClipControls, prepareETSubjectFrames,
  generateETCameraCandidate, measureETGeneratedClip,
} = require('../src/service/dataset/etTrainingProfile.ts');
const { buildRandomDatasetArchive, normalizeDatasetConfig } = require('../src/service/dataset/generate.ts');
const { createSeededRandom } = require('../src/utils/randomUtils.ts');
const { ObjectClass } = require('../src/service/subjects/types.ts');
const { CameraMovementType } = require('../src/service/simulation/instruction/types.ts');
const { reconstructFromReference } = require('../src/service/dataset/parameterDictionary.ts');

const calibration = JSON.parse(fs.readFileSync(path.resolve(__dirname,
  '../src/service/dataset/profiles/et_training_20261004_model30.json'), 'utf8'));
const profile = () => normalizeETTrainingProfile({ calibration: structuredClone(calibration) });
const close = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) <= tolerance,
  `${actual} differs from ${expected} by more than ${tolerance}`);
const subject = {
  id: 'human-0', class: ObjectClass.Human,
  dimensions: { width: .5, height: 1.7, depth: .3 },
};
const bodyFrames = (count) => Array.from({ length: count }, (_, index) => ({
  position: new Vector3(2 + index / (count - 1), 0.85, -4),
  // A sideways body deliberately does not face the direction of its path.
  rotation: new Euler(0, Math.PI / 2, 0, 'XYZ'),
}));
const controls = () => ({
  regime: 'moving', frameCount: 90, nativeFrameCount: 90, durationSeconds: 89 / 25,
  subjectExcursionRatio: .3, subjectXZExcursionRatio: .25, subjectNetXZRatio: .2, subjectPathRatio: .75,
  pauseFraction: .25, cameraExcursionRatio: .15, cameraPathRatio: .3,
  cameraAngularPathDeg: 30, cameraAngularExcursionDeg: 10,
  initialRayXOverZ: .2, initialRayYOverZ: .3, initialCameraIdentityAngleDeg: 0,
  translationDirection: 'right', horizontalFovDegrees: 50, plausibilityAdjustments: [],
});

test('calibration rejects evaluation fitting, corrupt weights and invalid source FPS', () => {
  assert.equal(calibration.source.modelFrameCount, 30);
  assert.equal(calibration.source.metricTimeline, 'ET_adapter_linear_positions_SLERP_camera30');
  assert.equal(calibration.source.geometryTimeline, 'model30');
  const ambiguousTimeline = structuredClone(calibration);
  delete ambiguousTimeline.source.metricTimeline;
  assert.throws(() => normalizeETTrainingProfile({ calibration: ambiguousTimeline }), /common model30 timeline/);
  const wrongTimeline = structuredClone(calibration);
  wrongTimeline.source.geometryTimeline = 'native';
  assert.throws(() => normalizeETTrainingProfile({ calibration: wrongTimeline }), /common model30 timeline/);
  const testSplit = structuredClone(calibration);
  testSplit.source.split = 'test';
  assert.throws(() => normalizeETTrainingProfile({ calibration: testSplit }), /training split/);
  const badFps = structuredClone(calibration);
  badFps.source.sourceFps = 0;
  assert.throws(() => normalizeETTrainingProfile({ calibration: badFps }), /FPS/);
  const badWeight = structuredClone(calibration);
  badWeight.regimes[0].weight += .1;
  assert.throws(() => normalizeETTrainingProfile({ calibration: badWeight }), /regime/);
});

test('sampling is deterministic, excludes extreme tails and floors only profile short clips', () => {
  const first = createSeededRandom('et-test-seed');
  const second = createSeededRandom('et-test-seed');
  const activeProfile = profile();
  const movingQuantiles = calibration.regimes.find((regime) => regime.key === 'moving').quantiles;
  const lowerIndex = calibration.quantileProbabilities.indexOf(.05);
  const upperIndex = calibration.quantileProbabilities.indexOf(.95);
  for (let sample = 0; sample < 100; sample++) {
    const actual = sampleETClipControls(activeProfile, 'moving', first);
    assert.deepEqual(actual, sampleETClipControls(activeProfile, 'moving', second));
    assert.ok(actual.frameCount >= 30 && actual.frameCount <= 500);
    assert.ok(actual.initialRayXOverZ >= movingQuantiles.initialRayXOverZ[lowerIndex] &&
      actual.initialRayXOverZ <= movingQuantiles.initialRayXOverZ[upperIndex]);
    assert.ok(actual.cameraAngularPathDeg >= actual.cameraAngularExcursionDeg);
    assert.ok(actual.subjectExcursionRatio >= actual.subjectXZExcursionRatio);
    assert.ok(actual.subjectXZExcursionRatio >= actual.subjectNetXZRatio);
  }
  assert.throws(() => normalizeDatasetConfig({ simulationCount: 1, minFrameCount: 30, maxFrameCount: 90 }), /100-500/);
  const config = normalizeDatasetConfig({ simulationCount: 1, etTrainingProfile: { calibration } });
  assert.equal(config.framesPerSecond, 25);
  assert.equal(config.subjectClassProbabilities[ObjectClass.Human], 1);
  assert.ok(config.minFrameCount >= 30 && config.minFrameCount < 100);
});

test('subject preparation centers the scene, preserves authored front, fits XYZ/XZ and pauses', () => {
  const activeProfile = profile();
  const wanted = controls();
  const input = bodyFrames(wanted.frameCount);
  const prepared = prepareETSubjectFrames(activeProfile, wanted, input);
  assert.deepEqual(prepared[0].position.toArray(), [0, 0, 0]);
  assert.deepEqual(input[0].position.toArray(), [2, .85, -4]);
  for (const frame of prepared) assert.deepEqual(frame.rotation.toArray(), [0, Math.PI / 2, 0, 'XYZ']);
  const indices = Array.from({ length: 30 }, (_, index) => Math.round(index * 89 / 29));
  close(Math.max(...indices.map((index) => Math.hypot(prepared[index].position.x, prepared[index].position.z))), 1, 1e-6);
  close(Math.max(...indices.map((index) => prepared[index].position.length())), 1.2, 1e-6);
  close(Math.hypot(prepared.at(-1).position.x, prepared.at(-1).position.z), .8, 1e-7);
  const cumulativePath = indices.slice(1).reduce((sum, index, step) => sum +
    prepared[index].position.distanceTo(prepared[indices[step]].position), 0);
  close(cumulativePath, 3, .005);
  assert.ok(prepared.some((frame, index) => index > 0 && frame.position.equals(prepared[index - 1].position)));
  const frozen = prepareETSubjectFrames(activeProfile, { ...wanted, regime: 'exact_static', subjectExcursionRatio: 0 }, input);
  for (const frame of frozen) {
    assert.deepEqual(frame.position.toArray(), [0, 0, 0]);
    close(frame.rotation.y, Math.PI / 2);
  }
});

test('shared TRAIN quantile ranks preserve ordered marginals without raising XYZ or path values', () => {
  const activeProfile = profile();
  const summary = calibration.regimes.find((regime) => regime.key === 'moving');
  const rows = Array.from({ length: 1001 }, (_, index) =>
    sampleETClipControls(activeProfile, 'moving', () => index / 1000));
  const mappings = {
    subjectXZExcursionRatio: 'subjectXZExcursionOverMedianRange',
    subjectNetXZRatio: 'subjectNetXZOverMedianRange',
    subjectExcursionRatio: 'subjectXYZExcursionOverMedianRange',
    subjectPathRatio: 'subjectPath30OverMedianRange',
    cameraExcursionRatio: 'cameraExcursionOverMedianRange',
    cameraPathRatio: 'cameraPath30OverMedianRange',
    cameraAngularExcursionDeg: 'cameraAngularExcursionDeg',
    cameraAngularPathDeg: 'cameraAngularPath30Deg',
  };
  const medianIndex = calibration.quantileProbabilities.indexOf(.5);
  const lowerIndex = calibration.quantileProbabilities.indexOf(.05);
  const upperIndex = calibration.quantileProbabilities.indexOf(.95);
  for (const [field, key] of Object.entries(mappings)) {
    close(rows[500][field], summary.quantiles[key][medianIndex]);
    close(rows[0][field], summary.quantiles[key][lowerIndex]);
    close(rows[1000][field], summary.quantiles[key][upperIndex]);
  }
  for (const row of rows) {
    assert.ok(row.subjectPathRatio >= row.subjectExcursionRatio);
    assert.ok(row.subjectExcursionRatio >= row.subjectXZExcursionRatio);
    assert.ok(row.subjectXZExcursionRatio >= row.subjectNetXZRatio);
    assert.ok(row.cameraPathRatio >= row.cameraExcursionRatio);
    assert.ok(row.cameraAngularPathDeg >= row.cameraAngularExcursionDeg);
    assert.ok(!row.plausibilityAdjustments.some((reason) => /raised/.test(reason)));
  }
});

test('endpoint-constrained path keeps excursion/net and reports scalar path infeasibility', () => {
  const activeProfile = profile();
  const wanted = { ...controls(), subjectPathRatio: .3 };
  const prepared = prepareETSubjectFrames(activeProfile, wanted, bodyFrames(wanted.frameCount));
  const indices = Array.from({ length: 30 }, (_, index) => Math.round(index * 89 / 29));
  close(Math.max(...indices.map((index) => Math.hypot(prepared[index].position.x, prepared[index].position.z))), 1);
  close(Math.hypot(prepared.at(-1).position.x, prepared.at(-1).position.z), .8);
  assert.ok(wanted.plausibilityAdjustments.includes('subject-path-raised-to-scalar-endpoint-minimum'));
  const optionalNet = { ...controls() };
  delete optionalNet.subjectNetXZRatio;
  const defaultEndpoint = prepareETSubjectFrames(activeProfile, optionalNet, bodyFrames(optionalNet.frameCount));
  close(Math.hypot(defaultEndpoint.at(-1).position.x, defaultEndpoint.at(-1).position.z), 1);
  const exactMinimum = { ...controls(), subjectExcursionRatio: .25, subjectPathRatio: .3,
    pauseFraction: 1, plausibilityAdjustments: [] };
  prepareETSubjectFrames(activeProfile, exactMinimum, bodyFrames(exactMinimum.frameCount));
  assert.ok(exactMinimum.plausibilityAdjustments.includes('subject-pause-reduced-for-endpoint-capacity'));
});

test('coupled TRAIN lens quantiles produce both H/V FOVs through effective optical aspect', () => {
  const activeProfile = normalizeETTrainingProfile({ calibration, useCenteredPrincipalPointFovProxy: true });
  const wanted = sampleETClipControls(activeProfile, 'moving', () => .5);
  const summary = calibration.regimes.find((regime) => regime.key === 'moving');
  const medianIndex = calibration.quantileProbabilities.indexOf(.5);
  close(wanted.horizontalFovDegrees, summary.quantiles.horizontalFovCenteredPrincipalPointDeg[medianIndex]);
  close(wanted.verticalFovDegrees, summary.quantiles.verticalFovCenteredPrincipalPointDeg[medianIndex]);
  for (const aspect of [wanted.effectiveOpticalAspectRatio, .8]) {
    const horizontal = wanted.horizontalFovDegrees;
    const vertical = 2 * Math.atan(Math.tan(horizontal * Math.PI / 360) / aspect) * 180 / Math.PI;
    const output = generateETCameraCandidate(activeProfile, {
      ...controls(), horizontalFovDegrees: horizontal, verticalFovDegrees: vertical, effectiveOpticalAspectRatio: aspect,
    }, { subject, frames: bodyFrames(90) }, createSeededRandom('lens-projection'));
    const measured = measureETGeneratedClip(output.cameraFrames, bodyFrames(90));
    close(measured.horizontalFovCenteredPrincipalPointDeg, horizontal);
    close(measured.verticalFovCenteredPrincipalPointDeg, vertical);
    close(output.cameraFrames[0].aspectRatio, aspect);
  }
  const fixed = profile();
  const fixedControls = sampleETClipControls(fixed, 'moving', () => .5);
  close(fixedControls.horizontalFovDegrees, 50);
  close(fixedControls.effectiveOpticalAspectRatio, 16 / 9);
  const invalidLens = structuredClone(calibration);
  invalidLens.quantiles.verticalFovCenteredPrincipalPointDeg[0] = 0;
  assert.throws(() => normalizeETTrainingProfile({ calibration: invalidLens, useCenteredPrincipalPointFovProxy: true }), /FOV quantiles/);
});

test('camera fit separates angular/path excursion and translates along the current camera axis', () => {
  const activeProfile = profile();
  const wanted = controls();
  const frames = prepareETSubjectFrames(activeProfile, wanted, bodyFrames(wanted.frameCount));
  const output = generateETCameraCandidate(activeProfile, wanted, { subject, frames }, createSeededRandom('camera-shape'));
  const measured = measureETGeneratedClip(output.cameraFrames, frames);
  close(measured.initialRayXOverZ, .2);
  close(measured.initialRayYOverZ, .3);
  close(measured.cameraAngularExcursionDeg, 10, 1e-5);
  close(measured.cameraAngularPath30Deg, 30, .001);
  close(measured.cameraPath30OverMedianRange / measured.cameraExcursionOverMedianRange, 2, .001);
  assert.match(output.prompt.observedMotionText, /reverses direction/);
  assert.match(output.prompt.observedMotionText, /reverses its rotation/);
  for (let index = 1; index < output.cameraFrames.length; index++) {
    const previous = output.cameraFrames[index - 1];
    const current = output.cameraFrames[index];
    const midRotation = new Quaternion().setFromEuler(previous.rotation).slerp(
      new Quaternion().setFromEuler(current.rotation), .5);
    const localDelta = current.position.clone().sub(previous.position).applyQuaternion(midRotation.invert());
    close(localDelta.y, 0, 1e-10);
    close(localDelta.z, 0, 1e-10);
  }
});

test('position-static rotating camera is not labelled as a completely static camera', () => {
  const activeProfile = profile();
  const wanted = { ...controls(), translationDirection: 'static' };
  const frames = bodyFrames(wanted.frameCount);
  const rotating = generateETCameraCandidate(activeProfile, wanted, { subject, frames }, createSeededRandom('position-static'));
  assert.notEqual(rotating.prompt.movement.type, CameraMovementType.Static);
  assert.match(rotating.prompt.observedMotionText, /same position/);
  const frozen = generateETCameraCandidate(activeProfile, {
    ...wanted, cameraAngularPathDeg: 0, cameraAngularExcursionDeg: 0,
  }, { subject, frames }, createSeededRandom('position-static'));
  assert.equal(frozen.prompt.movement.type, CameraMovementType.Static);
  for (const frame of frozen.cameraFrames) {
    assert.deepEqual(frame.position.toArray(), frozen.cameraFrames[0].position.toArray());
    assert.deepEqual(frame.rotation.toArray(), frozen.cameraFrames[0].rotation.toArray());
  }
});

async function decodeArchive(result) {
  const zip = new ZipReader(new BlobReader(result.data));
  const entries = await zip.getEntries();
  const clips = [];
  let dictionary;
  let manifest;
  for (const entry of entries) {
    if (entry.directory) continue;
    const data = await entry.getData(new Uint8ArrayWriter());
    if (entry.filename.endsWith('manifest.json')) manifest = JSON.parse(Buffer.from(data).toString());
    else if (entry.filename.endsWith('parameter_dictionary.msgpack')) dictionary = unpack(data);
    else if (entry.filename.endsWith('.msgpack')) clips.push({ bytes: Buffer.from(data), data: unpack(data) });
  }
  await zip.close();
  return { manifest, dictionary, clips };
}

test('ET exports stay four-section compatible, deterministic and explicit about unavailable information', async () => {
  const settings = { simulationCount: 24, seed: 'et-archive-test', etTrainingProfile: { calibration } };
  const first = await decodeArchive(await buildRandomDatasetArchive(settings));
  const second = await decodeArchive(await buildRandomDatasetArchive(settings));
  assert.equal(first.manifest.modelObservation.captionPolicy, 'motion_only');
  assert.equal(first.manifest.modelObservation.subjectOrientation, 'unavailable');
  assert.deepEqual(first.manifest.modelObservation.defaultSubjectDimensions, [.5, 1.7, .3]);
  assert.equal(first.manifest.config.framesPerSecond, 25);
  assert.deepEqual(first.manifest.realized, second.manifest.realized);
  for (let index = 0; index < first.clips.length; index++) {
    assert.deepEqual(first.clips[index].bytes, second.clips[index].bytes);
    const data = first.clips[index].data;
    assert.equal(data.length, 4);
    assert.deepEqual(data[2][0].f[0].slice(0, 3), [0, 0, 0]);
    const caption = reconstructFromReference(data[0], first.dictionary);
    assert.equal(typeof caption.cinematography.observedMotionText, 'string');
    assert.equal(caption.cinematography.initial, undefined);
    assert.equal(caption.cinematography.final, undefined);
  }
});

test('ordinary export geometry and dictionary remain identical when the optional profile is absent', async () => {
  const settings = {
    simulationCount: 4, seed: 'legacy-export-parity', minFrameCount: 100, maxFrameCount: 100,
    movementDistribution: { static: 1 },
    subjectClassProbabilities: Object.fromEntries(Object.values(ObjectClass).map((key) => [key, key === ObjectClass.Human ? 1 : 0])),
  };
  const first = await decodeArchive(await buildRandomDatasetArchive(settings));
  const second = await decodeArchive(await buildRandomDatasetArchive({ ...settings, etTrainingProfile: undefined }));
  assert.equal(first.manifest.modelObservation, undefined);
  assert.equal(first.manifest.etTrainingProfile, undefined);
  assert.deepEqual(first.dictionary.keys, second.dictionary.keys);
  assert.deepEqual(first.dictionary.values, second.dictionary.values);
  assert.ok(!first.dictionary.keys.some((key) => key.endsWith('observedMotionText')));
  for (let index = 0; index < first.clips.length; index++) assert.deepEqual(first.clips[index].bytes, second.clips[index].bytes);
});

test('actual calibrated 1024-clip seed completes with quality-gated control resampling', async () => {
  const archive = await decodeArchive(await buildRandomDatasetArchive({
    simulationCount: 1024, seed: 'et-matched-v1', etTrainingProfile: { calibration },
  }));
  assert.equal(archive.clips.length, 1024);
  const compatibility = archive.manifest.realized.etCompatibility;
  assert.ok((compatibility.resampledControlSetsByRegime.moving ?? 0) >= 0);
  assert.equal(typeof compatibility.rejectedControlSetsIntendedQuantiles, 'object');
  assert.equal(archive.manifest.realized.subjectClassCounts[ObjectClass.Human], 1024);
  assert.equal(archive.manifest.quality.cameraClearanceSceneUnits, .02);
});

test('infeasible geometry exhausts bounded retries with a collision cause, without weakening quality', async () => {
  await assert.rejects(buildRandomDatasetArchive({
    simulationCount: 1, seed: 'et-infeasible-scale',
    etTrainingProfile: { calibration, cameraSubjectDistanceSceneUnits: .05 },
  }), (error) => {
    assert.match(error.message, /after 50 attempts/);
    assert.match(error.message, /camera-subject-collision/);
    assert.equal(error.cause.reason, 'camera-subject-collision');
    return true;
  });
});
