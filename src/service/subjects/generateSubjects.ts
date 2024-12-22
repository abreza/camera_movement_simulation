import * as THREE from "three";
import { ObjectClass, Subject } from "./types";
import { objectSizes } from "./constants";
import {
  DEFAULT_FRAME_COUNT,
  SubjectFrame,
  SubjectInfo,
} from "@/types/simulation";

function generateRandomGaussian(): number {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function generateDimensions(objectClass: ObjectClass): THREE.Vector3 {
  const { mean, std } = objectSizes[objectClass];
  return new THREE.Vector3(
    mean.x + generateRandomGaussian() * std.x,
    mean.y + generateRandomGaussian() * std.y,
    mean.z + generateRandomGaussian() * std.z
  );
}

function generateCircularMotion(
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

    const rotation = new THREE.Euler(0, 0, 0);

    frames.push({
      position: new THREE.Vector3(x, y, z),
      rotation: rotation,
    });
  }

  return frames;
}

export function generateSubjects(
  count?: number,
  probabilityFactors?: Partial<Record<ObjectClass, number>>
): SubjectInfo[] {
  const objectCount = count ?? Math.floor(Math.random() * 11) + 5;
  const subjectsInfo: SubjectInfo[] = [];

  const defaultFactors: Record<ObjectClass, number> = {
    [ObjectClass.Chair]: 1,
    [ObjectClass.Table]: 0.7,
    [ObjectClass.Laptop]: 0.5,
    [ObjectClass.Book]: 0.8,
    [ObjectClass.Tree]: 0.3,
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

    const frames = generateCircularMotion(subject, i, objectCount);

    subjectsInfo.push({
      subject,
      frames,
    });
  }

  return subjectsInfo;
}
