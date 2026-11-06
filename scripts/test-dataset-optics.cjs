require('./register-typescript.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { Vector3, Euler } = require('three');
const {
  CameraMovementType, CameraVerticalAngle, ShotSize, SubjectView,
  SubjectInFramePosition, DynamicMode, MovementEasing, MovementMode, Direction, Scale,
} = require('../src/service/simulation/instruction/types.ts');
const { DEFAULT_FOCAL_LENGTH, DEFAULT_ASPECT_RATIO } = require('../src/service/simulation/constants.ts');
const { getCameraBySetup } = require('../src/service/simulation/rule-based/setup/index.ts');
const { calculateRegionOfInterest } = require('../src/service/simulation/rule-based/setup/roi.ts');
const { initCameraParameters } = require('../src/service/simulation/rule-based/index.ts');
const { projectBoundingBox, projectPoint, getCameraFieldOfView, makeThreeJsCamera } = require('../src/service/simulation/utils.ts');
const { generateRandomCinematographyPrompt } = require('../src/service/simulation/instruction/high-level/generator.ts');
const { normalizeCinematographyPrompt } = require('../src/service/simulation/instruction/high-level/rules.ts');
const { translatePromptToSimulationInstruction } = require('../src/service/simulation/instruction/high-level/translator/index.ts');
const { withRandomSource, createSeededRandom } = require('../src/utils/randomUtils.ts');

const close = (actual, expected, tolerance = 1e-6) => assert.ok(
  Math.abs(actual - expected) <= tolerance,
  `${actual} differs from ${expected} by more than ${tolerance}`
);
const subject = (scale = 1) => ({
  id: 'optics-subject', dimensions: { width: .5 * scale, height: 1.7 * scale, depth: .3 * scale },
});
const subjectFrame = (scale = 1) => ({
  position: new Vector3(0, 10 * scale, 0), rotation: new Euler(),
});
const setup = (optics = {}) => ({
  cameraAngle: CameraVerticalAngle.Eye, shotSize: ShotSize.FullShot,
  subjectView: SubjectView.Front, subjectFraming: { position: SubjectInFramePosition.Center },
  ...optics,
});
const cameraData = (camera) => ({
  position: camera.position.toArray(), rotation: camera.rotation.toArray(),
  focalLength: camera.focalLength, aspectRatio: camera.aspectRatio,
});
function boundsForSetup(config, body = subject(), frame = subjectFrame()) {
  const camera = getCameraBySetup(config, body, frame);
  const { regionOfInterest: roi } = calculateRegionOfInterest(config.shotSize, body, frame);
  return { camera, roi, bounds: projectBoundingBox(roi.dimensions, roi.position, camera, roi.rotation) };
}

test('omitted optics equal explicit defaults and each optional field defaults independently', () => {
  const defaultCamera = cameraData(getCameraBySetup(setup(), subject(), subjectFrame()));
  assert.deepEqual(cameraData(getCameraBySetup(setup({
    focalLength: DEFAULT_FOCAL_LENGTH, aspectRatio: DEFAULT_ASPECT_RATIO,
  }), subject(), subjectFrame())), defaultCamera);
  assert.deepEqual(cameraData(getCameraBySetup(setup({
    focalLength: DEFAULT_FOCAL_LENGTH,
  }), subject(), subjectFrame())), defaultCamera);
  assert.deepEqual(cameraData(getCameraBySetup(setup({
    aspectRatio: DEFAULT_ASPECT_RATIO,
  }), subject(), subjectFrame())), defaultCamera);
});

test('actual focal length and optical aspect determine distance, projection and FOV', () => {
  for (const aspectRatio of [.55, 16 / 9, 2.4]) {
    const wide = boundsForSetup(setup({ focalLength: 18, aspectRatio }));
    const tele = boundsForSetup(setup({ focalLength: 85, aspectRatio }));
    for (const { camera, roi, bounds } of [wide, tele]) {
      close(Math.max(bounds.width, bounds.height), 1, 1e-3);
      close(bounds.center.x, 0);
      close(bounds.center.y, 0);
      assert.equal(bounds.allInFront, true);
      const renderedCamera = makeThreeJsCamera(camera);
      const fov = getCameraFieldOfView(camera);
      close(fov.horizontal, 2 * Math.atan(1 / renderedCamera.projectionMatrix.elements[0]));
      close(fov.vertical, 2 * Math.atan(1 / renderedCamera.projectionMatrix.elements[5]));
      assert.ok(camera.position.distanceTo(roi.position) > 0);
    }
    assert.ok(tele.camera.position.distanceTo(tele.roi.position) >
      3 * wide.camera.position.distanceTo(wide.roi.position));
  }
});

test('off-center framing uses each lens projection rather than a default FOV', () => {
  for (const focalLength of [18, 85]) for (const aspectRatio of [.55, 2.4]) {
    const result = boundsForSetup(setup({
      focalLength, aspectRatio,
      subjectFraming: { position: SubjectInFramePosition.Right },
    }));
    // Framing places the optical ROI target at the requested screen point;
    // the projected box midpoint can shift slightly with perspective depth.
    const target = projectPoint(result.roi.position, result.camera);
    close(target.x, 2 / 3);
    close(target.y, 0);
    assert.equal(result.camera.focalLength, focalLength);
    assert.equal(result.camera.aspectRatio, aspectRatio);
  }
});

test('interleaved cameras and a rejected request never mutate defaults or caller state', async () => {
  const frame = subjectFrame();
  const body = subject();
  const configA = Object.freeze(setup({ focalLength: 18, aspectRatio: .55 }));
  const configB = Object.freeze(setup({ focalLength: 85, aspectRatio: 2.4 }));
  const before = JSON.stringify({ frame, body, configA, configB });
  const originalDefault = cameraData(getCameraBySetup(setup(), body, frame));
  const expectedA = cameraData(getCameraBySetup(configA, body, frame));
  const expectedB = cameraData(getCameraBySetup(configB, body, frame));
  assert.throws(() => getCameraBySetup(setup({ focalLength: NaN }), body, frame), /positive finite/);
  const actual = await Promise.all(Array.from({ length: 32 }, (_, index) =>
    Promise.resolve().then(() => cameraData(getCameraBySetup(index % 2 ? configB : configA, body, frame)))
  ));
  actual.forEach((camera, index) => assert.deepEqual(camera, index % 2 ? expectedB : expectedA));
  assert.deepEqual(cameraData(getCameraBySetup(setup(), body, frame)), originalDefault);
  assert.equal(JSON.stringify({ frame, body, configA, configB }), before);
});

test('invalid focal lengths and aspects fail before geometry is generated', () => {
  for (const key of ['focalLength', 'aspectRatio']) for (const value of [0, -1, NaN, Infinity, -Infinity]) {
    assert.throws(() => getCameraBySetup(setup({ [key]: value }), subject(), subjectFrame()),
      new RegExp(`Camera ${key} must be a positive finite number`));
  }
});

test('interpolation uses optical geometry at both endpoints for init/end and subject-aware paths', () => {
  const body = subject();
  const frames = Array.from({ length: 5 }, () => subjectFrame());
  const first = setup({ focalLength: 18, aspectRatio: .7 });
  const last = setup({ focalLength: 85, aspectRatio: 2.4 });
  for (const kind of ['init', 'end']) for (const subjectAwareInterpolation of [false, true]) {
    const output = initCameraParameters({
      frameCount: frames.length,
      setup: { config: kind === 'init' ? first : last, kind },
      dynamic: {
        type: DynamicMode.Interpolation, easing: MovementEasing.Linear,
        complementSetup: kind === 'init' ? last : first, subjectAwareInterpolation,
      },
    }, undefined, { subject: body, frames });
    const expectedFirst = getCameraBySetup(first, body, frames[0]);
    const expectedLast = getCameraBySetup(last, body, frames.at(-1));
    close(output[0].position.distanceTo(expectedFirst.position), 0);
    close(output.at(-1).position.distanceTo(expectedLast.position), 0);
    output.forEach((camera, index) => {
      close(camera.focalLength, 18 + (85 - 18) * index / 4);
      close(camera.aspectRatio, .7 + (2.4 - .7) * index / 4);
    });
  }
});

test('simple pan keeps the supplied optics and rotates at a fixed camera position', () => {
  const frame = subjectFrame();
  const output = initCameraParameters({
    frameCount: 5, setup: { config: setup({ focalLength: 22, aspectRatio: .7 }), kind: 'init' },
    dynamic: {
      type: DynamicMode.Simple, easing: MovementEasing.Linear, scale: Scale.Small,
      direction: Direction.Left, movementMode: MovementMode.Rotation,
    },
  }, undefined, { subject: subject(), frames: Array.from({ length: 5 }, () => frame) });
  for (const camera of output) {
    assert.equal(camera.focalLength, 22);
    assert.equal(camera.aspectRatio, .7);
    assert.deepEqual(camera.position.toArray(), output[0].position.toArray());
  }
  assert.ok(Math.abs(output.at(-1).rotation.y - output[0].rotation.y) > .1);
});

test('semantic projection is scale invariant below the rendering near plane and rejects behind-camera boxes', () => {
  let reference;
  for (const scale of [.05, 1, 20]) {
    const frame = subjectFrame(scale);
    const body = subject(scale);
    const camera = {
      position: frame.position.clone().add(new Vector3(0, 0, 1.8 * scale)),
      rotation: new Euler(), focalLength: 18, aspectRatio: 16 / 9,
    };
    const bounds = projectBoundingBox(body.dimensions, frame.position, camera, frame.rotation);
    assert.equal(bounds.allInFront, true);
    if (reference) {
      close(bounds.width, reference.width);
      close(bounds.height, reference.height);
    } else reference = bounds;
    assert.equal(makeThreeJsCamera(camera).near, .1);
    const behind = projectBoundingBox(body.dimensions,
      camera.position.clone().add(new Vector3(0, 0, 1.8 * scale)), camera);
    assert.equal(behind.allInFront, false);
    const crossing = projectBoundingBox(body.dimensions, camera.position, camera);
    assert.equal(crossing.allInFront, false);
  }
});

test('miniature and large setup endpoints retain the requested closeup occupancy', () => {
  for (const scale of [.05, 1, 20]) {
    for (const [shotSize, target] of [[ShotSize.ExtremeCloseUp, 2], [ShotSize.FullShot, 1]]) {
      const result = boundsForSetup(setup({ shotSize, focalLength: 18, aspectRatio: 16 / 9 }),
        subject(scale), subjectFrame(scale));
      close(Math.max(result.bounds.width, result.bounds.height), target, 1e-3);
      assert.equal(result.bounds.allInFront, true);
      if (scale === .05 && shotSize === ShotSize.ExtremeCloseUp) {
        assert.ok(result.camera.position.distanceTo(result.roi.position) < .1);
      }
    }
  }
});

test('no-argument prompt generation preserves the previous seeded prompts and RNG consumption', () => {
  const random = createSeededRandom('legacy-optics-prompt-regression');
  const generated = withRandomSource(random, () => ({
    prompts: Array.from({ length: 200 }, () => generateRandomCinematographyPrompt()), next: random(),
  }));
  assert.equal(createHash('sha256').update(JSON.stringify(generated)).digest('hex'),
    'eafb6122c9b0e72729b51c65a8a09ff942c8aba16d7c9cb8f0b328be73763494');
});

test('forced prompts preserve exact movement and apply its setup rules before translation', () => {
  for (const movement of Object.values(CameraMovementType).filter((value) => !value.startsWith('dutch'))) {
    for (let seed = 0; seed < 32; seed++) {
      const prompt = withRandomSource(createSeededRandom(`${movement}-${seed}`), () =>
        generateRandomCinematographyPrompt(movement));
      assert.equal(prompt.movement.type, movement);
      assert.deepEqual(normalizeCinematographyPrompt(prompt), prompt);
      const instruction = translatePromptToSimulationInstruction(prompt);
      if ([CameraMovementType.CraneDown, CameraMovementType.PedestalDown].includes(movement)) {
        assert.ok(![CameraVerticalAngle.Low, CameraVerticalAngle.Eye].includes(prompt.initial.cameraAngle));
      }
      if (movement === CameraMovementType.Follow) assert.equal(prompt.initial.subjectView, SubjectView.Back);
      if (movement === CameraMovementType.Track) assert.ok([SubjectView.Left, SubjectView.Right].includes(prompt.initial.subjectView));
      if ([CameraMovementType.PanLeft, CameraMovementType.PanRight].includes(movement)) {
        assert.equal(instruction.dynamic.type, DynamicMode.Simple);
        assert.equal(instruction.dynamic.movementMode, MovementMode.Rotation);
      }
    }
  }
});

test('unsupported forced movements reject without consuming random state', () => {
  let draws = 0;
  for (const movement of ['unknown', '', null, CameraMovementType.DutchLeft, CameraMovementType.DutchRight]) {
    assert.throws(() => withRandomSource(() => { draws++; return .5; }, () =>
      generateRandomCinematographyPrompt(movement)), /Unsupported generated camera movement/);
  }
  assert.equal(draws, 0);
});
