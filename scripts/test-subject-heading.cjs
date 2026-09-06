const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const THREE = require("three");
const ts = require("typescript");

function loadSubjects() {
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
      ...require("../src/service/subjects/movements/index.ts"),
      ...require("../src/utils/randomUtils.ts"),
    };
  } finally {
    if (originalTsLoader) require.extensions[".ts"] = originalTsLoader;
    else delete require.extensions[".ts"];
  }
}

const { generateFrames, movementGenerators, createSeededRandom, withRandomSource } = loadSubjects();
const subject = {
  id: "vehicle", class: "car", dimensions: { width: 2, height: 1.5, depth: 4 },
};
const movements = ["linear", "circular", "spiral", "figureEight", "wave", "zigzag"];
const quaternion = (frame) => new THREE.Quaternion().setFromEuler(frame.rotation);
const generate = (movement, seed, frameCount, options = {}) =>
  withRandomSource(createSeededRandom(seed), () => generateFrames(
    [subject], { [subject.id]: movement }, { applyNoise: true, frameCount, ...options }
  )[0]);

test("seeded subject paths and headings agree at shared clip times across export counts", () => {
  for (const movement of movements) {
    const short = generate(movement, "same-clip", 101);
    const long = generate(movement, "same-clip", 501);
    const repeat = generate(movement, "same-clip", 101);
    assert.deepEqual(short, repeat, `${movement}: seed repeatability`);
    short.forEach((frame, index) => {
      const corresponding = long[index * 5];
      assert.ok(frame.position.distanceTo(corresponding.position) < 1e-10,
        `${movement}: position at shared time ${index}`);
      assert.ok(Math.abs(frame.rotation.y - corresponding.rotation.y) < 1e-10,
        `${movement}: yaw at shared time ${index}`);
      assert.equal(frame.position.y, subject.dimensions.height / 2);
      assert.equal(frame.rotation.x, 0);
      assert.equal(frame.rotation.z, 0);
    });
  }
});

test("slow spiral starts face the path immediately without an authored-yaw flip", () => {
  const frames = generate("spiral", "slow-start", 501, {
    applyNoise: false,
    randomSettings: {
      seed: 42,
      positionOffset: { radius: 0.02 },
      timing: { smoothness: 0.8, accelerationBias: 0 },
      speedFactor: { min: 0.6, max: 0.6 },
    },
  });
  const firstDirection = frames[1].position.clone().sub(frames[0].position).normalize();
  const front = new THREE.Vector3(0, 0, -1).applyEuler(frames[0].rotation);
  assert.ok(firstDirection.dot(front) > 0.995, "even tiny starting motion has the correct front");
  for (let index = 1; index < frames.length; index++) {
    assert.ok(quaternion(frames[index]).angleTo(quaternion(frames[index - 1])) < 0.05,
      `no heading discontinuity at frame ${index}`);
  }
});

test("curved vehicle paths have bounded turns while remaining aligned with their travel", () => {
  for (const movement of movements) {
    for (let seed = 0; seed < 100; seed++) {
      const frames = generate(movement, seed, 501);
      for (let index = 0; index < frames.length; index++) {
        const frame = frames[index];
        if (index > 0) {
          const turn = quaternion(frame).angleTo(quaternion(frames[index - 1]));
          // The highest-turn spirals need more than the normal 4π/clip budget,
          // but none should retain a one-frame turn from a control-point seam.
          assert.ok(turn * (frames.length - 1) < 24,
            `${movement} seed ${seed} frame ${index}: excessive normalized turn`);
        }
        const previous = frames[Math.max(0, index - 1)].position;
        const next = frames[Math.min(frames.length - 1, index + 1)].position;
        const direction = next.clone().sub(previous).normalize();
        const front = new THREE.Vector3(0, 0, -1).applyEuler(frame.rotation);
        assert.ok(direction.dot(front) > Math.cos(8 * Math.PI / 180),
          `${movement} seed ${seed} frame ${index}: subject must steer along its path`);
      }
    }
  }
});

test("turn-aware sampling preserves authored motion endpoints", () => {
  for (const movement of movements) {
    const authored = movementGenerators[movement](subject, 0, 1);
    const sampled = generate(movement, 1, 101, { applyNoise: false, randomize: false });
    assert.ok(sampled[0].position.distanceTo(authored[0].position) < 1e-10,
      `${movement}: initial position`);
    assert.ok(sampled.at(-1).position.distanceTo(authored.at(-1).position) < 1e-10,
      `${movement}: final position`);
  }
});

test("static poses ignore movement noise and specialized motions retain authored rotations", () => {
  const staticFrames = generate("static", "stationary", 101);
  assert.deepEqual(staticFrames, generate("static", "stationary", 101, { applyNoise: false }));
  staticFrames.forEach((frame) => assert.deepEqual(frame, staticFrames[0]));
  for (const movement of ["pendulum", "orbital", "bounce"]) {
    const authored = movementGenerators[movement](subject, 0, 1);
    const sampled = generate(movement, 1, authored.length, { applyNoise: false, randomize: false });
    sampled.forEach((frame, index) => assert.ok(
      quaternion(frame).angleTo(quaternion(authored[index])) < 1e-6,
      `${movement}: authored orientation at frame ${index}`
    ));
  }
});
