import {
  CameraFrame,
  CinematographyInstruction,
  Subject,
} from "@/types/simulation";
import { calculateEaseValue } from "./calculateEasing";
import { getInitialCameraPositionAndAngle } from "./getInitialCameraPositionAndAngle";
import { applyCameraMovement } from "./applyCameraMovement";

export function calculateCameraPositions(
  subjects: Subject[],
  instructions: CinematographyInstruction[],
  initialCamera: CameraFrame
): CameraFrame[] {
  let cameraFrames: CameraFrame[] = [initialCamera];
  let currentCamera = initialCamera;

  for (const instruction of instructions) {
    let subject: Subject | undefined;
    if (instruction.subjectIndex !== undefined) {
      subject = subjects[instruction.subjectIndex];
    }
    const startCamera = { ...currentCamera };

    if (
      subject &&
      instruction.initialCameraAngle &&
      instruction.initialShotType
    ) {
      const initialSetup = getInitialCameraPositionAndAngle(
        subject,
        instruction.initialCameraAngle,
        instruction.initialShotType
      );
      startCamera.position = initialSetup.position;
      startCamera.angle = initialSetup.angle;
    }

    for (let frame = 0; frame < instruction.frameCount; frame++) {
      const easeValue = calculateEaseValue(
        frame / (instruction.frameCount - 1),
        instruction.movementEasing
      );

      currentCamera = applyCameraMovement(
        startCamera,
        instruction.cameraMovement,
        easeValue,
        subject
      );

      cameraFrames.push(currentCamera);
    }
  }

  return cameraFrames;
}
