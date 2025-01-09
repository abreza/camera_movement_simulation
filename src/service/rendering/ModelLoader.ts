import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { ObjectClass } from "../subjects/types";
import { modelPaths } from "../subjects/constants";
import * as THREE from "three";

class ObjectModelLoader {
  private loadedModels: Partial<Record<ObjectClass, THREE.Object3D>> = {};
  private loadingPromises: Partial<
    Record<ObjectClass, Promise<THREE.Object3D>>
  > = {};

  private async loadModel(objectClass: ObjectClass): Promise<THREE.Object3D> {
    const { obj, mtl } = modelPaths[objectClass];

    const mtlLoader = new MTLLoader();
    const materials = await new Promise<MTLLoader.MaterialCreator>(
      (resolve, reject) => {
        mtlLoader.load(mtl, resolve, undefined, (error) =>
          reject(
            new Error(`Error loading materials for ${objectClass}: ${error}`)
          )
        );
      }
    );

    materials.preload();
    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);

    const object = await new Promise<THREE.Object3D>((resolve, reject) => {
      objLoader.load(obj, resolve, undefined, (error) =>
        reject(new Error(`Error loading model for ${objectClass}: ${error}`))
      );
    });

    this.loadedModels[objectClass] = object;
    return object;
  }

  public async get(objectClass: ObjectClass): Promise<THREE.Object3D> {
    const loadedModel = this.loadedModels[objectClass];
    if (loadedModel) {
      return loadedModel;
    }

    const loadingPromise = this.loadingPromises[objectClass];
    if (loadingPromise) {
      return loadingPromise;
    }

    try {
      const promise = this.loadModel(objectClass);
      this.loadingPromises[objectClass] = promise;
      const model = await promise;

      delete this.loadingPromises[objectClass];

      return model;
    } catch (error) {
      delete this.loadingPromises[objectClass];
      throw error;
    }
  }
}

export const objectModels = new ObjectModelLoader();
