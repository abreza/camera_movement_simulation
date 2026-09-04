import * as THREE from "three";
import { ObjectClass, Subject } from "./types";
import { objectSizes } from "./constants";
import { randomValue } from "@/utils/randomUtils";

export const DEFAULT_SUBJECT_CLASS_WEIGHTS: Record<ObjectClass, number> = {
  [ObjectClass.Chair]: 1,
  [ObjectClass.Table]: 0.7,
  [ObjectClass.Laptop]: 0.3,
  [ObjectClass.Book]: 0.3,
  [ObjectClass.Tree]: 0.5,
  [ObjectClass.Car]: 1,
  [ObjectClass.Bicycle]: 1,
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
  const subjects: Subject[] = [];

  const factors = {
    ...DEFAULT_SUBJECT_CLASS_WEIGHTS,
    ...probabilityFactors,
  };
  const totalWeight = Object.values(factors).reduce(
    (sum, weight) => sum + weight,
    0
  );

  for (let i = 0; i < objectCount; i++) {
    let random = randomValue() * totalWeight;
    let chosenClass: ObjectClass = ObjectClass.Chair;

    for (const [objectClass, weight] of Object.entries(factors)) {
      random -= weight;
      if (random <= 0) {
        chosenClass = objectClass as ObjectClass;
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
