const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const THREE = require("three");
const ts = require("typescript");

function loadSimulation() {
  const sourceDirectory = path.resolve(__dirname, "../src");
  const originalTsLoader = require.extensions[".ts"];
  require.extensions[".ts"] = (module, filename) => {
    if (!filename.startsWith(`${sourceDirectory}${path.sep}`)) {
      return (originalTsLoader ?? require.extensions[".js"])(module, filename);
    }
    const requireFromModule = module.require.bind(module);
    module.require = (id) => requireFromModule(
      id.startsWith("@/") ? path.join(sourceDirectory, id.slice(2)) : id
    );
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
    return {
      ...require("../src/service/simulation/rule-based/sequence.ts"),
      ...require("../src/service/simulation/rule-based/setup/index.ts"),
      ...require("../src/service/simulation/rule-based/setup/framing.ts"),
      ...require("../src/service/simulation/utils.ts"),
      ...require("../src/service/simulation/instruction/high-level/rules.ts"),
      ...require("../src/service/simulation/instruction/high-level/translator/index.ts"),
      ...require("../src/service/dataset/finalSetup.ts"),
    };
  } finally {
    if (originalTsLoader) require.extensions[".ts"] = originalTsLoader;
    else delete require.extensions[".ts"];
  }
}

const {
  calculateCameraPositions, generateCameraParameters, getCameraBySetup,
  fixSubjectInView, projectPoint, projectBoundingBox, isProjectedBoundsFullyVisible,
  normalizeCinematographyPrompt, translatePromptToSimulationInstruction,
  deriveSubjectFramingFromBounds,
} = loadSimulation();
const setup = {
  cameraAngle: "eye", shotSize: "fullShot", subjectView: "front",
  subjectFraming: { position: "center" },
};
const quaternion = (rotation) => new THREE.Quaternion().setFromEuler(rotation);
const close = (actual, expected, message, tolerance = 1e-7) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);

function sameCamera(actual, expected, message) {
  close(actual.position.distanceTo(expected.position), 0, `${message}: position`);
  close(quaternion(actual.rotation).angleTo(quaternion(expected.rotation)), 0,
    `${message}: orientation`, 1e-6);
  close(actual.focalLength, expected.focalLength, `${message}: focal length`);
  close(actual.aspectRatio, expected.aspectRatio, `${message}: aspect ratio`);
}

function finiteCamera(camera) {
  assert.ok([...camera.position.toArray(), ...quaternion(camera.rotation).toArray(),
    camera.focalLength, camera.aspectRatio].every(Number.isFinite));
  assert.ok(camera.position.y >= 0.1, "camera must remain above the floor");
}

function subjectInfo(count = 24, offset = 0) {
  return {
    subject: { id: `subject-${offset}`, class: "chair",
      dimensions: { width: 1, height: 2, depth: 1 } },
    movementType: "test",
    frames: Array.from({ length: count }, (_, index) => ({
      position: new THREE.Vector3(offset + index * 0.4, 2, index * index * 0.015),
      rotation: new THREE.Euler(0, index * index * 0.012, 0),
    })),
  };
}

function interpolation(frameCount = 5, subjectIndex = 0) {
  return {
    frameCount, subjectIndex, setup: { kind: "init", config: setup },
    dynamic: { type: "interpolation", easing: "linear",
      subjectAwareInterpolation: true, complementSetup: setup },
  };
}

function simple(movementMode, direction, frameCount = 9) {
  return { frameCount, subjectIndex: 0, setup: { kind: "init", config: setup },
    dynamic: { type: "simple", easing: "linear", scale: "small",
      movementMode, direction } };
}

test("a shot follows translating and rotating subjects at its absolute timeline offset", () => {
  const info = subjectInfo();
  const offset = 6;
  const frames = generateCameraParameters(interpolation(5), undefined, info, offset);
  assert.equal(frames.length, 5);
  frames.forEach((camera, index) => {
    // Identical start/end setups keep the camera in the same subject-local pose.
    sameCamera(camera, getCameraBySetup(setup, info.subject, info.frames[offset + index]),
      `global frame ${offset + index}`);
  });
});

test("sequences retain the camera while advancing scene time and switching targets", () => {
  const subjects = [subjectInfo(), subjectInfo(24, 4)];
  const instructions = [interpolation(4), interpolation(5), interpolation(6, 1)];
  const frames = calculateCameraPositions(instructions, subjects);
  assert.equal(frames.length, 15);
  sameCamera(frames[4], frames[3], "second shot begins at the previous camera");
  sameCamera(frames[9], frames[8], "target switch retains the previous camera");
  for (const [index, subjectIndex] of [[3, 0], [8, 0], [14, 1]]) {
    const info = subjects[subjectIndex];
    sameCamera(frames[index], getCameraBySetup(setup, info.subject, info.frames[index]),
      `shot endpoint at global frame ${index}`);
  }
});

test("an end-anchored short shot uses its own final frame, not the end of the track", () => {
  const info = subjectInfo();
  const instruction = simple("transition", "right", 4);
  instruction.setup = { kind: "end", config: setup };
  const frames = generateCameraParameters(instruction, undefined, info, 5);
  const expected = getCameraBySetup(setup, info.subject, info.frames[8]);
  sameCamera(frames.at(-1), expected, "requested endpoint");
  assert.ok(frames[0].position.distanceTo(expected.position) > 0.1,
    "the end-anchored movement must still move");
});

test("short subject tracks hold the final pose, including visibility and static distance", () => {
  const info = subjectInfo(3);
  const instruction = interpolation(8);
  instruction.constraints = { allFramesVisibility: true, staticDistance: true };
  const frames = generateCameraParameters(instruction, undefined, info);
  assert.equal(frames.length, 8);
  const radius = frames[0].position.distanceTo(info.frames[0].position);
  frames.forEach((camera, index) => {
    const subjectFrame = info.frames[Math.min(index, 2)];
    finiteCamera(camera);
    close(camera.position.distanceTo(subjectFrame.position), radius, "static distance", 1e-6);
    assert.ok(isProjectedBoundsFullyVisible(projectBoundingBox(
      info.subject.dimensions, subjectFrame.position, camera, subjectFrame.rotation
    )), "held subject remains visible");
  });
  const afterTrack = generateCameraParameters(interpolation(4), undefined, info, 20);
  afterTrack.forEach((camera) => sameCamera(camera,
    getCameraBySetup(setup, info.subject, info.frames[2]), "pose after track ends"));
});

test("every simple movement mode produces exactly repeatable camera parameters", () => {
  const info = subjectInfo(12);
  const movements = [
    ["transition", "right"], ["transition", "forward"],
    ["rotation", "left"], ["arc", "right"], ["crane", "up"], ["roll", "left"],
  ];
  for (const [mode, direction] of movements) {
    const instruction = simple(mode, direction);
    const first = generateCameraParameters(instruction, undefined, info);
    first.forEach(finiteCamera);
    assert.equal(first.length, instruction.frameCount);
    assert.deepEqual(generateCameraParameters(instruction, undefined, info), first, mode);
    assert.deepEqual(generateCameraParameters(instruction, undefined, info), first, mode);
  }
});

test("a chained simple end setup continues forward from the inherited camera", () => {
  const info = subjectInfo(1);
  const first = simple("transition", "right", 4);
  const second = simple("transition", "right", 4);
  second.setup = { kind: "end", config: setup };
  const frames = calculateCameraPositions([first, second], [info]);
  sameCamera(frames[4], frames[3], "boundary continuity");
  const previousDirection = frames[3].position.clone().sub(frames[0].position).normalize();
  assert.ok(frames[7].position.clone().sub(frames[4].position).dot(previousDirection) > 0,
    "the second shot advances in the requested direction");
});

test("generation preserves caller-owned instructions, subject poses, and initial camera", () => {
  const info = subjectInfo();
  const instruction = simple("transition", "forward");
  const start = getCameraBySetup(setup, info.subject, info.frames[4]);
  const before = JSON.stringify({ info, instruction, start });
  const frames = generateCameraParameters(instruction, start, info, 4);
  assert.equal(JSON.stringify({ info, instruction, start }), before);
  frames[0].position.set(999, 999, 999);
  frames[0].rotation.set(1, 2, 3);
  assert.equal(JSON.stringify({ info, instruction, start }), before,
    "returned poses must not alias caller-owned objects");
  assert.notEqual(frames[1].position.x, 999, "frames own independent vectors");
});

test("invalid frame counts and missing sequence targets fail descriptively", () => {
  const info = subjectInfo();
  for (const count of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => generateCameraParameters(interpolation(count), undefined, info), /frame count/i);
    assert.throws(() => calculateCameraPositions([interpolation(count)], [info]), /frame count/i);
  }
  for (const offset of [-1, 0.5, NaN, Infinity]) {
    assert.throws(() => generateCameraParameters(interpolation(), undefined, info, offset), /starting frame/i);
  }
  assert.deepEqual(generateCameraParameters(interpolation(0)), []);
  assert.deepEqual(generateCameraParameters(interpolation()), []);
  assert.deepEqual(generateCameraParameters(interpolation(), undefined, subjectInfo(0)), []);
  assert.deepEqual(calculateCameraPositions([interpolation(0)], []), []);
  assert.deepEqual(calculateCameraPositions([], []), []);
  assert.throws(() => calculateCameraPositions([interpolation()], []), /Instruction 1.*subject.*frames/i);
  assert.throws(() => calculateCameraPositions([interpolation(2, 3)], [info]), /Instruction 1.*subject/i);
});

test("off-center framing preserves a level horizon for a pitched camera", () => {
  const target = new THREE.Vector3(1, 2, -1);
  const camera = { position: new THREE.Vector3(5, 7, 12),
    rotation: new THREE.Euler(), focalLength: 37.52, aspectRatio: 16 / 9 };
  for (const [position, x, y] of [
    ["left", -2 / 3, 0], ["right", 2 / 3, 0],
    ["topLeft", -2 / 3, 2 / 3], ["bottomRight", 2 / 3, -2 / 3],
  ]) {
    const result = fixSubjectInView(camera, target, undefined, position);
    const projected = projectPoint(target, result);
    close(projected.x, x, `${position}: projected x`);
    close(projected.y, y, `${position}: projected y`);
    close(new THREE.Vector3(1, 0, 0).applyEuler(result.rotation).y, 0,
      `${position}: horizontal camera right axis`);
  }
});

test("centered framing retains look-at orientation and overhead framing stays finite", () => {
  const target = new THREE.Vector3(0, 2, 0);
  for (const position of [new THREE.Vector3(4, 8, 12), new THREE.Vector3(0, 15, 0)]) {
    const lookAt = new THREE.PerspectiveCamera();
    lookAt.position.copy(position);
    if (position.x === 0 && position.z === 0) lookAt.up.set(0, 0, 1);
    lookAt.lookAt(target);
    const camera = { position, rotation: lookAt.rotation.clone(),
      focalLength: 37.52, aspectRatio: 16 / 9 };
    const centered = fixSubjectInView(camera, target, undefined, "center");
    finiteCamera(centered);
    sameCamera(centered, camera, "centered look-at compatibility");
    const offCenter = fixSubjectInView(camera, target, undefined, "topRight");
    finiteCamera(offCenter);
    const projected = projectPoint(target, offCenter);
    close(projected.x, 2 / 3, "overhead/off-center x");
    close(projected.y, 2 / 3, "overhead/off-center y");
  }
});

test("stationary camera prompts cannot request acceleration through any speed option", () => {
  for (const speed of ["constant", "slowToFast", "fastToSlow", "smoothStartStop"]) {
    const prompt = { initial: { cameraAngle: "eye", shotSize: "fullShot",
      subjectView: "front", subjectFraming: "center" }, movement: { type: "static", speed } };
    const before = JSON.stringify(prompt);
    const normalized = normalizeCinematographyPrompt(prompt);
    const instruction = translatePromptToSimulationInstruction(prompt);
    assert.equal(normalized.movement.speed, "constant");
    assert.equal(instruction.dynamic.easing, "linear");
    assert.equal(instruction.constraints.maxSpeed, 0);
    assert.equal(instruction.constraints.maxAccelerate, 0);
    assert.equal(JSON.stringify(prompt), before, "normalization must not alter editor state");
    assert.equal(normalizeCinematographyPrompt({ ...prompt,
      movement: { type: "dollyOut", speed } }).movement.speed, speed,
    "moving cameras retain the requested speed profile");
  }
});

test("endpoint framing distinguishes in-frame corners from offscreen subjects", () => {
  const bounds = (x, y) => ({ center: new THREE.Vector2(x, y), width: 0.4, height: 0.4,
    min: new THREE.Vector2(x - 0.2, y - 0.2), max: new THREE.Vector2(x + 0.2, y + 0.2),
    allInFront: true });
  for (const [x, y, expected] of [
    [-0.7, 0.7, "topLeft"], [0.7, -0.7, "bottomRight"], [0, 0, "center"],
    [-1.5, 0.7, "outerLeft"], [1.5, -0.7, "outerRight"],
    [0.7, 1.5, "outerTop"], [-0.7, -1.5, "outerBottom"],
  ]) assert.equal(deriveSubjectFramingFromBounds(bounds(x, y)), expected);
  for (const x of [-2, 2]) for (const y of [-2, 2]) {
    assert.throws(() => deriveSubjectFramingFromBounds(bounds(x, y)), /diagonal offscreen/i,
      "existing vocabulary cannot describe an outer diagonal as an ordinary corner");
  }
  assert.throws(() => deriveSubjectFramingFromBounds({ ...bounds(0, 0), allInFront: false }));
});
