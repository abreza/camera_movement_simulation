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
  currentAngle: THREE.Euler,
  currentFocalLength: number,
  subject: Subject
): {
  startFrame: CameraFrame;
  endFrame: CameraFrame;
} {
  const startPosition =
    instruction.startPosition?.clone() || currentPosition.clone();
  const startAngle = instruction.startAngle?.clone() || currentAngle.clone();
  const startFocalLength = instruction.startFocalLength || currentFocalLength;

  let endPosition = instruction.endPosition?.clone() || startPosition.clone();
  let endAngle = instruction.endAngle?.clone() || startAngle.clone();
  let endFocalLength = instruction.endFocalLength || startFocalLength;

  applyMovement(
    instruction,
    subject,
    startPosition,
    startAngle,
    endPosition,
    endAngle,
    startFocalLength,
    endFocalLength
  );

  applyCameraAngle(instruction.cameraAngle, subject, endPosition, endAngle);

  applyShotType(
    instruction.shotType,
    subject,
    endPosition,
    endAngle,
    endFocalLength
  );

  return {
    startFrame: {
      position: startPosition,
      angle: startAngle,
      focalLength: startFocalLength,
    },
    endFrame: {
      position: endPosition,
      angle: endAngle,
      focalLength: endFocalLength,
    },
  };
}
