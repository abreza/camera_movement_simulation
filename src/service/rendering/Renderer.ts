import { SceneManager } from "./SceneManager";
import { SubjectFrameInfo, SubjectInfo } from "../subjects/types";
import { CameraParameters } from "../simulation/instruction/types";

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

  updateCameraFrames(cameraFrames: CameraParameters[]): void {
    this.sceneManager.updateCameraFrames(cameraFrames);
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
