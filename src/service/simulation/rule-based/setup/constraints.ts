import { CameraParameters, ConstraintsConfig } from "../../instruction/types";

export function applyLockedMovementAndRotationOnEndFrame(
  endParams: CameraParameters,
  startParams: CameraParameters,
  constraints?: ConstraintsConfig
): CameraParameters {
  if (!constraints) return endParams;

  const { lockedMovement, lockedRotation } = constraints;

  if (lockedMovement) {
    if (lockedMovement.left || lockedMovement.right) {
      endParams.position.x = startParams.position.x;
    }

    if (lockedMovement.up || lockedMovement.down) {
      endParams.position.y = startParams.position.y;
    }

    if (lockedMovement.forward || lockedMovement.backward) {
      endParams.position.z = startParams.position.z;
    }
  }

  if (lockedRotation) {
    if (lockedRotation.left || lockedRotation.right) {
      endParams.rotation.y = startParams.rotation.y;
    }

    if (lockedRotation.up || lockedRotation.down) {
      endParams.rotation.x = startParams.rotation.x;
    }

    if (lockedRotation.rollClockwise || lockedRotation.rollNonClockwise) {
      endParams.rotation.z = startParams.rotation.z;
    }
  }

  return endParams;
}
