import * as THREE from "three";
import { ObjectClass, Subject } from "./types";
import { objectSizes } from "./constants";

function generateRandomGaussian(): number {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
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
  const objectCount = count ?? Math.floor(Math.random() * 11) + 5;
  const subjects: Subject[] = [];

  const defaultFactors: Record<ObjectClass, number> = {
    [ObjectClass.Chair]: 1,
    [ObjectClass.Table]: 0.7,
    [ObjectClass.Laptop]: 0.3,
    [ObjectClass.Book]: 0.3,
    [ObjectClass.Tree]: 0.5,
    [ObjectClass.Car]: 1,
    [ObjectClass.Bicycle]: 1,
  };

  const factors = { ...defaultFactors, ...probabilityFactors };
  const totalWeight = Object.values(factors).reduce(
    (sum, weight) => sum + weight,
    0
  );

  for (let i = 0; i < objectCount; i++) {
    let random = Math.random() * totalWeight;
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
