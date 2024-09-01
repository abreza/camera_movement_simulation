import * as THREE from "three";
import { Subject } from "@/types/simulation";
import { SceneManager } from "./SceneManager";
import { ModelLoader } from "./ModelLoader";
import { SubjectMeshCreator } from "./SubjectMeshCreator";

export class Renderer {
  private cameraViewElement: HTMLDivElement;
  private worldViewElement: HTMLDivElement;
  private sceneManager: SceneManager;
  private modelLoader: ModelLoader;
  private subjectMeshCreator: SubjectMeshCreator;
  private resizeHandler: () => void;

  constructor(
    cameraViewElement: HTMLDivElement,
    worldViewElement: HTMLDivElement
  ) {
    this.cameraViewElement = cameraViewElement;
    this.worldViewElement = worldViewElement;
    this.sceneManager = new SceneManager(cameraViewElement, worldViewElement);
    this.modelLoader = new ModelLoader();
    this.subjectMeshCreator = new SubjectMeshCreator(this.modelLoader);

    this.resizeHandler = this.onWindowResize.bind(this);
    window.addEventListener("resize", this.resizeHandler, false);

    this.modelLoader.loadObjectModels();
  }

  private onWindowResize(): void {
    this.sceneManager.onWindowResize();
  }

  updateScene(
    cameraPosition: THREE.Vector3,
    cameraLookAt: THREE.Vector3,
    focalLength: number,
    subjects: Subject[]
  ): void {
    this.sceneManager.updateCamera(cameraPosition, cameraLookAt, focalLength);
    this.sceneManager.updateSubjects(subjects, this.subjectMeshCreator);
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
