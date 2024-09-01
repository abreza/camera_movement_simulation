import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { ObjectClass } from "@/types/simulation";

export class ModelLoader {
  private objectModels: Map<ObjectClass, THREE.Object3D>;

  constructor() {
    this.objectModels = new Map();
  }

  loadObjectModels(): void {
    const modelPaths: Record<ObjectClass, { obj: string; mtl: string }> = {
      [ObjectClass.Chair]: {
        obj: "/models/chair.obj",
        mtl: "/models/chair.mtl",
      },
      [ObjectClass.Table]: {
        obj: "/models/table.obj",
        mtl: "/models/table.mtl",
      },
      [ObjectClass.Laptop]: {
        obj: "/models/laptop.obj",
        mtl: "/models/laptop.mtl",
      },
      [ObjectClass.Book]: { obj: "/models/book.obj", mtl: "/models/book.mtl" },
      [ObjectClass.Tree]: {
        obj: "/models/tree.obj",
        mtl: "/models/tree.mtl",
      },
    };

    const mtlLoader = new MTLLoader();

    Object.entries(modelPaths).forEach(([objectClass, { obj, mtl }]) => {
      mtlLoader.load(
        mtl,
        (materials) => {
          materials.preload();
          const objLoader = new OBJLoader();
          objLoader.setMaterials(materials);
          objLoader.load(
            obj,
            (object) => {
              this.objectModels.set(objectClass as ObjectClass, object);
            },
            undefined,
            (error) => {
              console.error(`Error loading model for ${objectClass}:`, error);
            }
          );
        },
        undefined,
        (error) => {
          console.error(`Error loading materials for ${objectClass}:`, error);
        }
      );
    });
  }

  getModel(objectClass: ObjectClass): THREE.Object3D | undefined {
    return this.objectModels.get(objectClass);
  }
}
