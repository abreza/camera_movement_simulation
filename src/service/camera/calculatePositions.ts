import {
  CameraAngle,
  CameraFrame,
  CinematographyInstruction,
  Subject,
} from "@/types/simulation";
import { Vector3, Euler } from "three";
import { calculateTargetPosition } from "./calculateTarget";
import { getSubjectCenter, lerp, lookAt } from "./utils";
import { applyCameraMovement } from "./applyMovement";

export function calculateCameraPositions(
  subjects: Subject[],
  instructions: CinematographyInstruction[],
  initialCamera: CameraFrame
): CameraFrame[] {
  const frames: CameraFrame[] = [];
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
    console.log(subject, subjectCenter);

    if (instruction.cameraAngle === CameraAngle.DutchAngle) {
      targetAngle.z = Math.PI / 12;
    }

    for (let i = 0; i < instruction.frameCount; i++) {
      const t = i / instruction.frameCount;
      const easedT = instruction.easeFunction
        ? instruction.easeFunction(t)
        : t * t;

      let framePosition = new Vector3().lerpVectors(
        currentPosition,
        targetPosition,
        easedT
      );
      let frameAngle = new Euler(
        lerp(currentAngle.x, targetAngle.x, easedT),
        lerp(currentAngle.y, targetAngle.y, easedT),
        lerp(currentAngle.z, targetAngle.z, easedT)
      );
      let frameFocalLength = lerp(
        currentFocalLength,
        targetFocalLength,
        easedT
      );

      const frameData = applyCameraMovement(
        framePosition,
        frameAngle,
        frameFocalLength,
        currentPosition,
        targetPosition,
        currentAngle,
        targetAngle,
        currentFocalLength,
        targetFocalLength,
        subject,
        instruction.cameraMovement,
        easedT
      );

      frames.push({
        position: frameData.position,
        angle: frameData.angle,
        focalLength: frameData.focalLength,
      });
    }

    currentPosition = targetPosition;
    currentAngle = targetAngle;
    currentFocalLength = targetFocalLength;
  }

  return frames;
}
