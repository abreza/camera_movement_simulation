import * as THREE from "three";
import { OrbitControls } from "@three-ts/orbit-controls";

export class Renderer {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document
      .getElementById("canvas-container")
      .appendChild(this.renderer.domElement);

    // World view setup
    this.worldScene = new THREE.Scene();
    this.worldCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.worldRenderer = new THREE.WebGLRenderer();
    this.worldRenderer.setSize(288, 288); // 72px * 4 (default Tailwind size)
    document
      .getElementById("world-view-container")
      .appendChild(this.worldRenderer.domElement);

    this.worldControls = new OrbitControls(
      this.worldCamera,
      this.worldRenderer.domElement
    );
    this.worldCamera.position.set(10, 10, 10);
    this.worldControls.update();

    this.subjectMeshes = [];
    this.worldSubjectMeshes = [];

    window.addEventListener("resize", this.onWindowResize.bind(this), false);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  updateScene(cameraPosition, cameraLookAt, subjects) {
    this.camera.position.copy(cameraPosition);
    this.camera.lookAt(cameraLookAt);

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
      mesh.position.copy(subject.position);
      mesh.scale.copy(subject.size);

      // Update world view mesh
      const worldMesh = this.worldSubjectMeshes[index];
      worldMesh.position.copy(subject.position);
      worldMesh.scale.copy(subject.size);
    });

    // Add camera representation to world view
    if (!this.cameraHelper) {
      this.cameraHelper = new THREE.CameraHelper(this.camera);
      this.worldScene.add(this.cameraHelper);
    }
    this.cameraHelper.update();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    this.worldRenderer.render(this.worldScene, this.worldCamera);
    this.worldControls.update();
  }
}
