import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { ObjectClass } from "../subjects/types";
import { modelPaths } from "../subjects/constants";
import * as THREE from "three";

class ObjectModelLoader {
  private loadedModels: Partial<Record<ObjectClass, THREE.Object3D>> = {};
  private loadingPromises: Partial<
    Record<ObjectClass, Promise<THREE.Object3D>>
  > = {};

  private async loadOBJModel(
    objectClass: ObjectClass
  ): Promise<THREE.Object3D> {
    const { obj, material } = modelPaths[objectClass];

    if (material) {
      const mtlLoader = new MTLLoader();
      const materials = await new Promise<MTLLoader.MaterialCreator>(
        (resolve, reject) => {
          mtlLoader.load(material, resolve, undefined, (error) =>
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

      return object;
    } else {
      const objLoader = new OBJLoader();
      return await new Promise<THREE.Object3D>((resolve, reject) => {
        objLoader.load(obj, resolve, undefined, (error) =>
          reject(new Error(`Error loading model for ${objectClass}: ${error}`))
        );
      });
    }
  }

  private async loadSTLModel(
    objectClass: ObjectClass
  ): Promise<THREE.Object3D> {
    const { obj } = modelPaths[objectClass];
    const stlLoader = new STLLoader();

    const geometry = await new Promise<THREE.BufferGeometry>(
      (resolve, reject) => {
        stlLoader.load(obj, resolve, undefined, (error) =>
          reject(new Error(`Error loading STL for ${objectClass}: ${error}`))
        );
      }
    );

    const material = new THREE.MeshStandardMaterial({
      color: 0x808080,
      metalness: 0.5,
      roughness: 0.5,
    });

    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  private async loadModel(objectClass: ObjectClass): Promise<THREE.Object3D> {
    const { materialType } = modelPaths[objectClass];

    try {
      let object: THREE.Object3D;

      switch (materialType) {
        case "mtl":
          object = await this.loadOBJModel(objectClass);
          break;
        case "stl":
          object = await this.loadSTLModel(objectClass);
          break;
        default:
          throw new Error(`Unsupported material type: ${materialType}`);
      }

      this.loadedModels[objectClass] = object;
      return object;
    } catch (error) {
      console.error(`Failed to load model for ${objectClass}:`, error);
      throw error;
    }
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
