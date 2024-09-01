import { CameraFrame, CinematographyInstruction } from "@/types/simulation";
import { Vector3, Euler } from "three";
import { lerp } from "./utils";

export function applyTransitions(
  frames: CameraFrame[],
  instructions: CinematographyInstruction[],
  transitionFrames: number
): CameraFrame[] {
  let processedFrames: CameraFrame[] = [];
  let frameIndex = 0;

  for (let i = 0; i < instructions.length; i++) {
    if (i > 0) {
      const prevFrame = processedFrames[processedFrames.length - 1];
      const currentFrame = frames[frameIndex];
      for (let j = 1; j <= transitionFrames; j++) {
        const t = j / (transitionFrames + 1);
        processedFrames.push({
          position: new Vector3().lerpVectors(
            prevFrame.position,
            currentFrame.position,
            t
          ),
          angle: new Euler(
            lerp(prevFrame.angle.x, currentFrame.angle.x, t),
            lerp(prevFrame.angle.y, currentFrame.angle.y, t),
            lerp(prevFrame.angle.z, currentFrame.angle.z, t)
          ),
          focalLength: lerp(prevFrame.focalLength, currentFrame.focalLength, t),
        });
      }
    }

    for (let j = 0; j < instructions[i].frameCount; j++) {
      processedFrames.push(frames[frameIndex]);
      frameIndex++;
    }
  }

  return processedFrames;
}
