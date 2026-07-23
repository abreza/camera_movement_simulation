import * as THREE from "three";
import { Subject, SubjectFrame, RandomizationSettings } from "../types";
import { addMovementNoise } from "../utils";
import { generateRandomSettings } from "../randomization";

import { MovementGenerator } from "../types";
import { generateCircularMotion } from "./circular";
import { generateZigzagMotion } from "./zigzag";
import { generateLinearMotion } from "./linear";
import { generateSpiralMotion } from "./spiral";
import { generateStaticMotion } from "./static";
import { generateFigureEightMotion } from "./figureEight";
import { generateWaveMotion } from "./wave";
import { generatePendulumMotion } from "./pendulum";
import { generateOrbitalMotion } from "./orbital";
import { generateBounceMotion } from "./bounce";

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

function resampleFrames(
  frames: SubjectFrame[],
  frameCount: number
): SubjectFrame[] {
  if (frames.length === 0 || frameCount <= 0) {
    return [];
  }

  if (frames.length === frameCount) {
    return frames;
  }

  if (frameCount === 1) {
    return [
      {
        position: frames[0].position.clone(),
        rotation: frames[0].rotation.clone(),
      },
    ];
  }

  return Array.from({ length: frameCount }, (_, index) => {
    const sourcePosition =
      (index / (frameCount - 1)) * Math.max(0, frames.length - 1);
    const lowerIndex = Math.floor(sourcePosition);
    const upperIndex = Math.min(lowerIndex + 1, frames.length - 1);
    const interpolation = sourcePosition - lowerIndex;
    const lowerFrame = frames[lowerIndex];
    const upperFrame = frames[upperIndex];

    const lowerRotation = new THREE.Quaternion().setFromEuler(
      lowerFrame.rotation
    );
    const upperRotation = new THREE.Quaternion().setFromEuler(
      upperFrame.rotation
    );

    return {
      position: lowerFrame.position
        .clone()
        .lerp(upperFrame.position, interpolation),
      rotation: new THREE.Euler().setFromQuaternion(
        lowerRotation.slerp(upperRotation, interpolation),
        lowerFrame.rotation.order
      ),
    };
  });
}

export function generateFrames(
  subjects: Subject[],
  movements: Record<string, string>,
  settings?: {
    applyNoise?: boolean;
    positionAmplitude?: number;
    rotationAmplitude?: number;
    frequency?: number;
    randomize?: boolean;
    randomSettings?: Partial<RandomizationSettings>;
    frameCount?: number;
  }
): SubjectFrame[][] {
  const {
    applyNoise = false,
    randomize = true,
    randomSettings = {},
    frameCount,
    ...noiseParams
  } = settings || {};

  return subjects.map((subject, index) => {
    const movementType = movements[subject.id] || "circular";
    const generator = movementGenerators[movementType];

    const subjectRandomSettings = randomize
      ? generateRandomSettings(randomSettings)
      : undefined;

    const generatedFrames = generator(
      subject,
      index,
      subjects.length,
      subjectRandomSettings
    );
    const baseFrames =
      frameCount === undefined
        ? generatedFrames
        : resampleFrames(generatedFrames, frameCount);

    return applyNoise ? addMovementNoise(baseFrames, noiseParams) : baseFrames;
  });
}
