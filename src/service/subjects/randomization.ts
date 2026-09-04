import { RandomizationSettings } from "./types";
import { getRandomWithSeed } from "./utils";
import { randomValue } from "@/utils/randomUtils";

export function generateRandomSettings(
  baseSettings: Partial<RandomizationSettings> = {}
): RandomizationSettings {
  const seed = baseSettings.seed ?? randomValue();
  const defaults: RandomizationSettings = {
    enabled: true,
    positionOffset: {
      x: getRandomWithSeed(seed + 0.1, -3, 3),
      // All currently available subjects are ground-contact objects.  A
      // random positive Y offset made chairs/cars float above the ground.
      y: 0,
      z: getRandomWithSeed(seed + 0.3, -3, 3),
      radius: getRandomWithSeed(seed + 0.4, 0.65, 1.4),
    },
    rotationOffset: getRandomWithSeed(seed + 0.5, 0, Math.PI * 2),
    speedFactor: {
      min: 0.6,
      max: 1.4,
    },
    directionReversalProbability: 0.5,
    phaseOffset: getRandomWithSeed(seed + 0.6, 0, Math.PI * 2),
    timing: {
      smoothness: getRandomWithSeed(seed + 0.65, 0.15, 0.7),
      accelerationBias: getRandomWithSeed(seed + 0.66, -0.4, 0.4),
    },
    seed,
  };

  return {
    ...defaults,
    ...baseSettings,
    positionOffset: {
      ...defaults.positionOffset,
      ...baseSettings.positionOffset,
    },
    speedFactor: {
      min:
        baseSettings.speedFactor?.min ?? defaults.speedFactor!.min,
      max:
        baseSettings.speedFactor?.max ?? defaults.speedFactor!.max,
    },
    timing: {
      smoothness:
        baseSettings.timing?.smoothness ?? defaults.timing!.smoothness,
      accelerationBias:
        baseSettings.timing?.accelerationBias ??
        defaults.timing!.accelerationBias,
    },
  };
}
