import * as THREE from "three";
import { Subject, SubjectFrame } from "./types";
import { DEFAULT_FRAME_COUNT } from "../simulation/constants";

export type MovementGenerator = (
  subject: Subject,
  index: number,
  totalSubjects: number
) => SubjectFrame[];

export function addMovementNoise(
  frames: SubjectFrame[],
  noiseSettings: {
    positionAmplitude?: number;
    rotationAmplitude?: number;
    frequency?: number;
  } = {}
): SubjectFrame[] {
  const {
    positionAmplitude = 0.1,
    rotationAmplitude = 0.02,
    frequency = 0.5,
  } = noiseSettings;

  const seeds = {
    px: Math.random() * 100,
    py: Math.random() * 100,
    pz: Math.random() * 100,
    rx: Math.random() * 100,
    ry: Math.random() * 100,
    rz: Math.random() * 100,
  };

  return frames.map((frame, index) => {
    const noise = {
      px: Math.sin(index * frequency + seeds.px) * positionAmplitude,
      py: Math.sin(index * frequency + seeds.py) * positionAmplitude,
      pz: Math.sin(index * frequency + seeds.pz) * positionAmplitude,
      rx: Math.sin(index * frequency + seeds.rx) * rotationAmplitude,
      ry: Math.sin(index * frequency + seeds.ry) * rotationAmplitude,
      rz: Math.sin(index * frequency + seeds.rz) * rotationAmplitude,
    };

    return {
      position: new THREE.Vector3(
        frame.position.x + noise.px,
        frame.position.y + noise.py,
        frame.position.z + noise.pz
      ),
      rotation: new THREE.Euler(
        frame.rotation.x + noise.rx,
        frame.rotation.y + noise.ry,
        frame.rotation.z + noise.rz,
        frame.rotation.order
      ),
    };
  });
}

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
    const y = subject.dimensions.height / 2;

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

export function generateStaticMotion(
  subject: Subject,
  index: number,
  totalSubjects: number
): SubjectFrame[] {
  const frames: SubjectFrame[] = [];
  const CIRCLE_RADIUS = 5;

  const angle = (2 * Math.PI * index) / totalSubjects;
  const x = CIRCLE_RADIUS * Math.cos(angle);
  const z = CIRCLE_RADIUS * Math.sin(angle);
  const y = subject.dimensions.height / 2;

  for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
    frames.push({
      position: new THREE.Vector3(x, y, z),
      rotation: new THREE.Euler(0, angle, 0),
    });
  }

  return frames;
}

export function generateFigureEightMotion(
  subject: Subject,
  index: number,
  totalSubjects: number
): SubjectFrame[] {
  const frames: SubjectFrame[] = [];
  const FIGURE_8_WIDTH = 6;
  const FIGURE_8_LENGTH = 3;
  const angleOffset = (2 * Math.PI * index) / totalSubjects;

  for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
    const progress = frame / DEFAULT_FRAME_COUNT;
    const angle = 2 * Math.PI * progress + angleOffset;

    const x = FIGURE_8_WIDTH * Math.sin(angle);
    const z = FIGURE_8_LENGTH * Math.sin(2 * angle);
    const y = subject.dimensions.height / 2;

    const dx = FIGURE_8_WIDTH * Math.cos(angle);
    const dz = 2 * FIGURE_8_LENGTH * Math.cos(2 * angle);
    const rotation = new THREE.Euler(0, Math.atan2(dx, dz), 0);

    frames.push({
      position: new THREE.Vector3(x, y, z),
      rotation: rotation,
    });
  }

  return frames;
}

export function generateWaveMotion(
  subject: Subject,
  index: number,
  totalSubjects: number
): SubjectFrame[] {
  const frames: SubjectFrame[] = [];
  const WAVE_WIDTH = 3;
  const WAVE_LENGTH = 10;
  const WAVE_FREQUENCY = 3;
  const startZ = -WAVE_LENGTH / 2 + (WAVE_LENGTH * index) / totalSubjects;

  for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
    const progress = frame / DEFAULT_FRAME_COUNT;
    const z = startZ + progress * WAVE_LENGTH;
    const x = WAVE_WIDTH * Math.sin(progress * WAVE_FREQUENCY * 2 * Math.PI);
    const y = subject.dimensions.height / 2;

    const dx =
      WAVE_WIDTH *
      WAVE_FREQUENCY *
      2 *
      Math.PI *
      Math.cos(progress * WAVE_FREQUENCY * 2 * Math.PI);
    const dz = WAVE_LENGTH;
    const rotation = new THREE.Euler(0, Math.atan2(dx, dz), 0);

    frames.push({
      position: new THREE.Vector3(x, y, z),
      rotation: rotation,
    });
  }

  return frames;
}

export function generatePendulumMotion(
  subject: Subject,
  index: number,
  totalSubjects: number
): SubjectFrame[] {
  const frames: SubjectFrame[] = [];
  const PENDULUM_LENGTH = 8;
  const MAX_ANGLE = Math.PI / 3;
  const PENDULUM_FREQUENCY = 2;
  const phaseOffset = (index / totalSubjects) * 2 * Math.PI;

  for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
    const progress = frame / DEFAULT_FRAME_COUNT;
    const angle =
      MAX_ANGLE *
      Math.sin(progress * PENDULUM_FREQUENCY * 2 * Math.PI + phaseOffset);

    const x = PENDULUM_LENGTH * Math.sin(angle);
    const z = PENDULUM_LENGTH * Math.cos(angle);
    const y = subject.dimensions.height / 2;

    frames.push({
      position: new THREE.Vector3(x, y, z),
      rotation: new THREE.Euler(0, angle + Math.PI, 0),
    });
  }

  return frames;
}

export function generateOrbitalMotion(
  subject: Subject,
  index: number,
  totalSubjects: number
): SubjectFrame[] {
  const frames: SubjectFrame[] = [];
  const ORBIT_RADIUS = 8;
  const CENTER_OFFSET = new THREE.Vector3(4, 0, 0);
  const angleOffset = (2 * Math.PI * index) / totalSubjects;
  const ORBIT_TILT = Math.PI / 6;

  for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
    const progress = frame / DEFAULT_FRAME_COUNT;
    const angle = 2 * Math.PI * progress + angleOffset;

    const x = CENTER_OFFSET.x + ORBIT_RADIUS * Math.cos(angle);
    const z =
      CENTER_OFFSET.z + ORBIT_RADIUS * Math.sin(angle) * Math.cos(ORBIT_TILT);
    const y =
      CENTER_OFFSET.y +
      ORBIT_RADIUS * Math.sin(angle) * Math.sin(ORBIT_TILT) +
      subject.dimensions.height / 2;

    const directionToCenter = new THREE.Vector3(x, y, z).sub(CENTER_OFFSET);
    const rotation = new THREE.Euler(
      0,
      Math.atan2(directionToCenter.x, directionToCenter.z),
      0
    );

    frames.push({
      position: new THREE.Vector3(x, y, z),
      rotation: rotation,
    });
  }

  return frames;
}

export function generateBounceMotion(
  subject: Subject,
  index: number,
  totalSubjects: number
): SubjectFrame[] {
  const frames: SubjectFrame[] = [];
  const BOUNCE_HEIGHT = 3;
  const BOUNCE_DISTANCE = 8;
  const BOUNCE_COUNT = 3;
  const startX =
    -BOUNCE_DISTANCE / 2 + (BOUNCE_DISTANCE * index) / totalSubjects;

  for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
    const progress = frame / DEFAULT_FRAME_COUNT;
    const x = startX + progress * BOUNCE_DISTANCE;

    const bouncePhase = progress * BOUNCE_COUNT * Math.PI;
    const normalizedHeight = Math.abs(Math.sin(bouncePhase));
    const damping = 1 - progress * 0.5;
    const y =
      subject.dimensions.height / 2 +
      normalizedHeight * BOUNCE_HEIGHT * damping;

    const z = 0;

    frames.push({
      position: new THREE.Vector3(x, y, z),
      rotation: new THREE.Euler(0, 0, 0),
    });
  }

  return frames;
}

export const movementGenerators: Record<string, MovementGenerator> = {
  circular: generateCircularMotion,
  zigzag: generateZigzagMotion,
  linear: generateLinearMotion,
  spiral: generateSpiralMotion,
  static: generateStaticMotion,
  figureEight: generateFigureEightMotion,
  wave: generateWaveMotion,
  pendulum: generatePendulumMotion,
  orbital: generateOrbitalMotion,
  bounce: generateBounceMotion,
};

export function generateFrames(
  subjects: Subject[],
  movements: Record<string, string>,
  noiseSettings?: {
    applyNoise?: boolean;
    positionAmplitude?: number;
    rotationAmplitude?: number;
    frequency?: number;
  }
): SubjectFrame[][] {
  const { applyNoise = false, ...noiseParams } = noiseSettings || {};

  return subjects.map((subject, index) => {
    const movementType = movements[subject.id] || "circular";
    const generator = movementGenerators[movementType];
    const baseFrames = generator(subject, index, subjects.length);

    return applyNoise ? addMovementNoise(baseFrames, noiseParams) : baseFrames;
  });
}
