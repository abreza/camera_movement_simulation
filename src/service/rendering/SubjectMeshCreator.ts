import * as THREE from "three";
import { Subject, SubjectDimensions } from "../subjects/types";
import { objectModels } from "./ModelLoader";

export const createSubjectMesh = (
  subject: Subject,
  isWorldView: boolean
): THREE.Object3D => {
  const model = objectModels.get(subject.class);
  if (!model) {
    console.warn(`No model found for ${subject.class}. Using fallback cube.`);
    return createFallbackMesh(subject.dimensions);
  }

  const subjectMesh = model.clone();
  scaleSubjectMesh(subjectMesh, subject.dimensions);
  setupMeshMaterials(subjectMesh, isWorldView);

  return subjectMesh;
};

const createFallbackMesh = (dimensions: SubjectDimensions): THREE.Mesh => {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0xcccccc });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.copy(
    new THREE.Vector3(dimensions.width, dimensions.height, dimensions.depth)
  );
  return mesh;
};

const scaleSubjectMesh = (
  mesh: THREE.Object3D,
  targetDimensions: SubjectDimensions
): void => {
  const boundingBox = new THREE.Box3().setFromObject(mesh);
  const modelSize = new THREE.Vector3();
  boundingBox.getSize(modelSize);

  const scaleX = targetDimensions.width / modelSize.x;
  const scaleY = targetDimensions.height / modelSize.y;
  const scaleZ = targetDimensions.depth / modelSize.z;

  mesh.scale.set(scaleX, scaleY, scaleZ);
};

const setupMeshMaterials = (
  mesh: THREE.Object3D,
  isWorldView: boolean
): void => {
  mesh.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (!isWorldView) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
      handleMeshMaterial(child);
    }
  });
};

const handleMeshMaterial = (mesh: THREE.Mesh): void => {
  if (mesh.material) {
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((mat) =>
        mat instanceof THREE.Material
          ? mat.clone()
          : new THREE.MeshBasicMaterial()
      );
    } else if (mesh.material instanceof THREE.Material) {
      mesh.material = mesh.material.clone();
    } else {
      console.warn("Non-standard material detected. Using fallback.");
      mesh.material = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    }
    (mesh.material as THREE.Material).needsUpdate = true;
  } else {
    mesh.material = new THREE.MeshBasicMaterial({ color: 0xcccccc });
  }
};
