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
  initialLookAt: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
  initialFocalLength: number = 50
): CameraFrame[] {
  const frames: CameraFrame[] = [];
  let currentPosition = initialPosition.clone();
  let currentLookAt = initialLookAt.clone();
  let currentFocalLength = initialFocalLength;
  let currentRotation = new THREE.Euler();

  for (const instruction of instructions) {
    const subject = subjects[instruction.subjectIndex];
    const { startFrame, endFrame } = calculateKeyframes(
      instruction,
      currentPosition,
      currentLookAt,
      currentFocalLength,
      currentRotation,
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
      const lookAt = new THREE.Vector3().lerpVectors(
        startFrame.lookAt,
        endFrame.lookAt,
        easedProgress
      );
      const focalLength = THREE.MathUtils.lerp(
        startFrame.focalLength,
        endFrame.focalLength,
        easedProgress
      );
      const rotation = new THREE.Euler().setFromQuaternion(
        new THREE.Quaternion().slerpQuaternions(
          new THREE.Quaternion().setFromEuler(startFrame.rotation),
          new THREE.Quaternion().setFromEuler(endFrame.rotation),
          easedProgress
        )
      );

      frames.push({ position, lookAt, focalLength, rotation });
    }

    currentPosition = endFrame.position;
    currentLookAt = endFrame.lookAt;
    currentFocalLength = endFrame.focalLength;
    currentRotation = endFrame.rotation;
  }

  return frames;
}
