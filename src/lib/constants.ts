import { ObjectClass, Subject } from "@/types/simulation";
import * as THREE from "three";

export const objectSizes: Record<
  ObjectClass,
  { mean: THREE.Vector3; std: THREE.Vector3 }
> = {
  [ObjectClass.Chair]: {
    mean: new THREE.Vector3(0.5, 1, 0.5),
    std: new THREE.Vector3(0.1, 0.1, 0.1),
  },
  [ObjectClass.Table]: {
    mean: new THREE.Vector3(1.5, 1.0, 0.75),
    std: new THREE.Vector3(0.3, 0.2, 0.1),
  },
  [ObjectClass.Laptop]: {
    mean: new THREE.Vector3(0.35, 0.25, 0.25),
    std: new THREE.Vector3(0.05, 0.03, 0.05),
  },
  [ObjectClass.Book]: {
    mean: new THREE.Vector3(0.2, 0.15, 0.03),
    std: new THREE.Vector3(0.05, 0.03, 0.01),
  },
  [ObjectClass.Tree]: {
    mean: new THREE.Vector3(1, 2, 1),
    std: new THREE.Vector3(0.05, 0.05, 0.1),
  },
};

function getRandomElement<T>(array: readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getNormalDistributionValue(mean: number, std: number): number {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return (
    mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  );
}

function createRandomSubject(): Subject {
  const objectClass = getRandomElement(Object.values(ObjectClass));
  const size = objectSizes[objectClass];
  const randomSize = new THREE.Vector3(
    getNormalDistributionValue(size.mean.x, size.std.x),
    getNormalDistributionValue(size.mean.y, size.std.y),
    getNormalDistributionValue(size.mean.z, size.std.z)
  );

  // Calculate the y position to place the object on the floor
  const yPosition = 0;

  return {
    position: new THREE.Vector3(
      Math.random() * 10 - 5,
      yPosition,
      Math.random() * 10 - 5
    ),
    size: randomSize,
    rotation: new THREE.Euler(0, 0, 0),
    objectClass,
  };
}

export const INITIAL_SUBJECTS: Subject[] = Array.from(
  { length: 20 },
  createRandomSubject
);

export const DEFAULT_FRAME_COUNT = 60;
