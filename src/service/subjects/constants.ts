import { ObjectClass } from "./types";

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
  // [ObjectClass.Building]: {
  //   mean: new THREE.Vector3(10, 15, 10),
  //   std: new THREE.Vector3(2, 3, 2),
  // },
  [ObjectClass.Car]: {
    mean: new THREE.Vector3(0.75, 1.0, 1.5),
    std: new THREE.Vector3(0.1, 0.2, 0.3),
  },
  [ObjectClass.Bicycle]: {
    mean: new THREE.Vector3(0.5, 1, 1),
    std: new THREE.Vector3(0.1, 0.2, 0.2),
  },
};

export interface ModelPaths {
  obj: string;
  material?: string;
  materialType: "mtl" | "stl";
}

export const modelPaths: Record<ObjectClass, ModelPaths> = {
  [ObjectClass.Chair]: {
    obj: "/models/chair.obj",
    material: "/models/chair.mtl",
    materialType: "mtl",
  },
  [ObjectClass.Table]: {
    obj: "/models/table.obj",
    material: "/models/table.mtl",
    materialType: "mtl",
  },
  [ObjectClass.Laptop]: {
    obj: "/models/laptop.obj",
    material: "/models/laptop.mtl",
    materialType: "mtl",
  },
  [ObjectClass.Book]: {
    obj: "/models/book.obj",
    material: "/models/book.mtl",
    materialType: "mtl",
  },
  [ObjectClass.Tree]: {
    obj: "/models/tree.obj",
    material: "/models/tree.mtl",
    materialType: "mtl",
  },
  // [ObjectClass.Building]: {
  //   obj: "/models/building.obj",
  //   material: "/models/building.mtl",
  //   materialType: "mtl",
  // },
  [ObjectClass.Car]: {
    obj: "/models/car.obj",
    material: "/models/car.mtl",
    materialType: "mtl",
  },
  [ObjectClass.Bicycle]: {
    obj: "/models/bike.obj",
    material: "/models/bike.mtl",
    materialType: "mtl",
  },
};
