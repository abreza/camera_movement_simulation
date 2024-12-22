import * as THREE from "three";
import { Subject } from "../subjects/types";
import { SceneManager } from "./SceneManager";
import { SubjectFrameInfo, SubjectInfo } from "@/types/simulation";

export class Renderer {
  private cameraViewElement: HTMLDivElement;
  private worldViewElement: HTMLDivElement;
  private sceneManager: SceneManager;
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
    cameraPosition: THREE.Vector3,
    cameraAngle: THREE.Euler,
    focalLength: number,
    subjectsFrameInfo: SubjectFrameInfo[]
  ): void {
    this.sceneManager.updateCamera(cameraPosition, cameraAngle, focalLength);
    this.sceneManager.updateSubjects(subjectsFrameInfo);
  }

  initSubjects(subjectsInfo: SubjectInfo[]): void {
    this.sceneManager.initSubjects(subjectsInfo);
  }

  render(): void {
    this.sceneManager.render();
  }

  unmount(): void {
    window.removeEventListener("resize", this.resizeHandler);
    this.sceneManager.dispose();
    this.cameraViewElement.innerHTML = "";
    this.worldViewElement.innerHTML = "";
  }
}
