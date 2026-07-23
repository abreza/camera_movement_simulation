import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createSubjectMesh } from "./SubjectMeshCreator";
import {
  SubjectFrame,
  SubjectFrameInfo,
  SubjectInfo,
  Subject,
} from "../subjects/types";
import { CameraParameters } from "../simulation/instruction/types";
import {
  DEFAULT_ASPECT_RATIO,
  DEFAULT_FOCAL_LENGTH,
} from "../simulation/constants";
import { CameraMeshCreator } from "./CameraMeshCreator";
import {
  PlacementController,
  PlacementCallback,
  PreviewCallback,
} from "./PlacementController";

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

  private cameraTrajectoryGroup: THREE.Group;
  private subjectTrajectoryGroups: THREE.Group[];
  private cameraFrames: CameraParameters[];
  private subjectsInfo: SubjectInfo[];

  private _showCameraPath: boolean = true;
  private _showSubjectPaths: boolean = true;

  private subjectMeshMap: Map<
    string,
    { main: THREE.Object3D; world: THREE.Object3D }
  > = new Map();

  public placementController: PlacementController;

  constructor(
    cameraViewElement: HTMLDivElement,
    worldViewElement: HTMLDivElement
  ) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera();
    this.camera.setFocalLength(DEFAULT_FOCAL_LENGTH);
    this.camera.aspect = DEFAULT_ASPECT_RATIO;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.worldScene = new THREE.Scene();
    this.worldCamera = new THREE.PerspectiveCamera();
    this.worldCamera.setFocalLength(DEFAULT_FOCAL_LENGTH);
    this.worldCamera.aspect = DEFAULT_ASPECT_RATIO;
    this.worldRenderer = new THREE.WebGLRenderer({ antialias: true });
    this.worldControls = new OrbitControls(this.worldCamera, worldViewElement);
    this.subjectMeshes = [];
    this.worldSubjectMeshes = [];
    this.cameraHelper = null;

    this.cameraTrajectoryGroup = new THREE.Group();
    this.subjectTrajectoryGroups = [];
    this.cameraFrames = [];
    this.subjectsInfo = [];

    this.setupMainScene(cameraViewElement);
    this.setupWorldScene(worldViewElement);
    this.setupFloor();
    this.setupLighting();
    this.initCameraMesh();
    this.setupTrajectoryVisualization();

    this.placementController = new PlacementController(
      this.worldRenderer,
      this.worldCamera,
      this.worldScene,
      this.worldControls
    );
  }

  async addSingleSubject(
    subject: Subject,
    position: THREE.Vector3
  ): Promise<void> {
    const mainMesh = await createSubjectMesh(subject, false);
    mainMesh.position.copy(position);
    this.scene.add(mainMesh);
    this.subjectMeshes.push(mainMesh);

    const worldMesh = await createSubjectMesh(subject, true);
    worldMesh.position.copy(position);
    this.worldScene.add(worldMesh);
    this.worldSubjectMeshes.push(worldMesh);

    this.subjectMeshMap.set(subject.id, { main: mainMesh, world: worldMesh });
  }

  removeSingleSubject(subjectId: string): void {
    const entry = this.subjectMeshMap.get(subjectId);
    if (!entry) return;

    entry.main.traverse(this.disposeObject);
    this.scene.remove(entry.main);

    entry.world.traverse(this.disposeObject);
    this.worldScene.remove(entry.world);

    this.subjectMeshes = this.subjectMeshes.filter((m) => m !== entry.main);
    this.worldSubjectMeshes = this.worldSubjectMeshes.filter(
      (m) => m !== entry.world
    );
    this.subjectMeshMap.delete(subjectId);
  }

  repositionSubject(subjectId: string, position: THREE.Vector3): void {
    const entry = this.subjectMeshMap.get(subjectId);
    if (!entry) return;
    entry.main.position.copy(position);
    entry.world.position.copy(position);
  }

  startPlacement(
    subject: Subject,
    onConfirm: PlacementCallback,
    onPreview?: PreviewCallback
  ): void {
    this.placementController.startPlacement(subject, onConfirm, onPreview);
  }

  cancelPlacement(): void {
    this.placementController.cancelPlacement();
  }

  private setupFloor(): void {
    const floorGeometry = new THREE.PlaneGeometry(1000, 1000);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xeeeeaa,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -10;
    floor.receiveShadow = true;
    this.worldScene.add(floor);
    this.scene.add(floor.clone());
  }

  private setupMainScene(cameraViewElement: HTMLDivElement): void {
    this.renderer.setSize(window.innerWidth / 5, window.innerHeight / 5);
    this.renderer.setClearColor(0xffffff, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    cameraViewElement.appendChild(this.renderer.domElement);
  }

  private setupWorldScene(worldViewElement: HTMLDivElement): void {
    this.worldRenderer.setSize(window.innerWidth, window.innerHeight);
    this.worldRenderer.setClearColor(0x000000, 0);
    worldViewElement.appendChild(this.worldRenderer.domElement);

    this.worldCamera.position.set(20, 20, 20);

    // Smooth OrbitControls navigation
    this.worldControls.enableDamping = true;
    this.worldControls.dampingFactor = 0.05;
    this.worldControls.panSpeed = 0.8;
    this.worldControls.zoomSpeed = 1.2;
    this.worldControls.screenSpacePanning = true;
    this.worldControls.maxPolarAngle = Math.PI / 2 + 0.1; // Restrict camera mostly above floor

    this.worldControls.update();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 20;
    this.scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0xffffff, 1.0);
    pointLight1.position.set(-5, 5, -5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffffff, 1.0);
    pointLight2.position.set(5, 5, 5);
    this.scene.add(pointLight2);

    const spotLight = new THREE.SpotLight(0xffffff, 1.0);
    spotLight.position.set(0, 10, 0);
    spotLight.angle = Math.PI / 3;
    spotLight.penumbra = 0.1;
    spotLight.decay = 2;
    spotLight.distance = 200;
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    spotLight.shadow.camera.near = 1;
    spotLight.shadow.camera.far = 200;
    this.scene.add(spotLight);

    const worldAmbientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.worldScene.add(worldAmbientLight);

    const worldDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    worldDirectionalLight.position.set(1, 1, 1);
    this.worldScene.add(worldDirectionalLight);
  }

  private setupTrajectoryVisualization(): void {
    this.worldScene.add(this.cameraTrajectoryGroup);
  }

  onWindowResize(): void {
    if (window.innerWidth / window.innerHeight > DEFAULT_ASPECT_RATIO) {
      this.renderer.setSize(
        DEFAULT_ASPECT_RATIO * window.innerHeight,
        window.innerHeight
      );
    } else {
      this.renderer.setSize(
        window.innerWidth,
        window.innerWidth / DEFAULT_ASPECT_RATIO
      );
    }
  }

  private cameraMesh: THREE.Group | null = null;

  private initCameraMesh(): void {
    if (this.cameraMesh) {
      this.worldScene.remove(this.cameraMesh);
      this.cameraMesh.traverse(this.disposeObject);
    }

    this.cameraMesh = CameraMeshCreator.createCameraMesh();
    this.worldScene.add(this.cameraMesh);
  }

  private createTrajectoryLine(
    positions: THREE.Vector3[],
    color: number
  ): THREE.Line {
    const geometry = new THREE.BufferGeometry().setFromPoints(positions);
    const material = new THREE.LineBasicMaterial({
      color: color,
      linewidth: 3,
      transparent: true,
      opacity: 0.8,
    });
    return new THREE.Line(geometry, material);
  }

  private createTrajectoryPoints(
    positions: THREE.Vector3[],
    color: number
  ): THREE.Points {
    const geometry = new THREE.BufferGeometry().setFromPoints(positions);
    const material = new THREE.PointsMaterial({
      color: color,
      size: 0.1,
      transparent: true,
      opacity: 0.9,
    });
    return new THREE.Points(geometry, material);
  }

  private updateCameraTrajectory(): void {
    this.cameraTrajectoryGroup.traverse(this.disposeObject);
    this.cameraTrajectoryGroup.clear();

    this.cameraTrajectoryGroup.visible = this._showCameraPath;

    if (this.cameraFrames.length < 2) return;

    const positions = this.cameraFrames.map((frame) => frame.position.clone());

    const trajectoryLine = this.createTrajectoryLine(positions, 0x0088ff);
    this.cameraTrajectoryGroup.add(trajectoryLine);

    const trajectoryPoints = this.createTrajectoryPoints(positions, 0x0044aa);
    this.cameraTrajectoryGroup.add(trajectoryPoints);

    const startSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    startSphere.position.copy(positions[0]);
    this.cameraTrajectoryGroup.add(startSphere);

    const endSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    endSphere.position.copy(positions[positions.length - 1]);
    this.cameraTrajectoryGroup.add(endSphere);
  }

  private updateSubjectTrajectories(): void {
    this.subjectTrajectoryGroups.forEach((group) => {
      group.traverse(this.disposeObject);
      this.worldScene.remove(group);
      group.clear();
    });
    this.subjectTrajectoryGroups = [];

    this.subjectsInfo.forEach((subjectInfo, index) => {
      if (!subjectInfo.frames || subjectInfo.frames.length < 2) return;

      const trajectoryGroup = new THREE.Group();
      const positions = subjectInfo.frames
        .filter((frame) => frame !== undefined)
        .map((frame) => frame!.position.clone());

      if (positions.length < 2) return;

      const colors = [0xff8800, 0x8800ff, 0xff0088, 0x00ff88, 0x88ff00];
      const color = colors[index % colors.length];

      const trajectoryLine = this.createTrajectoryLine(positions, color);
      trajectoryGroup.add(trajectoryLine);

      const trajectoryPoints = this.createTrajectoryPoints(positions, color);
      trajectoryGroup.add(trajectoryPoints);

      const startCube = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 0.3),
        new THREE.MeshBasicMaterial({
          color: color,
          opacity: 0.8,
          transparent: true,
        })
      );
      startCube.position.copy(positions[0]);
      trajectoryGroup.add(startCube);

      const endCube = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 0.3),
        new THREE.MeshBasicMaterial({
          color: color,
          opacity: 0.4,
          transparent: true,
        })
      );
      endCube.position.copy(positions[positions.length - 1]);
      trajectoryGroup.add(endCube);

      trajectoryGroup.visible = this._showSubjectPaths;
      this.subjectTrajectoryGroups.push(trajectoryGroup);
      this.worldScene.add(trajectoryGroup);
    });
  }

  setCameraTrajectoryVisibility(visible: boolean): void {
    this._showCameraPath = visible;
    this.cameraTrajectoryGroup.visible = visible;
  }

  setSubjectTrajectoryVisibility(visible: boolean): void {
    this._showSubjectPaths = visible;
    this.subjectTrajectoryGroups.forEach((group) => {
      group.visible = visible;
    });
  }

  updateCamera(camera: CameraParameters): void {
    this.camera.position.copy(camera.position);
    this.camera.rotation.copy(camera.rotation);
    this.camera.aspect = camera.aspectRatio;
    this.camera.setFocalLength(camera.focalLength);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();

    if (this.cameraMesh) {
      this.cameraMesh.position.copy(camera.position);
      this.cameraMesh.rotation.copy(camera.rotation);
    }

    if (!this.cameraHelper) {
      this.cameraHelper = new THREE.CameraHelper(this.camera);
      this.worldScene.add(this.cameraHelper);
    }
    this.cameraHelper.update();
  }

  updateSubjectFrame(index: number, frame?: SubjectFrame): void {
    if (!frame) {
      return;
    }

    const mainMesh = this.subjectMeshes[index];
    const worldMesh = this.worldSubjectMeshes[index];

    if (!mainMesh || !worldMesh) {
      return;
    }

    mainMesh.position.copy(frame.position.clone());
    worldMesh.position.copy(frame.position.clone());

    mainMesh.rotation.copy(frame.rotation || new THREE.Euler());
    worldMesh.rotation.copy(frame.rotation || new THREE.Euler());
  }

  updateSubjects(subjectsFrameInfo: SubjectFrameInfo[]): void {
    subjectsFrameInfo.forEach((subjectFrameInfo, index) =>
      this.updateSubjectFrame(index, subjectFrameInfo.frame)
    );
  }

  updateSubjectTrajectoriesFromInfo(subjectsInfo: SubjectInfo[]): void {
    this.subjectsInfo = subjectsInfo;
    this.updateSubjectTrajectories();
  }

  initSubjects(subjectsInfo: SubjectInfo[]): void {
    this.subjectMeshes.forEach((mesh) => {
      mesh.traverse(this.disposeObject);
      this.scene.remove(mesh);
    });
    this.worldSubjectMeshes.forEach((mesh) => {
      mesh.traverse(this.disposeObject);
      this.worldScene.remove(mesh);
    });

    this.subjectMeshes = [];
    this.worldSubjectMeshes = [];
    this.subjectMeshMap.clear();
    this.subjectsInfo = subjectsInfo;

    subjectsInfo.forEach(async (subjectInfo, index) => {
      const mesh = await createSubjectMesh(subjectInfo.subject, false);

      this.scene.add(mesh);
      this.subjectMeshes.push(mesh);

      const worldMesh = await createSubjectMesh(subjectInfo.subject, true);
      this.worldScene.add(worldMesh);
      this.worldSubjectMeshes.push(worldMesh);

      this.subjectMeshMap.set(subjectInfo.subject.id, {
        main: mesh,
        world: worldMesh,
      });

      this.updateSubjectFrame(index, subjectInfo.frames![0]);
    });

    this.updateSubjectTrajectories();
  }

  updateCameraFrames(cameraFrames: CameraParameters[]): void {
    this.cameraFrames = cameraFrames;
    this.updateCameraTrajectory();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
    this.worldRenderer.render(this.worldScene, this.worldCamera);
    this.worldControls.update();
  }

  dispose(): void {
    this.placementController.dispose();

    if (this.cameraMesh) {
      this.worldScene.remove(this.cameraMesh);
      this.cameraMesh.traverse(this.disposeObject);
    }

    this.cameraTrajectoryGroup.traverse(this.disposeObject);
    this.cameraTrajectoryGroup.clear();

    this.subjectTrajectoryGroups.forEach((group) => {
      group.traverse(this.disposeObject);
      this.worldScene.remove(group);
      group.clear();
    });

    this.scene.traverse(this.disposeObject);
    this.worldScene.traverse(this.disposeObject);

    this.renderer.dispose();
    this.worldRenderer.dispose();
    this.worldControls.dispose();
  }

  private disposeObject = (object: THREE.Object3D): void => {
    if (
      object instanceof THREE.Mesh ||
      object instanceof THREE.Line ||
      object instanceof THREE.Points
    ) {
      object.geometry?.dispose();

      if (object.material instanceof THREE.Material) {
        object.material.dispose();
      } else if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose());
      }
    }
  };
}
