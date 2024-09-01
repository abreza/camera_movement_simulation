import {
  CinematographyInstruction,
  Subject,
  CameraFrame,
} from "@/types/simulation";
import * as THREE from "three";
import { applyMovement } from "./movementApplier";
import { applyCameraAngle } from "./cameraAngleApplier";
import { applyShotType } from "./shotTypeApplier";

export function calculateKeyframes(
  instruction: CinematographyInstruction,
  currentPosition: THREE.Vector3,
  currentLookAt: THREE.Vector3,
  currentFocalLength: number,
  currentRotation: THREE.Euler,
  subject: Subject
): {
  startFrame: CameraFrame & { rotation: THREE.Euler };
  endFrame: CameraFrame & { rotation: THREE.Euler };
} {
  const startPosition =
    instruction.startPosition?.clone() || currentPosition.clone();
  const startLookAt = instruction.startLookAt?.clone() || currentLookAt.clone();
  const startFocalLength = instruction.startFocalLength || currentFocalLength;
  const startRotation = currentRotation.clone();

  let endPosition = instruction.endPosition?.clone() || startPosition.clone();
  let endLookAt = instruction.endLookAt?.clone() || subject.position.clone();
  let endFocalLength = instruction.endFocalLength || startFocalLength;
  let endRotation = startRotation.clone();

  applyMovement(
    instruction,
    subject,
    startPosition,
    startLookAt,
    endPosition,
    endLookAt,
    endRotation,
    startFocalLength,
    endFocalLength
  );
  applyCameraAngle(
    instruction.cameraAngle,
    subject,
    endPosition,
    endLookAt,
    endRotation
  );
  applyShotType(
    instruction.shotType,
    subject,
    endPosition,
    endLookAt,
    endFocalLength
  );

  return {
    startFrame: {
      position: startPosition,
      lookAt: startLookAt,
      focalLength: startFocalLength,
      rotation: startRotation,
    },
    endFrame: {
      position: endPosition,
      lookAt: endLookAt,
      focalLength: endFocalLength,
      rotation: endRotation,
    },
  };
}
