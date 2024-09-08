import * as THREE from "three";

import { objectSizes } from "@/lib/constants";
import { ObjectClass, Subject } from "@/types/simulation";
import {
  getNormalDistributionValue,
  getRandomElement,
} from "@/utils/simulationUtils";

function createRandomSubject(
  probabilityFactors: Partial<Record<ObjectClass, number>> = {},
  existingSubjects: Subject[] = []
): Subject | null {
  const defaultProbability = 0.5;
  const normalizedFactors: Record<ObjectClass, number> = Object.values(
    ObjectClass
  ).reduce((acc, cls) => {
    acc[cls] = Math.max(
      0,
      Math.min(1, probabilityFactors[cls] ?? defaultProbability)
    );
    return acc;
  }, {} as Record<ObjectClass, number>);

  const totalProbability = Object.values(normalizedFactors).reduce(
    (sum, prob) => sum + prob,
    0
  );
  const randomValue = Math.random() * totalProbability;

  let cumulativeProbability = 0;
  let selectedClass: ObjectClass | null = null;

  for (const [cls, probability] of Object.entries(normalizedFactors)) {
    cumulativeProbability += probability;
    if (randomValue <= cumulativeProbability) {
      selectedClass = cls as ObjectClass;
      break;
    }
  }

  const objectClass =
    selectedClass || getRandomElement(Object.values(ObjectClass));
  const size = objectSizes[objectClass];
  const randomSize = new THREE.Vector3(
    getNormalDistributionValue(size.mean.x, size.std.x),
    getNormalDistributionValue(size.mean.y, size.std.y),
    getNormalDistributionValue(size.mean.z, size.std.z)
  );

  for (let attempts = 0; attempts < 100; attempts++) {
    const xPosition = Math.random() * 10 - 5;
    const zPosition = Math.random() * 10 - 5;
    const yPosition = 0;

    const newSubject: Subject = {
      position: new THREE.Vector3(xPosition, yPosition, zPosition),
      size: randomSize,
      rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0),
      objectClass,
    };

    if (!checkCollision(newSubject, existingSubjects)) {
      return newSubject;
    }
  }

  return null;
}

function checkCollision(
  subject: Subject,
  existingSubjects: Subject[]
): boolean {
  for (const existingSubject of existingSubjects) {
    const distance = subject.position.distanceTo(existingSubject.position);
    const minDistance =
      (Math.max(subject.size.x, subject.size.z) +
        Math.max(existingSubject.size.x, existingSubject.size.z)) /
      2;

    if (distance < minDistance) {
      return true;
    }
  }
  return false;
}

export function generateSubjects(
  count?: number,
  probabilityFactors?: Partial<Record<ObjectClass, number>>
): Subject[] {
  const objectCount = count ?? Math.floor(Math.random() * 11) + 5;
  const subjects: Subject[] = [];

  while (subjects.length < objectCount) {
    const newSubject = createRandomSubject(probabilityFactors, subjects);
    if (newSubject) {
      subjects.push(newSubject);
    } else {
      console.warn(
        `Could only place ${subjects.length} objects without intersection.`
      );
      break;
    }
  }

  return subjects;
}
