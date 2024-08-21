import * as THREE from "three";
import { Renderer } from "./Renderer.js";
import { PositionCalculator } from "./PositionCalculator.js";
import { InstructionManager } from "./InstructionManager.js";
import { setupUIInteractions } from "./uiInteractions.js";

class App {
  constructor() {
    this.positionCalculator = new PositionCalculator();
    this.renderer = new Renderer();
    this.instructionManager = new InstructionManager(this.positionCalculator);

    this.isSimulating = false;
    this.simulationData = [];
    this.frameCount = 0;
    this.currentFrame = 0;

    this.setupInitialSubjects();
    setupUIInteractions(
      this.instructionManager,
      () => this.startSimulation(),
      () => this.downloadJSON()
    );
  }

  setupInitialSubjects() {
    this.positionCalculator.addSubject(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 1, 1)
    );
    this.positionCalculator.addSubject(
      new THREE.Vector3(3, 0, 0),
      new THREE.Vector3(1, 1, 1)
    );
    this.positionCalculator.addSubject(
      new THREE.Vector3(-3, 0, 0),
      new THREE.Vector3(1, 1, 1)
    );
  }

  animate = () => {
    if (this.isSimulating) {
      const frame = this.simulationData[this.currentFrame];
      this.updateSceneFromFrame(frame);
      this.currentFrame++;

      if (this.currentFrame >= this.frameCount) {
        this.currentFrame = 0;
      }
    } else {
      const cameraPosition = this.positionCalculator.getCameraPosition();
      const cameraLookAt = this.positionCalculator.getCameraLookAt();
      const subjects = this.positionCalculator.getSubjects();
      this.renderer.updateScene(cameraPosition, cameraLookAt, subjects);
    }

    this.renderer.render();
    requestAnimationFrame(this.animate);
  };

  updateSceneFromFrame(frame) {
    const cameraPosition = new THREE.Vector3().fromArray(frame.cameraPosition);
    const cameraLookAt = new THREE.Vector3().fromArray(frame.cameraLookAt);
    const subjects = frame.subjects.map((subject) => ({
      position: new THREE.Vector3().fromArray(subject.position),
      size: new THREE.Vector3().fromArray(subject.size),
    }));

    this.renderer.updateScene(cameraPosition, cameraLookAt, subjects);
  }

  startSimulation() {
    if (this.instructionManager.hasInstructions()) {
      this.frameCount = parseInt(document.getElementById("frameCount").value);
      if (this.frameCount < 1) {
        alert("Please enter a valid frame count (minimum 1)");
        return;
      }
      this.captureAllFrames();
    }
  }

  captureAllFrames() {
    this.simulationData = [];
    this.instructionManager.startSimulation();

    for (let i = 0; i < this.frameCount; i++) {
      const progress = i / (this.frameCount - 1);
      this.instructionManager.updateToProgress(progress);
      this.captureFrame(i);
    }

    this.isSimulating = true;
    this.currentFrame = 0;
    this.enableDownloadButton();
  }

  captureFrame(frameNumber) {
    const cameraPosition = this.positionCalculator.getCameraPosition();
    const cameraLookAt = this.positionCalculator.getCameraLookAt();
    const subjects = this.positionCalculator.getSubjects();

    this.simulationData.push({
      frame: frameNumber,
      cameraPosition: cameraPosition.toArray(),
      cameraLookAt: cameraLookAt.toArray(),
      subjects: subjects.map((subject) => ({
        position: subject.position.toArray(),
        size: subject.size.toArray(),
      })),
    });
  }

  enableDownloadButton() {
    const downloadBtn = document.getElementById("downloadBtn");
    downloadBtn.disabled = false;
  }

  downloadJSON() {
    const jsonData = JSON.stringify(this.simulationData, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "simulation_data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  run() {
    requestAnimationFrame(this.animate);
  }
}

const app = new App();
app.run();
