import * as THREE from "three";
import { SubjectDimensions, SubjectFrame } from "@/service/subjects/types";
import { fixSubjectInView } from "../framing";
import {
  CameraParameters,
  LockedMovement,
  LockedRotation,
  ConstraintsConfig,
  SubjectInFramePosition,
} from "@/service/simulation/instruction/types";

function handleLockedMovement(
  currentParams: CameraParameters,
  referenceParams: CameraParameters,
  lockedMovement: LockedMovement
): THREE.Vector3 {
  const forward = new THREE.Vector3(0, 0, -1).applyEuler(
    currentParams.rotation
  );
  const right = new THREE.Vector3(1, 0, 0).applyEuler(currentParams.rotation);
  const up = new THREE.Vector3(0, 1, 0).applyEuler(currentParams.rotation);

  const movementVector = currentParams.position
    .clone()
    .sub(referenceParams.position);

  let allowedMovement = new THREE.Vector3();

  const forwardComponent = forward
    .clone()
    .multiplyScalar(movementVector.dot(forward));
  if (!lockedMovement.forward && forwardComponent.dot(forward) < 0) {
    allowedMovement.add(forwardComponent);
  }
  if (!lockedMovement.backward && forwardComponent.dot(forward) > 0) {
    allowedMovement.add(forwardComponent);
  }

  const rightComponent = right
    .clone()
    .multiplyScalar(movementVector.dot(right));
  if (!lockedMovement.right && rightComponent.dot(right) > 0) {
    allowedMovement.add(rightComponent);
  }
  if (!lockedMovement.left && rightComponent.dot(right) < 0) {
    allowedMovement.add(rightComponent);
  }

  const upComponent = up.clone().multiplyScalar(movementVector.dot(up));
  if (!lockedMovement.up && upComponent.dot(up) > 0) {
    allowedMovement.add(upComponent);
  }
  if (!lockedMovement.down && upComponent.dot(up) < 0) {
    allowedMovement.add(upComponent);
  }

  return referenceParams.position.clone().add(allowedMovement);
}

function handleLockedRotation(
  currentParams: CameraParameters,
  referenceParams: CameraParameters,
  lockedRotation: LockedRotation
): THREE.Euler {
  const currentAngles = {
    x: currentParams.rotation.x,
    y: currentParams.rotation.y,
    z: currentParams.rotation.z,
  };
  const referenceAngles = {
    x: referenceParams.rotation.x,
    y: referenceParams.rotation.y,
    z: referenceParams.rotation.z,
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
  subjectInFramePosition?: SubjectInFramePosition
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
    const refDistance = referenceParams.position.distanceTo(
      subjectFrame.position
    );
    const currentDir = updatedParams.position
      .clone()
      .sub(subjectFrame.position)
      .normalize();
    updatedParams.position = subjectFrame.position
      .clone()
      .add(currentDir.multiplyScalar(refDistance));
  }
  if (staticCameraSubjectRotation && subjectFrame) {
    const lookAtMatrix = new THREE.Matrix4();
    lookAtMatrix.lookAt(
      updatedParams.position,
      subjectFrame.position,
      new THREE.Vector3(0, 1, 0)
    );
    updatedParams.rotation.setFromRotationMatrix(lookAtMatrix);
  }
  if (allFramesVisibility && subjectFrame) {
    fixSubjectInView(
      updatedParams,
      subjectFrame.position,
      subjectFrame.rotation,
      subjectDimensions,
      subjectInFramePosition
    );
  }
  return updatedParams;
}
