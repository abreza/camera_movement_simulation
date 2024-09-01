import {
  CameraFrame,
  CinematographyInstruction,
  Subject,
} from "@/types/simulation";
import { Vector3, Euler } from "three";
import { lerp } from "./utils";
import { applyCameraMovement } from "./applyMovement";

export function processInstruction(
  instruction: CinematographyInstruction,
  currentPosition: Vector3,
  targetPosition: Vector3,
  currentAngle: Euler,
  targetAngle: Euler,
  currentFocalLength: number,
  targetFocalLength: number,
  subject: Subject
): CameraFrame[] {
  const frames: CameraFrame[] = [];

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
    let frameFocalLength = lerp(currentFocalLength, targetFocalLength, easedT);

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

  return frames;
}
