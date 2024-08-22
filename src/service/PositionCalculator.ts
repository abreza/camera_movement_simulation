import {
  CameraFrame,
  CinematographyInstruction,
  CameraAngle,
  ShotType,
  CameraMovement,
  Subject,
} from "@/types/simulation";
import * as THREE from "three";

export function calculateCameraPositions(
  subjects: Subject[],
  instructions: CinematographyInstruction[],
  initialPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 10),
  initialLookAt: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
): CameraFrame[] {
  const frames: CameraFrame[] = [];
  let currentPosition = initialPosition.clone();
  let currentLookAt = initialLookAt.clone();

  for (const instruction of instructions) {
    const startPosition =
      instruction.startPosition?.clone() || currentPosition.clone();
    const startLookAt =
      instruction.startLookAt?.clone() || currentLookAt.clone();
    const endPosition =
      instruction.endPosition?.clone() ||
      calculateEndPosition(subjects, instruction, startPosition);
    const endLookAt =
      instruction.endLookAt?.clone() ||
      subjects[instruction.subjectIndex].position.clone();

    for (let frame = 0; frame < instruction.frameCount; frame++) {
      const progress = frame / (instruction.frameCount - 1);
      const position = new THREE.Vector3().lerpVectors(
        startPosition,
        endPosition,
        progress
      );
      const lookAt = new THREE.Vector3().lerpVectors(
        startLookAt,
        endLookAt,
        progress
      );
      frames.push({ position, lookAt });
    }

    currentPosition = endPosition;
    currentLookAt = endLookAt;
  }

  return frames;
}

function calculateEndPosition(
  subjects: Subject[],
  instruction: CinematographyInstruction,
  startPosition: THREE.Vector3
): THREE.Vector3 {
  const subjectPosition = subjects[instruction.subjectIndex].position;
  const subjectSize = subjects[instruction.subjectIndex].size;

  switch (instruction.cameraMovement) {
    case CameraMovement.Dolly:
      return subjectPosition
        .clone()
        .add(new THREE.Vector3(0, 0, -subjectSize.z));
    case CameraMovement.Truck:
      return startPosition.clone().add(new THREE.Vector3(subjectSize.x, 0, 0));
    case CameraMovement.Pedestal:
      return startPosition.clone().add(new THREE.Vector3(0, subjectSize.y, 0));
    case CameraMovement.ArcShot:
      return calculateArcShotPosition(subjectPosition, startPosition, 0.25);
    default:
      return calculatePositionBasedOnShotType(
        instruction.shotType,
        subjectPosition,
        subjectSize
      );
  }
}

function calculatePositionBasedOnShotType(
  shotType: ShotType | undefined,
  subjectPosition: THREE.Vector3,
  subjectSize: THREE.Vector3
): THREE.Vector3 {
  switch (shotType) {
    case ShotType.ExtremeCloseUp:
      return subjectPosition
        .clone()
        .add(new THREE.Vector3(0, 0, subjectSize.z * 0.1));
    case ShotType.CloseUp:
      return subjectPosition
        .clone()
        .add(new THREE.Vector3(0, 0, subjectSize.z * 0.5));
    case ShotType.MediumShot:
      return subjectPosition
        .clone()
        .add(new THREE.Vector3(0, 0, subjectSize.z * 2));
    case ShotType.LongShot:
      return subjectPosition
        .clone()
        .add(new THREE.Vector3(0, 0, subjectSize.z * 5));
    case ShotType.ExtremeLongShot:
      return subjectPosition
        .clone()
        .add(new THREE.Vector3(0, 0, subjectSize.z * 10));
    default:
      return subjectPosition
        .clone()
        .add(new THREE.Vector3(0, 0, subjectSize.z * 3));
  }
}

function calculateArcShotPosition(
  subjectPosition: THREE.Vector3,
  startPosition: THREE.Vector3,
  progress: number
): THREE.Vector3 {
  const radius = startPosition.distanceTo(subjectPosition);
  const angle = Math.PI * 2 * progress;
  return new THREE.Vector3(
    subjectPosition.x + radius * Math.cos(angle),
    startPosition.y,
    subjectPosition.z + radius * Math.sin(angle)
  );
}
