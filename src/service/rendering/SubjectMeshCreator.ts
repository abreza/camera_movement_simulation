import * as THREE from "three";
import { Subject } from "@/types/simulation";
import { ModelLoader } from "./ModelLoader";

export class SubjectMeshCreator {
  private modelLoader: ModelLoader;

  constructor(modelLoader: ModelLoader) {
    this.modelLoader = modelLoader;
  }

  createSubjectMesh(subject: Subject, isWorldView: boolean): THREE.Object3D {
    const model = this.modelLoader.getModel(subject.objectClass);
    if (!model) {
      console.warn(
        `No model found for ${subject.objectClass}. Using fallback cube.`
      );
      return this.createFallbackMesh(subject.size);
    }

    const subjectMesh = model.clone();
    this.scaleSubjectMesh(subjectMesh, subject.size);
    this.setupMeshMaterials(subjectMesh, isWorldView);

    return subjectMesh;
  }

  private createFallbackMesh(size: THREE.Vector3): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.copy(size);
    return mesh;
  }

  private scaleSubjectMesh(
    mesh: THREE.Object3D,
    targetSize: THREE.Vector3
  ): void {
    const boundingBox = new THREE.Box3().setFromObject(mesh);
    const modelSize = new THREE.Vector3();
    boundingBox.getSize(modelSize);

    const scaleX = targetSize.x / modelSize.x;
    const scaleY = targetSize.y / modelSize.y;
    const scaleZ = targetSize.z / modelSize.z;

    mesh.scale.set(scaleX, scaleY, scaleZ);
  }

  private setupMeshMaterials(mesh: THREE.Object3D, isWorldView: boolean): void {
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!isWorldView) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
        this.handleMeshMaterial(child);
      }
    });
  }

  private handleMeshMaterial(mesh: THREE.Mesh): void {
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
  }
}
