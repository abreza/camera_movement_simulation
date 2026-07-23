import { RandomizationSettings } from "./types";
import { getRandomWithSeed } from "./utils";
import { randomValue } from "@/utils/randomUtils";

export function generateRandomSettings(
  baseSettings: Partial<RandomizationSettings> = {}
): RandomizationSettings {
  const seed = randomValue();
  return {
    enabled: true,
    positionOffset: {
      x: getRandomWithSeed(seed + 0.1, -2, 2),
      y: getRandomWithSeed(seed + 0.2, 0, 1),
      z: getRandomWithSeed(seed + 0.3, -2, 2),
      radius: getRandomWithSeed(seed + 0.4, 0.7, 1.3),
    },
    rotationOffset: getRandomWithSeed(seed + 0.5, 0, Math.PI * 2),
    speedFactor: {
      min: 0.7,
      max: 1.3,
    },
    directionReversalProbability: 0.3,
    phaseOffset: getRandomWithSeed(seed + 0.6, 0, Math.PI * 2),
    seed,
    ...baseSettings,
  };
}
