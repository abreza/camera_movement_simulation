import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Subject } from "../subjects/types";
import { createSubjectMesh } from "./SubjectMeshCreator";

export type PlacementPosition = { x: number; y: number; z: number; rotationY?: number };
export type PlacementCallback = (position: PlacementPosition) => void;
export type PreviewCallback = (position: PlacementPosition | null) => void;

export class PlacementController {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private controls: OrbitControls;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private groundPlane: THREE.Plane;

  private ghostMesh: THREE.Object3D | null = null;
  private gridHelper: THREE.GridHelper | null = null;
  private isPlacing = false;
  private subject: Subject | null = null;
  private onConfirm: PlacementCallback | null = null;
  private onPreview: PreviewCallback | null = null;

  private currentRotation: number = 0;
  private lastIntersection: THREE.Vector3 | null = null;

  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseClick: (e: MouseEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundWheel: (e: WheelEvent) => void;

  constructor(
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    controls: OrbitControls
  ) {
    this.renderer = renderer;
    this.camera = camera;
    this.scene = scene;
    this.controls = controls;

    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseClick = this.onClick.bind(this);
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundWheel = this.onWheel.bind(this);
  }

  async startPlacement(
    subject: Subject,
    onConfirm: PlacementCallback,
    onPreview?: PreviewCallback
  ): Promise<void> {
    this.isPlacing = true;
    this.subject = subject;
    this.onConfirm = onConfirm;
    this.onPreview = onPreview ?? null;
    this.currentRotation = 0;
    this.lastIntersection = null;

    this.controls.enabled = false;

    this.gridHelper = new THREE.GridHelper(40, 40, 0x444444, 0x222222);
    this.gridHelper.position.y = 0.01;
    this.scene.add(this.gridHelper);

    try {
      const mesh = await createSubjectMesh(subject, true);
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.material instanceof THREE.Material) {
            child.material = child.material.clone();
            child.material.transparent = true;
            child.material.opacity = 0.5;
            child.material.needsUpdate = true;
          } else if (Array.isArray(child.material)) {
            child.material = child.material.map((mat) => {
              const m = mat.clone();
              m.transparent = true;
              m.opacity = 0.5;
              m.needsUpdate = true;
              return m;
            });
          }
        }
      });
      mesh.visible = false;
      this.ghostMesh = mesh;
      this.scene.add(mesh);
    } catch {
      const geo = new THREE.BoxGeometry(
        subject.dimensions.width,
        subject.dimensions.height,
        subject.dimensions.depth
      );
      const mat = new THREE.MeshBasicMaterial({
        color: 0x4ea8de,
        transparent: true,
        opacity: 0.45,
        wireframe: false,
      });
      this.ghostMesh = new THREE.Mesh(geo, mat);
      this.ghostMesh.visible = false;
      this.scene.add(this.ghostMesh);
    }

    const domElement = this.renderer.domElement;
    domElement.addEventListener("mousemove", this.boundMouseMove);
    domElement.addEventListener("click", this.boundMouseClick);
    domElement.addEventListener("wheel", this.boundWheel, { passive: false });
    window.addEventListener("keydown", this.boundKeyDown);

    domElement.style.cursor = "crosshair";
  }

  cancelPlacement(): void {
    this.cleanup();
  }

  get active(): boolean {
    return this.isPlacing;
  }

  private getGroundIntersection(event: MouseEvent): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersection = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(
      this.groundPlane,
      intersection
    );

    return hit ? intersection : null;
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isPlacing) return;

    const point = this.getGroundIntersection(event);
    this.lastIntersection = point;

    if (point && this.ghostMesh) {
      this.ghostMesh.visible = true;
      this.ghostMesh.position.set(
        point.x,
        (this.subject?.dimensions.height ?? 1) / 2,
        point.z
      );
      this.ghostMesh.rotation.y = this.currentRotation;
    }

    if (this.onPreview) {
      this.onPreview(
        point ? { x: point.x, y: 0, z: point.z, rotationY: this.currentRotation } : null
      );
    }
  }

  private onWheel(event: WheelEvent): void {
    if (!this.isPlacing) return;
    event.preventDefault();

    this.currentRotation -= Math.sign(event.deltaY) * (Math.PI / 12);

    if (this.ghostMesh) {
      this.ghostMesh.rotation.y = this.currentRotation;
    }

    if (this.onPreview && this.lastIntersection) {
      this.onPreview({
        x: this.lastIntersection.x,
        y: 0,
        z: this.lastIntersection.z,
        rotationY: this.currentRotation
      });
    }
  }

  private onClick(event: MouseEvent): void {
    if (!this.isPlacing) return;

    const point = this.getGroundIntersection(event);
    if (point && this.onConfirm) {
      this.onConfirm({ x: point.x, y: 0, z: point.z, rotationY: this.currentRotation });
    }
    this.cleanup();
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      this.cancelPlacement();
    }
  }

  private cleanup(): void {
    this.isPlacing = false;
    this.subject = null;
    this.onConfirm = null;
    this.onPreview = null;
    this.lastIntersection = null;

    this.controls.enabled = true;

    if (this.ghostMesh) {
      this.ghostMesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });
      this.scene.remove(this.ghostMesh);
      this.ghostMesh = null;
    }

    if (this.gridHelper) {
      this.gridHelper.geometry?.dispose();
      (this.gridHelper.material as THREE.Material)?.dispose();
      this.scene.remove(this.gridHelper);
      this.gridHelper = null;
    }

    const domElement = this.renderer.domElement;
    domElement.removeEventListener("mousemove", this.boundMouseMove);
    domElement.removeEventListener("click", this.boundMouseClick);
    domElement.removeEventListener("wheel", this.boundWheel);
    window.removeEventListener("keydown", this.boundKeyDown);

    domElement.style.cursor = "default";
  }

  dispose(): void {
    this.cleanup();
  }
}
