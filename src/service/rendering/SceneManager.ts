import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Subject } from "@/types/simulation";
import { SubjectMeshCreator } from "./SubjectMeshCreator";

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private worldScene: THREE.Scene;
  private worldCamera: THREE.PerspectiveCamera;
  private worldRenderer: THREE.WebGLRenderer;
  private worldControls: OrbitControls;
  private subjectMeshes: THREE.Object3D[];
  private worldSubjectMeshes: THREE.Object3D[];
  private cameraHelper: THREE.CameraHelper | null;

  constructor(
    cameraViewElement: HTMLDivElement,
    worldViewElement: HTMLDivElement
  ) {
    // Initialize all properties
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.worldScene = new THREE.Scene();
    this.worldCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.worldRenderer = new THREE.WebGLRenderer({ antialias: true });
    this.worldControls = new OrbitControls(this.worldCamera, worldViewElement);
    this.subjectMeshes = [];
    this.worldSubjectMeshes = [];
    this.cameraHelper = null;

    this.setupMainScene(cameraViewElement);
    this.setupWorldScene(worldViewElement);
    this.setupLighting();
  }

  private setupMainScene(cameraViewElement: HTMLDivElement): void {
    this.renderer.setSize(window.innerWidth / 5, window.innerHeight / 5);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    cameraViewElement.appendChild(this.renderer.domElement);
  }

  private setupWorldScene(worldViewElement: HTMLDivElement): void {
    this.worldRenderer.setSize(window.innerWidth, window.innerHeight);
    this.worldRenderer.setClearColor(0x000000, 0);
    worldViewElement.appendChild(this.worldRenderer.domElement);

    this.worldCamera.position.set(20, 20, 20);
    this.worldControls.update();
  }

  private setupLighting(): void {
    // Main scene lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Increased intensity and changed color to white
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Increased intensity
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 20;
    this.scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0xffffff, 1.0); // Increased intensity
    pointLight1.position.set(-5, 5, -5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffffff, 1.0); // Added a second point light
    pointLight2.position.set(5, 5, 5);
    this.scene.add(pointLight2);

    const spotLight = new THREE.SpotLight(0xffffff, 1.0); // Increased intensity
    spotLight.position.set(0, 10, 0);
    spotLight.angle = Math.PI / 3; // Widened the angle
    spotLight.penumbra = 0.1;
    spotLight.decay = 2;
    spotLight.distance = 200;
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    spotLight.shadow.camera.near = 1;
    spotLight.shadow.camera.far = 200;
    this.scene.add(spotLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0); // Increased intensity
    hemiLight.position.set(0, 20, 0);
    this.scene.add(hemiLight);

    // Add a rect area light for even more illumination
    const rectLight = new THREE.RectAreaLight(0xffffff, 5, 10, 10);
    rectLight.position.set(0, 5, 0);
    rectLight.lookAt(0, 0, 0);
    this.scene.add(rectLight);

    // World view lighting (slightly increased)
    const worldAmbientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.worldScene.add(worldAmbientLight);

    const worldDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    worldDirectionalLight.position.set(1, 1, 1);
    this.worldScene.add(worldDirectionalLight);
  }

  onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  updateCamera(
    position: THREE.Vector3,
    angle: THREE.Euler,
    focalLength: number
  ): void {
    this.camera.position.copy(position);
    this.camera.rotation.copy(angle);
    this.camera.setFocalLength(focalLength);
    this.camera.updateMatrixWorld();

    if (!this.cameraHelper) {
      this.cameraHelper = new THREE.CameraHelper(this.camera);
      this.worldScene.add(this.cameraHelper);
    }
    this.cameraHelper.update();
  }

  updateSubjects(
    subjects: Subject[],
    subjectMeshCreator: SubjectMeshCreator
  ): void {
    // Remove old meshes
    this.subjectMeshes.forEach((mesh) => this.scene.remove(mesh));
    this.worldSubjectMeshes.forEach((mesh) => this.worldScene.remove(mesh));
    this.subjectMeshes = [];
    this.worldSubjectMeshes = [];

    // Add new meshes
    subjects.forEach((subject) => {
      const mesh = subjectMeshCreator.createSubjectMesh(subject, false);
      mesh.position.copy(subject.position);
      mesh.rotation.copy(subject.rotation);
      this.scene.add(mesh);
      this.subjectMeshes.push(mesh);

      const worldMesh = subjectMeshCreator.createSubjectMesh(subject, true);
      worldMesh.position.copy(subject.position);
      worldMesh.rotation.copy(subject.rotation);
      this.worldScene.add(worldMesh);
      this.worldSubjectMeshes.push(worldMesh);
    });
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
    this.worldRenderer.render(this.worldScene, this.worldCamera);
    this.worldControls.update();
  }

  dispose(): void {
    this.scene.traverse(this.disposeObject);
    this.worldScene.traverse(this.disposeObject);
    this.renderer.dispose();
    this.worldRenderer.dispose();
    this.worldControls.dispose();
  }

  private disposeObject(object: THREE.Object3D): void {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      if (object.material instanceof THREE.Material) {
        object.material.dispose();
      } else if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose());
      }
    }
  }
}
