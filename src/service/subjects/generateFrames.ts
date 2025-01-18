import * as THREE from "three";
import { Subject, SubjectFrame } from "./types";
import { DEFAULT_FRAME_COUNT } from "../simulation/constants";

export type MovementGenerator = (
  subject: Subject,
  index: number,
  totalSubjects: number
) => SubjectFrame[];

export function generateCircularMotion(
  subject: Subject,
  index: number,
  totalSubjects: number
): SubjectFrame[] {
  const CIRCLE_RADIUS = 5;
  const frames: SubjectFrame[] = [];
  const angleOffset = (2 * Math.PI * index) / totalSubjects;

  for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
    const angle = (2 * Math.PI * frame) / DEFAULT_FRAME_COUNT + angleOffset;
    const x = CIRCLE_RADIUS * Math.cos(angle);
    const z = CIRCLE_RADIUS * Math.sin(angle);
    const y = subject.dimensions.height / 2;

    frames.push({
      position: new THREE.Vector3(x, y, z),
      rotation: new THREE.Euler(0, angle, 0),
    });
  }

  return frames;
}

export function generateZigzagMotion(
  subject: Subject,
  index: number,
  totalSubjects: number
): SubjectFrame[] {
  const frames: SubjectFrame[] = [];
  const ZIGZAG_WIDTH = 4;
  const ZIGZAG_LENGTH = 8;
  const startZ = -ZIGZAG_LENGTH / 2 + (ZIGZAG_LENGTH * index) / totalSubjects;

  for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
    const progress = frame / DEFAULT_FRAME_COUNT;
    const z = startZ + progress * ZIGZAG_LENGTH;
    const x = ZIGZAG_WIDTH * Math.sin(progress * 6 * Math.PI);
    const y = subject.dimensions.height;

    frames.push({
      position: new THREE.Vector3(x, y, z),
      rotation: new THREE.Euler(
        0,
        Math.atan2(
          Math.cos(progress * 6 * Math.PI) * 6 * Math.PI * ZIGZAG_WIDTH,
          ZIGZAG_LENGTH
        ),
        0
      ),
    });
  }

  return frames;
}

export function generateLinearMotion(
  subject: Subject,
  index: number,
  totalSubjects: number
): SubjectFrame[] {
  const frames: SubjectFrame[] = [];
  const START_RADIUS = 8;
  const angleOffset = (2 * Math.PI * index) / totalSubjects;

  const startX = START_RADIUS * Math.cos(angleOffset);
  const startZ = START_RADIUS * Math.sin(angleOffset);
  const endX = -startX;
  const endZ = -startZ;

  for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
    const progress = frame / DEFAULT_FRAME_COUNT;
    const x = startX + (endX - startX) * progress;
    const z = startZ + (endZ - startZ) * progress;
    const y = subject.dimensions.height / 2;

    frames.push({
      position: new THREE.Vector3(x, y, z),
      rotation: new THREE.Euler(0, Math.atan2(endZ - startZ, endX - startX), 0),
    });
  }

  return frames;
}

export function generateSpiralMotion(
  subject: Subject,
  index: number,
  totalSubjects: number
): SubjectFrame[] {
  const frames: SubjectFrame[] = [];
  const MAX_RADIUS = 6;
  const SPIRAL_TURNS = 2;
  const angleOffset = (2 * Math.PI * index) / totalSubjects;

  for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
    const progress = frame / DEFAULT_FRAME_COUNT;
    const angle = progress * SPIRAL_TURNS * 2 * Math.PI + angleOffset;
    const radius = progress * MAX_RADIUS;

    frames.push({
      position: new THREE.Vector3(
        radius * Math.cos(angle),
        subject.dimensions.height / 2,
        radius * Math.sin(angle)
      ),
      rotation: new THREE.Euler(0, angle + Math.PI / 2, 0),
    });
  }

  return frames;
}

export const movementGenerators: Record<string, MovementGenerator> = {
  circular: generateCircularMotion,
  zigzag: generateZigzagMotion,
  linear: generateLinearMotion,
  spiral: generateSpiralMotion,
};

export function generateFrames(
  subjects: Subject[],
  movements: Record<string, string>
): SubjectFrame[][] {
  return subjects.map((subject, index) => {
    const movementType = movements[subject.id] || "circular";
    const generator = movementGenerators[movementType];
    return generator(subject, index, subjects.length);
  });
}
