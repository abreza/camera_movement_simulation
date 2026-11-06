require('./register-typescript.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { Euler, Quaternion, Vector3 } = require('three');
const { CameraMovementType: M } = require('../src/service/simulation/instruction/types.ts');
const { ObjectClass } = require('../src/service/subjects/types.ts');
const { validateDatasetCameraMovement: validate, DatasetCameraMovementQualityError } = require('../src/service/dataset/movementQuality.ts');
const { quantizeCameraFramesForDataset, quantizeSubjectInfoForDataset } = require('../src/service/dataset/simulationFormatter.ts');

function fixture(positions, rotations, bodies) {
  const camera = positions.map((position, i) => ({ position: position.clone(),
    rotation: (rotations?.[i] ?? new Euler()).clone(), focalLength: 50, aspectRatio: 16/9 }));
  const subject = { subject: { id: 'subject', class: ObjectClass.Human,
      dimensions: { width: .5, height: 1.7, depth: .3 } }, movementType: 'walk',
    frames: positions.map((_, i) => ({ position: (bodies?.[i]?.position ?? new Vector3()).clone(),
      rotation: (bodies?.[i]?.rotation ?? new Euler()).clone() })) };
  return { camera: quantizeCameraFramesForDataset(camera), subject: quantizeSubjectInfoForDataset([subject])[0] };
}
const positions = (values) => values.map((value) => new Vector3(...value));
function check(f, movement) { return validate(f.camera, f.subject, movement); }
function rejects(f, movement, reason) {
  assert.throws(() => check(f, movement), (error) => error instanceof DatasetCameraMovementQualityError && error.reason === reason,
    `Expected descriptive ${reason} for ${movement}`);
}

test('static is a world camera pose, even when the subject translates or turns', () => {
  const f = fixture(positions([[0, 1, 5], [0, 1, 5], [0, 1, 5]]), undefined,
    [0, 1, 2].map((i) => ({ position: new Vector3(i, 0, 0), rotation: new Euler(0, i*.4, 0) })));
  assert.deepEqual(check(f, M.Static).checkedInvariants, ['static-world-camera-pose']);
  const before = JSON.stringify(f); check(f, M.Static); assert.equal(JSON.stringify(f), before);
});

test('static rejects either translation or rotation', () => {
  rejects(fixture(positions([[0, 1, 5], [.001, 1, 5]])), M.Static, 'static-camera-motion');
  rejects(fixture(positions([[0, 1, 5], [0, 1, 5]]), [new Euler(), new Euler(0, .001, 0)]), M.Static, 'static-camera-motion');
});

test('quaternion-equivalent Euler representations do not create fake static motion', () => {
  const f = fixture(positions([[0, 1, 5], [0, 1, 5]]));
  f.camera[1].rotation.set(2*Math.PI, 0, 0, 'XYZ');
  check(f, M.Static);
});

test('a nonstatic label cannot survive complete export quantization collapse', () => {
  const f = fixture(positions([[0, 1, 5], [.0001, 1, 5]]), [new Euler(), new Euler(0, .0001, 0)]);
  for (const movement of Object.values(M).filter((m) => m !== M.Static)) rejects(f, movement, 'no-camera-motion');
});

test('nonstatic excursion is measured across the clip, not only its endpoints', () => {
  const f = fixture(positions([[0, 1, 5], [0, 2, 5], [0, 1, 5]]));
  assert.equal(check(f, M.CraneUp).maxPositionExcursion, 1);
});

test('Pan and Tilt keep the world center and accept the smallest packed angle', () => {
  for (const movement of [M.PanLeft, M.PanRight, M.TiltUp, M.TiltDown]) {
    const final = movement.startsWith('pan') ? new Euler(0, .001, 0) : new Euler(.001, 0, 0);
    const f = fixture(positions([[1, 2, 3], [1, 2, 3]]), [new Euler(), final]);
    assert.ok(check(f, movement).maxRotationExcursionRadians > 0);
    f.camera[1].position.x += .001;
    rejects(f, movement, 'rotation-camera-translation');
  }
});

test('Truck direction uses initial camera right rather than a world axis', () => {
  const rotation = new Euler(0, Math.PI/2, 0);
  const right = new Vector3(1, 0, 0).applyQuaternion(new Quaternion().setFromEuler(rotation));
  for (const [movement, sign] of [[M.TruckRight, 1], [M.TruckLeft, -1]]) {
    const f = fixture([new Vector3(0, 1, 5), new Vector3(0, 1, 5).addScaledVector(right, sign)], [rotation, rotation]);
    check(f, movement);
    rejects(f, movement === M.TruckRight ? M.TruckLeft : M.TruckRight, 'truck-direction');
  }
});

test('Truck and Pedestal preserve camera orientation', () => {
  for (const movement of [M.TruckRight, M.PedestalUp]) {
    const f = fixture(positions([[0, 1, 5], [0, 2, 5]]), [new Euler(), new Euler(0, .001, 0)]);
    rejects(f, movement, 'translation-camera-rotation');
  }
});

test('Pedestal is signed world Y even when the camera is pitched', () => {
  const rotation = new Euler(.8, .3, 0);
  for (const [movement, sign] of [[M.PedestalUp, 1], [M.PedestalDown, -1]]) {
    const f = fixture(positions([[0, 2, 5], [0, 2+sign, 5]]), [rotation, rotation]);
    check(f, movement);
    rejects(f, sign === 1 ? M.PedestalDown : M.PedestalUp, 'pedestal-direction');
    f.camera[1].position.x += .001;
    rejects(f, movement, 'pedestal-nonvertical-motion');
  }
});

test('Dolly direction is relative to moving/turning subjects, not world displacement', () => {
  const bodies = [0, 1, 2].map((i) => ({ position: new Vector3(i*2, .85, -i), rotation: new Euler(0, i*.3, 0) }));
  for (const [movement, sign] of [[M.DollyIn, -1], [M.DollyOut, 1]]) {
    const camera = bodies.map((body, i) => body.position.clone().add(new Vector3(0, 0, 10+i*sign)
      .applyQuaternion(new Quaternion().setFromEuler(body.rotation))));
    const f = fixture(camera, bodies.map((body) => body.rotation), bodies);
    assert.equal(Object.keys(check(f, movement).dollyRangeChanges).length, 8);
    rejects(f, sign === -1 ? M.DollyOut : M.DollyIn, 'dolly-direction');
  }
});

test('Dolly does not mistake a legitimate upper-ROI approach for increasing body-center range', () => {
  const f = fixture(positions([[0, 0, .2], [0, .2, .1]]));
  f.subject.subject.dimensions = { width: .2, height: 2, depth: .02 };
  const result = check(f, M.DollyIn);
  assert.ok(result.dollyRangeChanges.fullShot > 0);
  assert.ok(result.dollyRangeChanges.closeUp < 0);
});

test('body-following translation alone cannot be called a Dolly or Arc', () => {
  const bodies = [0, 1, 2].map((i) => ({ position: new Vector3(i, 0, 0), rotation: new Euler() }));
  const f = fixture(positions([[0, 1, 5], [1, 1, 5], [2, 1, 5]]), undefined, bodies);
  rejects(f, M.DollyIn, 'dolly-no-relative-motion');
  rejects(f, M.ArcLeft, 'arc-no-relative-motion');
  check(f, M.Follow); check(f, M.Track);
});

test('a genuine Arc has subject-relative movement while its subject translates', () => {
  const bodies = [0, 1, 2].map((i) => ({ position: new Vector3(i, 0, 0), rotation: new Euler(0, i*.5, 0) }));
  const camera = bodies.map((body, i) => new Vector3(3*Math.sin(i*.2), 1, 3*Math.cos(i*.2)).add(body.position));
  check(fixture(camera, undefined, bodies), M.ArcRight);
});

test('invalid or unmatched geometry and unknown labels have coded failures', () => {
  const f = fixture(positions([[0, 1, 5], [0, 1, 5]]));
  rejects(f, 'not-a-movement', 'unknown-movement');
  f.camera[1].position.x = NaN; rejects(f, M.Static, 'invalid-geometry');
  f.camera.pop(); rejects(f, M.Static, 'frame-count');
});
