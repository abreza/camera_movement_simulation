import { Quaternion, Vector3 } from "three";
import { CameraMovementType, ShotSize } from "../simulation/instruction/types";
import type { CameraParameters } from "../simulation/instruction/types";
import { calculateRegionOfInterest } from "../simulation/rule-based/setup/roi";
import type { SubjectInfo } from "../subjects/types";
import { DATASET_FLOAT_FACTOR } from "./simulationFormatter";

export type DatasetCameraMovementQualityReason =
  | "frame-count" | "invalid-geometry" | "unknown-movement"
  | "static-camera-motion" | "no-camera-motion"
  | "rotation-camera-translation" | "rotation-camera-no-rotation"
  | "translation-camera-rotation" | "translation-camera-no-translation"
  | "truck-direction" | "pedestal-direction" | "pedestal-nonvertical-motion"
  | "dolly-direction" | "dolly-no-relative-motion" | "arc-no-relative-motion";

export class DatasetCameraMovementQualityError extends Error {
  constructor(public readonly reason: DatasetCameraMovementQualityReason, message: string) {
    super(`Dataset camera movement ${reason}: ${message}`);
    this.name = "DatasetCameraMovementQualityError";
  }
}

export interface DatasetCameraMovementQualityMetrics {
  maxPositionExcursion: number;
  maxRotationExcursionRadians: number;
  maxSubjectLocalPositionExcursion: number;
  checkedInvariants: string[];
  dollyRangeChanges?: Partial<Record<ShotSize, number>>;
}

// This only absorbs floating-point subtraction/quaternion roundoff. It is far
// below the stored 0.001 position/Euler quantum, not a minimum motion amplitude.
const EPSILON = 1e-9;
const KNOWN_MOVEMENTS = new Set<string>(Object.values(CameraMovementType));

function fail(reason: DatasetCameraMovementQualityReason, message: string): never {
  throw new DatasetCameraMovementQualityError(reason, message);
}

function finiteVector(value: { x: number; y: number; z: number }): boolean {
  return !!value && [value.x, value.y, value.z].every(Number.isFinite);
}

function quaternionAngle(first: Quaternion, second: Quaternion): number {
  // Chord distance has no acos(dot) noise floor for equal orientations. q and
  // -q describe the same rotation, including equivalent Euler representations.
  const difference = Math.hypot(first.x-second.x, first.y-second.y, first.z-second.z, first.w-second.w);
  const sum = Math.hypot(first.x+second.x, first.y+second.y, first.z+second.z, first.w+second.w);
  return 4 * Math.asin(Math.min(1, Math.min(difference, sum) / 2));
}

/**
 * Necessary semantic checks on the EXACT decoded/quantized export geometry.
 * This complements trajectory/collision quality; it is not a complete motion
 * classifier, nor a certificate of the requested easing, framing or speed.
 * In particular Follow/Track may inherit body rotation and world translation.
 */
export function validateDatasetCameraMovement(
  cameraFrames: readonly CameraParameters[],
  subjectInfo: SubjectInfo,
  movementType: CameraMovementType
): DatasetCameraMovementQualityMetrics {
  const subjectFrames = subjectInfo.frames;
  if (cameraFrames.length < 2 || subjectFrames?.length !== cameraFrames.length) {
    fail("frame-count", "Matching camera and subject tracks need at least two frames.");
  }
  if (!KNOWN_MOVEMENTS.has(movementType)) fail("unknown-movement", String(movementType));
  for (let index = 0; index < cameraFrames.length; index++) {
    const camera = cameraFrames[index], body = subjectFrames[index];
    if (!finiteVector(camera.position) || !finiteVector(camera.rotation)
        || !finiteVector(body.position) || !finiteVector(body.rotation)
        || camera.rotation.order !== "XYZ" || body.rotation.order !== "XYZ") {
      fail("invalid-geometry", `Frame ${index} needs finite positions and XYZ rotations.`);
    }
  }
  const initial = cameraFrames[0];
  const initialRotation = new Quaternion().setFromEuler(initial.rotation);
  const relativeWorld = cameraFrames.map((camera, index) => camera.position.clone().sub(subjectFrames[index].position));
  const relativeLocal = relativeWorld.map((position, index) => position.clone()
    .applyQuaternion(new Quaternion().setFromEuler(subjectFrames[index].rotation).invert()));
  const metrics: DatasetCameraMovementQualityMetrics = {
    maxPositionExcursion: 0, maxRotationExcursionRadians: 0,
    maxSubjectLocalPositionExcursion: 0, checkedInvariants: [],
  };
  let maxWorldRelativeExcursion = 0;
  for (let index = 1; index < cameraFrames.length; index++) {
    metrics.maxPositionExcursion = Math.max(metrics.maxPositionExcursion,
      initial.position.distanceTo(cameraFrames[index].position));
    metrics.maxRotationExcursionRadians = Math.max(metrics.maxRotationExcursionRadians,
      quaternionAngle(initialRotation, new Quaternion().setFromEuler(cameraFrames[index].rotation)));
    metrics.maxSubjectLocalPositionExcursion = Math.max(metrics.maxSubjectLocalPositionExcursion,
      relativeLocal[0].distanceTo(relativeLocal[index]));
    maxWorldRelativeExcursion = Math.max(maxWorldRelativeExcursion,
      relativeWorld[0].distanceTo(relativeWorld[index]));
  }
  const translates = metrics.maxPositionExcursion > EPSILON;
  const rotates = metrics.maxRotationExcursionRadians > EPSILON;
  if (movementType === CameraMovementType.Static) {
    if (translates || rotates) fail("static-camera-motion", "A static camera must retain its world position and orientation, even when its subject moves.");
    metrics.checkedInvariants.push("static-world-camera-pose");
    return metrics;
  }
  if (!translates && !rotates) fail("no-camera-motion", "The nonstatic label has no position or orientation excursion after export quantization.");
  metrics.checkedInvariants.push("nonstatic-quantized-camera-excursion");

  const rotationOnly = [CameraMovementType.PanLeft, CameraMovementType.PanRight,
    CameraMovementType.TiltUp, CameraMovementType.TiltDown, CameraMovementType.DutchLeft, CameraMovementType.DutchRight];
  if (rotationOnly.includes(movementType)) {
    if (translates) fail("rotation-camera-translation", "Pan/Tilt/Roll rotates about a fixed world camera center; it is not a truck or orbit.");
    if (!rotates) fail("rotation-camera-no-rotation", "The rotation label has no exported orientation change.");
    metrics.checkedInvariants.push("fixed-world-center-with-rotation");
  }
  const truck = movementType === CameraMovementType.TruckLeft || movementType === CameraMovementType.TruckRight;
  const pedestal = movementType === CameraMovementType.PedestalUp || movementType === CameraMovementType.PedestalDown;
  if (truck || pedestal) {
    if (rotates) fail("translation-camera-rotation", "Truck/Pedestal must preserve camera orientation in the existing solver.");
    if (!translates) fail("translation-camera-no-translation", "The translation label has no exported camera displacement.");
    metrics.checkedInvariants.push("world-translation-with-fixed-orientation");
    const finalDisplacement = cameraFrames.at(-1)!.position.clone().sub(initial.position);
    // Direction tolerance follows endpoint position packing, without imposing
    // a minimum valid displacement or rejecting a sub-tolerance movement.
    const directionTolerance = 2 * Math.sqrt(3) / DATASET_FLOAT_FACTOR;
    if (truck) {
      const cameraRight = new Vector3(1, 0, 0).applyQuaternion(initialRotation);
      const signedTravel = finalDisplacement.dot(cameraRight)
        * (movementType === CameraMovementType.TruckRight ? 1 : -1);
      if (signedTravel < -directionTolerance) fail("truck-direction", "The exported translation clearly travels opposite the labelled initial camera-right direction.");
      metrics.checkedInvariants.push("truck-initial-camera-right-sign");
    }
    if (pedestal) {
      if (cameraFrames.some((camera) => Math.abs(camera.position.x-initial.position.x) > EPSILON
          || Math.abs(camera.position.z-initial.position.z) > EPSILON)) {
        fail("pedestal-nonvertical-motion", "A pedestal is a world-Y translation, not a pitched camera-up move.");
      }
      const signedTravel = finalDisplacement.y * (movementType === CameraMovementType.PedestalUp ? 1 : -1);
      if (signedTravel < -directionTolerance) fail("pedestal-direction", "The exported world-Y displacement clearly opposes the pedestal label.");
      metrics.checkedInvariants.push("pedestal-world-y-axis-and-sign");
    }
  }
  if (movementType === CameraMovementType.DollyIn || movementType === CameraMovementType.DollyOut) {
    if (metrics.maxSubjectLocalPositionExcursion <= EPSILON) {
      fail("dolly-no-relative-motion", "A body-following camera with unchanged subject-local position is not a dolly.");
    }
    // The public API has no shot-size token. A close dolly targets an upper
    // ROI rather than the body center, so reject only when EVERY supported
    // ROI endpoint range clearly changes in the wrong direction. This is a
    // conservative contradiction check, not proof of the exact optical path.
    const changes: Partial<Record<ShotSize, number>> = {};
    let maxRoiOffset = 0;
    const last = cameraFrames.length - 1;
    for (const shot of Object.values(ShotSize)) {
      const firstTarget = calculateRegionOfInterest(shot, subjectInfo.subject, subjectFrames[0]).regionOfInterest.position;
      const lastTarget = calculateRegionOfInterest(shot, subjectInfo.subject, subjectFrames[last]).regionOfInterest.position;
      if (!finiteVector(firstTarget) || !finiteVector(lastTarget)) fail("invalid-geometry", "A dolly ROI must be finite.");
      maxRoiOffset = Math.max(maxRoiOffset, firstTarget.distanceTo(subjectFrames[0].position), lastTarget.distanceTo(subjectFrames[last].position));
      changes[shot] = cameraFrames[last].position.distanceTo(lastTarget) - initial.position.distanceTo(firstTarget);
    }
    const tolerance = (4 * Math.sqrt(3) + 4 * maxRoiOffset) / DATASET_FLOAT_FACTOR;
    const sign = movementType === CameraMovementType.DollyIn ? 1 : -1;
    if (Object.values(changes).every((change) => sign * change! > tolerance)) {
      fail("dolly-direction", "Every supported subject/ROI endpoint range changes opposite the labelled dolly direction.");
    }
    metrics.dollyRangeChanges = changes;
    metrics.checkedInvariants.push("dolly-subject-local-excursion", "no-unanimous-opposite-roi-range-direction");
  }
  if (movementType === CameraMovementType.ArcLeft || movementType === CameraMovementType.ArcRight) {
    if (maxWorldRelativeExcursion <= EPSILON) fail("arc-no-relative-motion", "An arc needs camera displacement relative to the subject, not only inherited subject translation.");
    metrics.checkedInvariants.push("arc-subject-relative-position-excursion");
  }
  return metrics;
}
