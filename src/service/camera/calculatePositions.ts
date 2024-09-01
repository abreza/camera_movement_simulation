import {
  CameraAngle,
  CameraFrame,
  CinematographyInstruction,
  Subject,
} from "@/types/simulation";
import { applyTransitions } from "./applyTransitions";
import { processInstruction } from "./processInstructions";
import { getSubjectCenter, lookAt } from "./utils";
import { calculateTargetPosition } from "./calculateTarget";

const TRANSITION_FRAMES = 20;

export function calculateCameraPositions(
  subjects: Subject[],
  instructions: CinematographyInstruction[],
  initialCamera: CameraFrame
): CameraFrame[] {
  let frames: CameraFrame[] = [];
  let currentPosition = initialCamera.position.clone();
  let currentAngle = initialCamera.angle.clone();
  let currentFocalLength = initialCamera.focalLength;

  for (const instruction of instructions) {
    const subject = subjects[instruction.subjectIndex];
    let { position: targetPosition, focalLength: targetFocalLength } =
      calculateTargetPosition(
        subject,
        instruction.cameraAngle,
        instruction.shotType,
        instruction.endFocalLength || currentFocalLength
      );

    if (instruction.endPosition)
      targetPosition = instruction.endPosition.clone();
    if (instruction.startPosition)
      currentPosition = instruction.startPosition.clone();
    if (instruction.startFocalLength)
      currentFocalLength = instruction.startFocalLength;

    const subjectCenter = getSubjectCenter(subject);
    const targetAngle = lookAt(targetPosition, subjectCenter);

    if (instruction.cameraAngle === CameraAngle.DutchAngle) {
      targetAngle.z = Math.PI / 12;
    }

    frames = frames.concat(
      processInstruction(
        instruction,
        currentPosition,
        targetPosition,
        currentAngle,
        targetAngle,
        currentFocalLength,
        targetFocalLength,
        subject
      )
    );

    if (frames.length) {
      currentPosition = frames[frames.length - 1].position;
      currentAngle = frames[frames.length - 1].angle;
      currentFocalLength = frames[frames.length - 1].focalLength;
    }
  }

  return applyTransitions(frames, instructions, TRANSITION_FRAMES);
}
