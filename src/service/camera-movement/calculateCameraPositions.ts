import {
  CameraFrame,
  CinematographyInstruction,
  Subject,
} from "@/types/simulation";
import * as THREE from "three";
import { calculateKeyframes } from "./keyframeCalculator";
import { easeInOutCubic } from "./utils";

export function calculateCameraPositions(
  subjects: Subject[],
  instructions: CinematographyInstruction[],
  initialPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 10),
  initialAngle: THREE.Euler = new THREE.Euler(0, 0, 0),
  initialFocalLength: number = 50
): CameraFrame[] {
  const frames: CameraFrame[] = [];
  let currentPosition = initialPosition.clone();
  let currentAngle = initialAngle.clone();
  let currentFocalLength = initialFocalLength;

  for (const instruction of instructions) {
    const subject = subjects[instruction.subjectIndex];
    const { startFrame, endFrame } = calculateKeyframes(
      instruction,
      currentPosition,
      currentAngle,
      currentFocalLength,
      subject
    );

    for (let frame = 0; frame < instruction.frameCount; frame++) {
      const progress = frame / (instruction.frameCount - 1);
      const easedProgress = easeInOutCubic(progress);

      const position = new THREE.Vector3().lerpVectors(
        startFrame.position,
        endFrame.position,
        easedProgress
      );

      const angle = new THREE.Euler().setFromQuaternion(
        new THREE.Quaternion().slerpQuaternions(
          new THREE.Quaternion().setFromEuler(startFrame.angle),
          new THREE.Quaternion().setFromEuler(endFrame.angle),
          easedProgress
        )
      );

      const focalLength = THREE.MathUtils.lerp(
        startFrame.focalLength,
        endFrame.focalLength,
        easedProgress
      );

      frames.push({ position, angle, focalLength });
    }

    currentPosition = endFrame.position;
    currentAngle = endFrame.angle;
    currentFocalLength = endFrame.focalLength;
  }

  return frames;
}
