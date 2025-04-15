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
  }
): SubjectFrame[][] {
  const {
    applyNoise = false,
    randomize = true,
    randomSettings = {},
    ...noiseParams
  } = settings || {};

  return subjects.map((subject, index) => {
    const movementType = movements[subject.id] || "circular";
    const generator = movementGenerators[movementType];

    const subjectRandomSettings = randomize
      ? generateRandomSettings(randomSettings)
      : undefined;

    const baseFrames = generator(
      subject,
      index,
      subjects.length,
      subjectRandomSettings
    );

    return applyNoise ? addMovementNoise(baseFrames, noiseParams) : baseFrames;
  });
}
