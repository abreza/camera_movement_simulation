import * as THREE from "three";
import { OrbitControls } from "@three-ts/orbit-controls";

interface Subject {
  position: THREE.Vector3;
  size: THREE.Vector3;
}

export class Renderer {
  private cameraViewElement: HTMLDivElement;
  private worldViewElement: HTMLDivElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private worldScene: THREE.Scene;
  private worldCamera: THREE.PerspectiveCamera;
  private worldRenderer: THREE.WebGLRenderer;
  private worldControls: OrbitControls;
  private subjectMeshes: THREE.Mesh[];
  private worldSubjectMeshes: THREE.Mesh[];
  private cameraHelper: THREE.CameraHelper | null;
  private resizeHandler: () => void;

  constructor(
    cameraViewElement: HTMLDivElement,
    worldViewElement: HTMLDivElement
  ) {
    this.cameraViewElement = cameraViewElement;
    this.worldViewElement = worldViewElement;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.cameraViewElement.appendChild(this.renderer.domElement);

    // World view setup
    this.worldScene = new THREE.Scene();
    this.worldCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.worldRenderer = new THREE.WebGLRenderer();
    this.worldRenderer.setSize(288, 288);
    this.worldViewElement.appendChild(this.worldRenderer.domElement);

    this.worldControls = new OrbitControls(
      this.worldCamera,
      this.worldRenderer.domElement
    );
    this.worldCamera.position.set(10, 10, 10);
    this.worldControls.update();

    this.subjectMeshes = [];
    this.worldSubjectMeshes = [];
    this.cameraHelper = null;

    this.resizeHandler = this.onWindowResize.bind(this);
    window.addEventListener("resize", this.resizeHandler, false);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  updateScene(
    cameraPosition: THREE.Vector3,
    cameraLookAt: THREE.Vector3,
    focalLength: number,
    subjects: Subject[]
  ): void {
    this.camera.position.copy(cameraPosition);
    this.camera.lookAt(cameraLookAt);
    this.camera.setFocalLength(focalLength);

    this.camera.updateMatrixWorld();

    while (this.subjectMeshes.length < subjects.length) {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: true,
      });
      const mesh = new THREE.Mesh(geometry, material);
      this.scene.add(mesh);
      this.subjectMeshes.push(mesh);

      // Add mesh to world view
      const worldMesh = mesh.clone();
      this.worldScene.add(worldMesh);
      this.worldSubjectMeshes.push(worldMesh);
    }

    subjects.forEach((subject, index) => {
      const mesh = this.subjectMeshes[index];
      if (mesh) {
        mesh.position.copy(subject.position);
        mesh.scale.copy(subject.size);

        // Update world view mesh
        const worldMesh = this.worldSubjectMeshes[index];
        if (worldMesh) {
          worldMesh.position.copy(subject.position);
          worldMesh.scale.copy(subject.size);
        }
      }
    });

    if (!this.cameraHelper) {
      this.cameraHelper = new THREE.CameraHelper(this.camera);
      this.worldScene.add(this.cameraHelper);
    }
    this.cameraHelper.update();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
    this.worldRenderer.render(this.worldScene, this.worldCamera);
    this.worldControls.update();
  }

  unmount(): void {
    // Remove event listeners
    window.removeEventListener("resize", this.resizeHandler);

    // Dispose of Three.js objects
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        } else if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        }
      }
    });

    this.worldScene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        } else if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        }
      }
    });

    // Dispose of renderers
    this.renderer.dispose();
    this.worldRenderer.dispose();

    this.cameraViewElement.innerHTML = "";
    this.worldViewElement.innerHTML = "";

    // Dispose of controls
    this.worldControls.dispose();

    // Nullify references
    this.scene = null!;
    this.camera = null!;
    this.renderer = null!;
    this.worldScene = null!;
    this.worldCamera = null!;
    this.worldRenderer = null!;
    this.worldControls = null!;
    this.subjectMeshes = [];
    this.worldSubjectMeshes = [];
    this.cameraHelper = null;
  }
}
