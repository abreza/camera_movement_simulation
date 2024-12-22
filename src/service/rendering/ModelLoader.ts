import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { ObjectClass } from "../subjects/types";
import { modelPaths } from "../subjects/constants";

const mtlLoader = new MTLLoader();

export const objectModels = new Map();

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
          objectModels.set(objectClass as ObjectClass, object);
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
