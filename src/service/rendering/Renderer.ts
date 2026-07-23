import { SceneManager } from "./SceneManager";
import { SubjectFrameInfo, SubjectInfo, Subject } from "../subjects/types";
import { CameraParameters } from "../simulation/instruction/types";
import * as THREE from "three";
import { PlacementCallback, PreviewCallback } from "./PlacementController";

export class Renderer {
  private cameraViewElement: HTMLDivElement;
  private worldViewElement: HTMLDivElement;
  public sceneManager: SceneManager;
  private resizeHandler: () => void;

  constructor(
    cameraViewElement: HTMLDivElement,
    worldViewElement: HTMLDivElement
  ) {
    this.cameraViewElement = cameraViewElement;
    this.worldViewElement = worldViewElement;
    this.sceneManager = new SceneManager(cameraViewElement, worldViewElement);

    this.resizeHandler = this.onWindowResize.bind(this);
    window.addEventListener("resize", this.resizeHandler, false);
  }

  private onWindowResize(): void {
    this.sceneManager.onWindowResize();
  }

  updateScene(
    camera: CameraParameters,
    subjectsFrameInfo: SubjectFrameInfo[]
  ): void {
    this.sceneManager.updateCamera(camera);
    this.sceneManager.updateSubjects(subjectsFrameInfo);
  }

  initSubjects(subjectsInfo: SubjectInfo[]): void {
    this.sceneManager.initSubjects(subjectsInfo);
  }

  updateSubjectTrajectories(subjectsInfo: SubjectInfo[]): void {
    this.sceneManager.updateSubjectTrajectoriesFromInfo(subjectsInfo);
  }

  updateCameraFrames(cameraFrames: CameraParameters[]): void {
    this.sceneManager.updateCameraFrames(cameraFrames);
  }

  setCameraTrajectoryVisibility(visible: boolean): void {
    this.sceneManager.setCameraTrajectoryVisibility(visible);
  }

  setSubjectTrajectoryVisibility(visible: boolean): void {
    this.sceneManager.setSubjectTrajectoryVisibility(visible);
  }

  render(): void {
    this.sceneManager.render();
  }

  startPlacement(
    subject: Subject,
    onConfirm: PlacementCallback,
    onPreview?: PreviewCallback
  ): void {
    this.sceneManager.startPlacement(subject, onConfirm, onPreview);
  }

  cancelPlacement(): void {
    this.sceneManager.cancelPlacement();
  }

  async addSingleSubject(
    subject: Subject,
    position: THREE.Vector3
  ): Promise<void> {
    await this.sceneManager.addSingleSubject(subject, position);
  }

  removeSingleSubject(subjectId: string): void {
    this.sceneManager.removeSingleSubject(subjectId);
  }

  repositionSubject(subjectId: string, position: THREE.Vector3): void {
    this.sceneManager.repositionSubject(subjectId, position);
  }

  unmount(): void {
    this.sceneManager.placementController.dispose();
    window.removeEventListener("resize", this.resizeHandler);
    this.sceneManager.dispose();
    this.cameraViewElement.innerHTML = "";
    this.worldViewElement.innerHTML = "";
  }
}
