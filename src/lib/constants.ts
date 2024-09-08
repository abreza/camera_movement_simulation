import { ObjectClass } from "@/types/simulation";

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

export const DEFAULT_FRAME_COUNT = 60;
