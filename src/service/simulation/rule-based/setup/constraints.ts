import * as THREE from "three";
import { SubjectDimensions, SubjectFrame } from "@/service/subjects/types";
import { fixSubjectInView } from "./framing";
import {
  CameraParameters,
  LockedMovement,
  LockedRotation,
  ConstraintsConfig,
  SubjectInFramePosition,
} from "@/service/simulation/instruction/types";
import { MIN_CAMERA_HEIGHT } from "../../constants";

function positionAtDistanceAboveFloor(
  subjectPosition: THREE.Vector3,
  direction: THREE.Vector3,
  distance: number
): THREE.Vector3 {
  const normalizedDirection = direction.clone().normalize();
  const result = subjectPosition
    .clone()
    .add(normalizedDirection.clone().multiplyScalar(distance));
  if (result.y >= MIN_CAMERA_HEIGHT) return result;

  const verticalDistance = Math.max(
    MIN_CAMERA_HEIGHT - subjectPosition.y,
    -distance
  );
  const horizontalDistance = Math.sqrt(
    Math.max(0, distance * distance - verticalDistance * verticalDistance)
  );
  const horizontalDirection = new THREE.Vector3(
    normalizedDirection.x,
    0,
    normalizedDirection.z
  );
  if (horizontalDirection.lengthSq() < 1e-8) horizontalDirection.set(0, 0, 1);
  horizontalDirection.normalize().multiplyScalar(horizontalDistance);

  return subjectPosition
    .clone()
    .add(horizontalDirection)
    .add(new THREE.Vector3(0, verticalDistance, 0));
}

function handleLockedMovement(
  currentParams: CameraParameters,
  referenceParams: CameraParameters,
  lockedMovement: LockedMovement
): THREE.Vector3 {
  const referenceQuaternion = new THREE.Quaternion().setFromEuler(
    referenceParams.rotation
  );
  const forward = new THREE.Vector3(0, 0, -1)
    .applyQuaternion(referenceQuaternion)
    .normalize();
  const right = new THREE.Vector3(1, 0, 0)
    .applyQuaternion(referenceQuaternion)
    .normalize();
  const up = new THREE.Vector3(0, 1, 0)
    .applyQuaternion(referenceQuaternion)
    .normalize();

  const movementVector = currentParams.position
    .clone()
    .sub(referenceParams.position);

  let allowedMovement = new THREE.Vector3();

  const forwardAmount = movementVector.dot(forward);
  if (
    (forwardAmount > 0 && !lockedMovement.forward) ||
    (forwardAmount < 0 && !lockedMovement.backward)
  ) {
    allowedMovement.addScaledVector(forward, forwardAmount);
  }

  const rightAmount = movementVector.dot(right);
  if (
    (rightAmount > 0 && !lockedMovement.right) ||
    (rightAmount < 0 && !lockedMovement.left)
  ) {
    allowedMovement.addScaledVector(right, rightAmount);
  }

  const upAmount = movementVector.dot(up);
  if (
    (upAmount > 0 && !lockedMovement.up) ||
    (upAmount < 0 && !lockedMovement.down)
  ) {
    allowedMovement.addScaledVector(up, upAmount);
  }

  return referenceParams.position.clone().add(allowedMovement);
}

function handleLockedRotation(
  currentParams: CameraParameters,
  referenceParams: CameraParameters,
  lockedRotation: LockedRotation
): THREE.Euler {
  const normalizeDelta = (value: number): number =>
    THREE.MathUtils.euclideanModulo(value + Math.PI, Math.PI * 2) - Math.PI;
  const referenceAngles = referenceParams.rotation;
  const currentAngles = {
    x: referenceAngles.x +
      normalizeDelta(currentParams.rotation.x - referenceAngles.x),
    y: referenceAngles.y +
      normalizeDelta(currentParams.rotation.y - referenceAngles.y),
    z: referenceAngles.z +
      normalizeDelta(currentParams.rotation.z - referenceAngles.z),
  };

  if (
    (lockedRotation.up && currentAngles.x > referenceAngles.x) ||
    (lockedRotation.down && currentAngles.x < referenceAngles.x)
  ) {
    currentAngles.x = referenceAngles.x;
  }

  if (
    (lockedRotation.left && currentAngles.y > referenceAngles.y) ||
    (lockedRotation.right && currentAngles.y < referenceAngles.y)
  ) {
    currentAngles.y = referenceAngles.y;
  }

  if (
    (lockedRotation.rollClockwise && currentAngles.z < referenceAngles.z) ||
    (lockedRotation.rollNonClockwise && currentAngles.z > referenceAngles.z)
  ) {
    currentAngles.z = referenceAngles.z;
  }

  return new THREE.Euler(currentAngles.x, currentAngles.y, currentAngles.z);
}

export function applyConstraintsOnFrame(
  currentParams: CameraParameters,
  referenceParams: CameraParameters,
  constraints?: ConstraintsConfig,
  subjectFrame?: SubjectFrame,
  subjectDimensions?: SubjectDimensions,
  subjectInFramePosition?: SubjectInFramePosition,
  referenceSubjectFrame?: SubjectFrame
): CameraParameters {
  if (!constraints) return currentParams;
  const updatedParams: CameraParameters = {
    position: currentParams.position.clone(),
    rotation: currentParams.rotation.clone(),
    focalLength: currentParams.focalLength,
    aspectRatio: currentParams.aspectRatio,
  };
  const {
    lockedMovement,
    lockedRotation,
    staticDistance,
    staticCameraSubjectRotation,
    allFramesVisibility,
  } = constraints;

  if (lockedMovement) {
    updatedParams.position = handleLockedMovement(
      currentParams,
      referenceParams,
      lockedMovement
    );
  }

  if (lockedRotation) {
    updatedParams.rotation = handleLockedRotation(
      currentParams,
      referenceParams,
      lockedRotation
    );
  }

  if (staticDistance && subjectFrame) {
    const previousSubjectPosition =
      referenceSubjectFrame?.position ?? subjectFrame.position;
    const refDistance = referenceParams.position.distanceTo(
      previousSubjectPosition
    );
    let currentDir = updatedParams.position.clone().sub(subjectFrame.position);
    if (currentDir.lengthSq() < 1e-8) {
      currentDir = referenceParams.position
        .clone()
        .sub(previousSubjectPosition);
    }
    updatedParams.position = positionAtDistanceAboveFloor(
      subjectFrame.position,
      currentDir,
      refDistance
    );
  }

  if (
    staticCameraSubjectRotation &&
    subjectFrame &&
    referenceSubjectFrame
  ) {
    const referenceSubjectQuaternion = new THREE.Quaternion().setFromEuler(
      referenceSubjectFrame.rotation
    );
    const relativeCameraQuaternion = referenceSubjectQuaternion
      .clone()
      .invert()
      .multiply(
        new THREE.Quaternion().setFromEuler(referenceParams.rotation)
      );
    const currentSubjectQuaternion = new THREE.Quaternion().setFromEuler(
      subjectFrame.rotation
    );
    updatedParams.rotation.setFromQuaternion(
      currentSubjectQuaternion.multiply(relativeCameraQuaternion)
    );
  }

  if (!allFramesVisibility || !subjectFrame) {
    updatedParams.position.y = Math.max(
      MIN_CAMERA_HEIGHT,
      updatedParams.position.y
    );
    return updatedParams;
  }

  return fixSubjectInView(
    updatedParams,
    subjectFrame.position,
    subjectDimensions,
    subjectInFramePosition,
    subjectFrame.rotation,
    true,
    // A Track/Arc establishes a conservative visible radius on its first
    // frame, then preserves that radius.  Allowing the visibility solver to
    // change distance on every later frame contradicted staticDistance and
    // turned an orbit into an irregular push/pull.
    !staticDistance || referenceParams === currentParams
  );
}
