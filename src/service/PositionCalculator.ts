import {
  CameraFrame,
  Instruction,
  InstructionType,
  Subject,
} from "@/types/simulation";
import * as THREE from "three";

export function calculateCameraPositions(
  subjects: Subject[],
  instructions: Instruction[],
  initialPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 10),
  initialLookAt: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
): CameraFrame[] {
  const frames: CameraFrame[] = [];
  let currentPosition = initialPosition.clone();
  let currentLookAt = initialLookAt.clone();

  for (const instruction of instructions) {
    const startPosition = currentPosition.clone();
    const startLookAt = currentLookAt.clone();
    const endPosition = calculateEndPosition(
      subjects,
      instruction,
      startPosition
    );
    const endLookAt = subjects[instruction.subjectIndex].position.clone();

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
  instruction: Instruction,
  startPosition: THREE.Vector3
): THREE.Vector3 {
  const subjectPosition = subjects[instruction.subjectIndex].position;

  switch (instruction.type) {
    case InstructionType.zoomIn:
      return subjectPosition.clone().add(new THREE.Vector3(0, 0, 2));
    case InstructionType.zoomOut:
      return subjectPosition.clone().add(new THREE.Vector3(0, 0, 10));
    case InstructionType.moveAround:
      return calculateMoveAroundPosition(subjectPosition, startPosition, 1);
    default:
      throw new Error(`Unknown action: ${instruction.type}`);
  }
}

function calculateMoveAroundPosition(
  subjectPosition: THREE.Vector3,
  startPosition: THREE.Vector3,
  progress: number
): THREE.Vector3 {
  const radius = startPosition.distanceTo(subjectPosition);
  const angle = (Math.PI / 2) * progress;
  return new THREE.Vector3(
    subjectPosition.x + radius * Math.cos(angle),
    startPosition.y,
    subjectPosition.z + radius * Math.sin(angle)
  );
}
