const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const THREE = require("three");
const ts = require("typescript");

function loadQuality() {
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
      ...require("../src/service/dataset/quality.ts"),
      ...require("../src/service/dataset/simulationFormatter.ts"),
    };
  } finally {
    if (originalTsLoader) require.extensions[".ts"] = originalTsLoader;
    else delete require.extensions[".ts"];
  }
}

const {
  validateDatasetTrajectory,
  DatasetTrajectoryQualityError,
  DATASET_TRAJECTORY_QUALITY_POLICY: policy,
  quantizeCameraFramesForDataset,
  quantizeSubjectInfoForDataset,
} = loadQuality();

function fixture(count = 100) {
  return {
    subjectInfo: {
      subject: { id: "quality-test", class: "chair",
        dimensions: { width: 1, height: 2, depth: 1 } },
      movementType: "static",
      frames: Array.from({ length: count }, () => ({
        position: new THREE.Vector3(20, 2, -8), rotation: new THREE.Euler(),
      })),
    },
    cameras: Array.from({ length: count }, () => ({
      position: new THREE.Vector3(20, 2, 12), rotation: new THREE.Euler(),
      focalLength: 37.52, aspectRatio: 16 / 9,
    })),
  };
}

function validate({ cameras, subjectInfo }) {
  return validateDatasetTrajectory(
    quantizeCameraFramesForDataset(cameras),
    quantizeSubjectInfoForDataset([subjectInfo])[0]
  );
}

function rejects(data, reason) {
  assert.throws(() => validate(data), (error) => {
    assert.ok(error instanceof DatasetTrajectoryQualityError);
    assert.equal(error.reason, reason);
    return true;
  });
}

function trainingIndices(count) {
  return Array.from({ length: 30 }, (_, index) => Math.round(index * (count - 1) / 29));
}

test("static and smooth quantized paths pass at both export frame-count limits without mutations", () => {
  for (const count of [100, 500]) {
    const data = fixture(count);
    validate(data);
    data.cameras.forEach((camera, index) => {
      const time = index / (count - 1);
      camera.position.x += 40 * time;
      camera.position.y += 0.15 * Math.sin(2 * Math.PI * time);
      camera.rotation.y = 0.3 * time;
    });
    const cameras = quantizeCameraFramesForDataset(data.cameras);
    const subjectInfo = quantizeSubjectInfoForDataset([data.subjectInfo])[0];
    const before = JSON.stringify({ cameras, subjectInfo });
    const metrics = validateDatasetTrajectory(cameras, subjectInfo);
    assert.equal(JSON.stringify({ cameras, subjectInfo }), before);
    assert.ok(metrics.maxTrainingTranslation > 1);
    assert.ok(metrics.maxTrainingTranslation < policy.maxTranslationPerTrainingStep);
    assert.ok(metrics.maxTrainingAcceleration < policy.maxAccelerationPerTrainingStepSquared);
    assert.deepEqual(validateDatasetTrajectory(cameras, subjectInfo), metrics);
  }
});

test("collisions use the translated, rotated subject box including its exact center", () => {
  const data = fixture();
  data.subjectInfo.subject.dimensions = { width: 4, height: 2, depth: 1 };
  data.subjectInfo.frames.forEach((frame) => { frame.rotation.y = Math.PI / 2; });
  for (const localOffset of [new THREE.Vector3(), new THREE.Vector3(1.5, 0, 0)]) {
    data.cameras.forEach((camera, index) => {
      const subject = data.subjectInfo.frames[index];
      camera.position.copy(localOffset).applyEuler(subject.rotation).add(subject.position);
    });
    rejects(data, "camera-subject-collision");
  }
  // This is inside the unrotated dimensions but outside the actual rotated box.
  data.cameras.forEach((camera, index) => {
    camera.position.copy(data.subjectInfo.frames[index].position).add(new THREE.Vector3(1.5, 0, 0));
  });
  validate(data);
});

test("clearance rejects near-face cameras while allowing closeups outside the box", () => {
  const data = fixture();
  for (const [offset, expected] of [[0.51, false], [0.55, true]]) {
    data.cameras.forEach((camera, index) => {
      camera.position.copy(data.subjectInfo.frames[index].position).add(new THREE.Vector3(0, 0, offset));
    });
    if (expected) validate(data);
    else rejects(data, "camera-subject-collision");
  }
});

test("a collision hidden between the 30 selected frames is rejected at source resolution", () => {
  for (const count of [100, 500]) {
    const data = fixture(count);
    const selected = new Set(trainingIndices(count));
    const hidden = data.cameras.findIndex((_, index) => !selected.has(index));
    data.subjectInfo.frames[hidden].position.copy(data.cameras[hidden].position);
    assert.ok(!selected.has(hidden));
    rejects(data, "camera-subject-collision");
  }
});

test("straight relative segments cannot cross a fixed-orientation box between source poses", () => {
  const data = fixture();
  data.subjectInfo.subject.dimensions.width = 0.2;
  data.cameras.forEach((camera, index) => {
    camera.position.copy(data.subjectInfo.frames[index].position)
      .add(new THREE.Vector3(index === 0 ? -0.15 : 0.15, 0, 0));
  });
  rejects(data, "camera-subject-collision");
});

test("25-unit world jumps and source-only spikes are rejected for 100 and 500 frames", () => {
  for (const count of [100, 500]) {
    const data = fixture(count);
    // A constant subject-relative pose must still obey WORLD camera limits.
    data.cameras.forEach((camera, index) => { if (index > 0) camera.position.x += 25; });
    data.subjectInfo.frames.forEach((frame, index) => { if (index > 0) frame.position.x += 25; });
    rejects(data, "source-translation");
    const spike = fixture(count);
    assert.ok(!trainingIndices(count).includes(1));
    spike.cameras[1].position.x += 1;
    rejects(spike, "source-translation");
  }
});

test("nearest selected model frames enforce translation and angular limits independently", () => {
  const translation = fixture();
  translation.cameras.forEach((camera, index) => {
    camera.position.x += index * 2.8 * 29 / 99;
  });
  rejects(translation, "training-translation");
  const rotation = fixture();
  rotation.cameras.forEach((camera, index) => {
    camera.rotation.y = index * (27 * Math.PI / 180) * 29 / 99;
  });
  rejects(rotation, "training-rotation");
});

test("abrupt model-step velocity changes fail even when all speeds are permissible", () => {
  for (const count of [100, 500]) {
    const data = fixture(count);
    const indices = trainingIndices(count);
    for (let step = 1; step < indices.length; step++) {
      const start = indices[step - 1];
      const end = indices[step];
      const from = (step - 1) % 2 === 0 ? 0 : 0.65;
      const to = step % 2 === 0 ? 0 : 0.65;
      for (let index = start; index <= end; index++) {
        data.cameras[index].position.x = 20 + from + (to - from) * (index - start) / (end - start);
      }
    }
    rejects(data, "training-acceleration");
  }
});

test("a clip may start with a camera already moving faster than the acceleration limit", () => {
  for (const count of [100, 500]) {
    const data = fixture(count);
    data.cameras.forEach((camera, index) => {
      camera.position.x += index * 2 * 29 / (count - 1);
    });
    const metrics = validate(data);
    assert.ok(metrics.maxTrainingTranslation > policy.maxAccelerationPerTrainingStepSquared);
    assert.ok(metrics.maxTrainingAcceleration < policy.maxAccelerationPerTrainingStepSquared);
  }
});

test("quaternion distances recognize equivalent Euler wraps and reject hidden rotation spikes", () => {
  for (const count of [100, 500]) {
    const data = fixture(count);
    data.cameras.forEach((camera, index) => {
      camera.rotation.y = index % 2 === 0 ? Math.PI : -Math.PI;
    });
    validate(data);
    const spike = fixture(count);
    spike.cameras[1].rotation.y = Math.PI / 2;
    rejects(spike, "source-rotation");
  }
});

test("quantization noise is tolerated in source derivatives and acceleration is checked only at model resolution", () => {
  const data = fixture(500);
  // Independent coordinate roundoff causes visible second differences at
  // source resolution despite this constant world velocity.
  data.cameras.forEach((camera, index) => {
    camera.position.addScaledVector(new THREE.Vector3(0.7341, 0.6237, 0.1421), index * 0.07);
    camera.rotation.set(index * 0.0007, index * 0.0006, index * 0.0004);
  });
  validate(data);
});

test("malformed tracks, nonfinite poses, invalid dimensions and unrepresentable Euler orders fail", () => {
  const mismatch = fixture();
  mismatch.subjectInfo.frames.pop();
  rejects(mismatch, "frame-count");
  rejects(fixture(29), "frame-count");
  const missing = fixture();
  missing.subjectInfo.frames = undefined;
  rejects(missing, "frame-count");
  for (const corrupt of [
    (data) => { data.cameras[5].position.x = NaN; },
    (data) => { data.cameras[5].rotation.y = Infinity; },
    (data) => { data.subjectInfo.frames[5].rotation.z = NaN; },
    (data) => { data.subjectInfo.frames[5].position.z = Infinity; },
    (data) => { data.subjectInfo.subject.dimensions.width = 0; },
    (data) => { data.subjectInfo.subject.dimensions.height = -1; },
    (data) => { data.cameras[5].focalLength = Infinity; },
    (data) => { data.cameras[5].aspectRatio = 0; },
    (data) => { data.cameras[5].rotation.order = "YXZ"; },
  ]) {
    const data = fixture();
    corrupt(data);
    rejects(data, "invalid-geometry");
  }
});
