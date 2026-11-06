import * as THREE from "three";
import { ObjectClass, Subject } from "./types";
import { HUMAN_DIMENSION_BOUNDS, objectSizes } from "./constants";
import { randomValue } from "@/utils/randomUtils";

export const DEFAULT_SUBJECT_CLASS_WEIGHTS: Record<ObjectClass, number> = {
  [ObjectClass.Chair]: 1,
  [ObjectClass.Table]: 0.7,
  [ObjectClass.Laptop]: 0.3,
  [ObjectClass.Book]: 0.3,
  [ObjectClass.Tree]: 0.5,
  [ObjectClass.Car]: 1,
  [ObjectClass.Bicycle]: 1,
  [ObjectClass.Human]: 4,
};

function generateRandomGaussian(): number {
  let u = 0,
    v = 0;
  while (u === 0) u = randomValue();
  while (v === 0) v = randomValue();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function generateDimensions(objectClass: ObjectClass): THREE.Vector3 {
  const { mean, std } = objectSizes[objectClass];
  if (objectClass === ObjectClass.Human) {
    // Correlate breadth with stature and build, then bound the whole-body box.
    // This describes one rigid subject; it adds no inferred face/torso ROI.
    const bounds = HUMAN_DIMENSION_BOUNDS;
    const clamp = THREE.MathUtils.clamp;
    const height = clamp(
      mean.y + generateRandomGaussian() * std.y,
      bounds.height.min,
      bounds.height.max
    );
    const stature = height / mean.y;
    const build = generateRandomGaussian() * std.x;
    return new THREE.Vector3(
      clamp(mean.x * stature + build, bounds.width.min, bounds.width.max),
      height,
      clamp(
        mean.z * stature + build * 0.5 + generateRandomGaussian() * 0.018,
        bounds.depth.min,
        bounds.depth.max
      )
    );
  }
  return new THREE.Vector3(
    Math.max(0.05, mean.x + generateRandomGaussian() * std.x),
    Math.max(0.05, mean.y + generateRandomGaussian() * std.y),
    Math.max(0.05, mean.z + generateRandomGaussian() * std.z)
  );
}

export function generateSubjects(
  count?: number,
  probabilityFactors?: Partial<Record<ObjectClass, number>>
): Subject[] {
  const objectCount = count ?? Math.floor(randomValue() * 11) + 5;
  if (!Number.isSafeInteger(objectCount) || objectCount < 0) {
    throw new Error("Subject count must be a non-negative safe integer.");
  }
  const subjects: Subject[] = [];

  const factors = {
    ...DEFAULT_SUBJECT_CLASS_WEIGHTS,
    ...probabilityFactors,
  };
  const classes = Object.values(ObjectClass);
  for (const [objectClass, weight] of Object.entries(factors)) {
    if (!classes.includes(objectClass as ObjectClass)) {
      throw new Error(`Unknown subject class: ${objectClass}`);
    }
    if (!Number.isFinite(weight) || weight < 0) {
      throw new Error(`Subject weight for ${objectClass} must be finite and non-negative.`);
    }
  }
  const weightedClasses = classes
    .map((objectClass) => [objectClass, factors[objectClass]] as const)
    .filter(([, weight]) => weight > 0);
  const totalWeight = weightedClasses.reduce((sum, [, weight]) => sum + weight, 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    throw new Error("At least one subject class must have a positive, finite total weight.");
  }

  for (let i = 0; i < objectCount; i++) {
    let random = randomValue() * totalWeight;
    let chosenClass = weightedClasses[weightedClasses.length - 1][0];

    for (const [objectClass, weight] of weightedClasses) {
      random -= weight;
      if (random < 0) {
        chosenClass = objectClass;
        break;
      }
    }

    const dimensions = generateDimensions(chosenClass);
    const subject: Subject = {
      id: `${chosenClass}-${i}`,
      class: chosenClass,
      dimensions: {
        width: dimensions.x,
        height: dimensions.y,
        depth: dimensions.z,
      },
    };

    subjects.push(subject);
  }

  return subjects;
}
