import { Box3, Quaternion, Vector3 } from "three";
import type { CameraParameters } from "../simulation/instruction/types";
import type { SubjectInfo } from "../subjects/types";
import { DEFAULT_FRAME_COUNT } from "../simulation/constants";
import { DATASET_FLOAT_FACTOR } from "./simulationFormatter";

/**
 * Bounds on world-space camera motion over a normalized clip, measured in
 * the default model's 30 steps. These are export quality limits, not FPS or
 * physical acceleration limits. Position/Euler packing rounds to 0.001;
 * tolerances cover the worst-case error in differences of packed values.
 */
export const DATASET_TRAJECTORY_QUALITY_POLICY = Object.freeze({
  referenceFrameCount: DEFAULT_FRAME_COUNT,
  cameraClearanceSceneUnits: 0.02,
  maxTranslationPerTrainingStep: 3,
  maxAccelerationPerTrainingStepSquared: 1,
  maxRotationPerTrainingStepRadians: Math.PI / 6,
  translationQuantizationTolerance: Math.sqrt(3) / DATASET_FLOAT_FACTOR,
  accelerationQuantizationTolerance: 2 * Math.sqrt(3) / DATASET_FLOAT_FACTOR,
  rotationQuantizationToleranceRadians: 3 / DATASET_FLOAT_FACTOR,
  collisionCheck: "stored-poses-and-fixed-orientation-linear-segments",
});

export type DatasetTrajectoryQualityReason =
  | "frame-count"
  | "invalid-geometry"
  | "camera-subject-collision"
  | "source-translation"
  | "source-rotation"
  | "training-translation"
  | "training-acceleration"
  | "training-rotation";

export class DatasetTrajectoryQualityError extends Error {
  constructor(
    public readonly reason: DatasetTrajectoryQualityReason,
    message: string,
    public readonly frameIndex?: number
  ) {
    super(`Dataset trajectory ${reason}: ${message}`);
    this.name = "DatasetTrajectoryQualityError";
  }
}

export interface DatasetTrajectoryQualityMetrics {
  maxSourceTranslationPerTrainingStep: number;
  maxSourceRotationPerTrainingStepRadians: number;
  maxTrainingTranslation: number;
  maxTrainingAcceleration: number;
  maxTrainingRotationRadians: number;
}

const AXES = ["x", "y", "z"] as const;

function isFiniteVector(vector: { x: number; y: number; z: number }): boolean {
  return AXES.every((axis) => Number.isFinite(vector[axis]));
}

function assertDimensions(
  dimensions: SubjectInfo["subject"]["dimensions"],
  name: string
): void {
  if (
    ![dimensions.width, dimensions.height, dimensions.depth].every(
      (value) => Number.isFinite(value) && value > 0
    )
  ) {
    throw new DatasetTrajectoryQualityError(
      "invalid-geometry",
      `${name} dimensions must be finite and positive.`
    );
  }
}

/** Slab intersection including both endpoints, with no direction normalization. */
function segmentIntersectsBox(start: Vector3, end: Vector3, box: Box3): boolean {
  let entry = 0;
  let exit = 1;
  for (const axis of AXES) {
    const delta = end[axis] - start[axis];
    if (Math.abs(delta) < Number.EPSILON) {
      if (start[axis] < box.min[axis] || start[axis] > box.max[axis]) return false;
      continue;
    }
    const first = (box.min[axis] - start[axis]) / delta;
    const second = (box.max[axis] - start[axis]) / delta;
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
    if (entry > exit) return false;
  }
  return true;
}

/**
 * Validates the quantized geometry that will actually be serialized. Throws a
 * descriptive error so the generator can retry a candidate; never repairs or
 * mutates caller-owned poses. The source checks prevent a spike or collision
 * from disappearing when the model selects only 30 source frame pairs.
 *
 * Collision clearance is an oriented box expanded on each local axis. It is
 * checked at every stored pose and throughout straight camera/subject motion
 * between frames whose subject orientation is unchanged. Continuous rotating
 * box sweeps between stored poses are not certified by this discrete export.
 */
export function validateDatasetTrajectory(
  cameraFrames: readonly CameraParameters[],
  subjectInfo: SubjectInfo
): DatasetTrajectoryQualityMetrics {
  const policy = DATASET_TRAJECTORY_QUALITY_POLICY;
  const subjectFrames = subjectInfo.frames;
  if (
    cameraFrames.length < policy.referenceFrameCount ||
    subjectFrames?.length !== cameraFrames.length
  ) {
    throw new DatasetTrajectoryQualityError(
      "frame-count",
      `Expected matching camera/subject tracks with at least ${policy.referenceFrameCount} frames; got ${cameraFrames.length}/${subjectFrames?.length ?? 0}.`
    );
  }
  assertDimensions(subjectInfo.subject.dimensions, "Subject");
  if (subjectInfo.subject.attentionBox) {
    assertDimensions(subjectInfo.subject.attentionBox.dimensions, "Attention box");
    if (!isFiniteVector(subjectInfo.subject.attentionBox.position)) {
      throw new DatasetTrajectoryQualityError(
        "invalid-geometry", "Attention box position must be finite."
      );
    }
  }

  const { width, height, depth } = subjectInfo.subject.dimensions;
  const halfSize = new Vector3(width / 2, height / 2, depth / 2)
    .addScalar(policy.cameraClearanceSceneUnits);
  const localBox = new Box3(halfSize.clone().negate(), halfSize);
  const cameraRotations: Quaternion[] = [];
  let previousSubjectRotation: Quaternion | undefined;
  let previousLocalCamera: Vector3 | undefined;

  for (let index = 0; index < cameraFrames.length; index++) {
    const camera = cameraFrames[index];
    const subject = subjectFrames[index];
    if (
      !isFiniteVector(camera.position) || !isFiniteVector(camera.rotation) ||
      !isFiniteVector(subject.position) || !isFiniteVector(subject.rotation) ||
      !Number.isFinite(camera.focalLength) || camera.focalLength <= 0 ||
      !Number.isFinite(camera.aspectRatio) || camera.aspectRatio <= 0 ||
      camera.rotation.order !== "XYZ" || subject.rotation.order !== "XYZ"
    ) {
      throw new DatasetTrajectoryQualityError(
        "invalid-geometry",
        `Frame ${index} requires finite positions/XYZ rotations and positive finite optics.`,
        index
      );
    }
    const cameraRotation = new Quaternion().setFromEuler(camera.rotation);
    cameraRotations.push(cameraRotation);
    const subjectRotation = new Quaternion().setFromEuler(subject.rotation);
    const localCamera = camera.position.clone().sub(subject.position)
      .applyQuaternion(subjectRotation.clone().invert());
    const unchangedSubjectRotation = previousSubjectRotation &&
      1 - Math.abs(previousSubjectRotation.dot(subjectRotation)) < 1e-14;
    if (
      localBox.containsPoint(localCamera) ||
      (previousLocalCamera && unchangedSubjectRotation &&
        segmentIntersectsBox(previousLocalCamera, localCamera, localBox))
    ) {
      throw new DatasetTrajectoryQualityError(
        "camera-subject-collision",
        `Camera intersects the subject's oriented box or ${policy.cameraClearanceSceneUnits}-unit clearance at frame ${index}.`,
        index
      );
    }
    previousLocalCamera = localCamera;
    previousSubjectRotation = subjectRotation;
  }

  const metrics: DatasetTrajectoryQualityMetrics = {
    maxSourceTranslationPerTrainingStep: 0,
    maxSourceRotationPerTrainingStepRadians: 0,
    maxTrainingTranslation: 0,
    maxTrainingAcceleration: 0,
    maxTrainingRotationRadians: 0,
  };
  const sourceStepDuration = (policy.referenceFrameCount - 1) / (cameraFrames.length - 1);
  for (let index = 1; index < cameraFrames.length; index++) {
    const distance = cameraFrames[index].position.distanceTo(cameraFrames[index - 1].position);
    const angle = cameraRotations[index].angleTo(cameraRotations[index - 1]);
    metrics.maxSourceTranslationPerTrainingStep = Math.max(
      metrics.maxSourceTranslationPerTrainingStep, distance / sourceStepDuration
    );
    metrics.maxSourceRotationPerTrainingStepRadians = Math.max(
      metrics.maxSourceRotationPerTrainingStepRadians, angle / sourceStepDuration
    );
    if (distance > policy.maxTranslationPerTrainingStep * sourceStepDuration +
        policy.translationQuantizationTolerance) {
      throw new DatasetTrajectoryQualityError(
        "source-translation", `Camera position jumps too far at frame ${index}.`, index
      );
    }
    if (angle > policy.maxRotationPerTrainingStepRadians * sourceStepDuration +
        policy.rotationQuantizationToleranceRadians) {
      throw new DatasetTrajectoryQualityError(
        "source-rotation", `Camera orientation jumps too far at frame ${index}.`, index
      );
    }
  }

  // Same nearest paired-frame selection as LensCraft's default loader. With
  // 30 output frames the denominator is odd (29), so there are no .5 ties
  // where Python/PyTorch's ties-to-even rounding could differ from Math.round.
  const indices = Array.from({ length: policy.referenceFrameCount }, (_, index) =>
    Math.round(index * (cameraFrames.length - 1) / (policy.referenceFrameCount - 1))
  );
  let previousVelocity: Vector3 | undefined;
  for (let step = 1; step < indices.length; step++) {
    const index = indices[step];
    const previousIndex = indices[step - 1];
    const velocity = cameraFrames[index].position.clone()
      .sub(cameraFrames[previousIndex].position);
    const distance = velocity.length();
    const angle = cameraRotations[index].angleTo(cameraRotations[previousIndex]);
    metrics.maxTrainingTranslation = Math.max(metrics.maxTrainingTranslation, distance);
    metrics.maxTrainingRotationRadians = Math.max(metrics.maxTrainingRotationRadians, angle);
    if (distance > policy.maxTranslationPerTrainingStep + policy.translationQuantizationTolerance) {
      throw new DatasetTrajectoryQualityError(
        "training-translation", `Selected model step ${step} translates too far.`, index
      );
    }
    if (angle > policy.maxRotationPerTrainingStepRadians + policy.rotationQuantizationToleranceRadians) {
      throw new DatasetTrajectoryQualityError(
        "training-rotation", `Selected model step ${step} rotates too far.`, index
      );
    }
    if (previousVelocity) {
      const acceleration = velocity.distanceTo(previousVelocity);
      metrics.maxTrainingAcceleration = Math.max(metrics.maxTrainingAcceleration, acceleration);
      if (acceleration > policy.maxAccelerationPerTrainingStepSquared +
          policy.accelerationQuantizationTolerance) {
        throw new DatasetTrajectoryQualityError(
          "training-acceleration", `Selected model step ${step} changes velocity too sharply.`, index
        );
      }
    }
    previousVelocity = velocity;
  }
  return metrics;
}
