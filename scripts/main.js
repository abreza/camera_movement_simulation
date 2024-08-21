import { Renderer } from "./Renderer.js";
import { PositionCalculator } from "./PositionCalculator.js";
import { InstructionManager } from "./InstructionManager.js";
import { setupUIInteractions } from "./uiInteractions.js";

class App {
  constructor() {
    this.positionCalculator = new PositionCalculator();
    this.renderer = new Renderer();
    this.instructionManager = new InstructionManager(this.positionCalculator);

    this.lastTime = 0;
    this.isSimulating = false;

    this.setupInitialSubjects();
    setupUIInteractions(this.instructionManager, () => this.startSimulation());
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

  animate = (currentTime) => {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    if (this.isSimulating) {
      this.instructionManager.update(deltaTime);
      if (this.instructionManager.isSimulationComplete()) {
        this.isSimulating = false;
      }
    }

    const cameraPosition = this.positionCalculator.getCameraPosition();
    const cameraLookAt = this.positionCalculator.getCameraLookAt();
    const subjects = this.positionCalculator.getSubjects();

    this.renderer.updateScene(cameraPosition, cameraLookAt, subjects);
    this.renderer.render();

    requestAnimationFrame(this.animate);
  };

  startSimulation() {
    if (this.instructionManager.hasInstructions()) {
      this.isSimulating = true;
      this.instructionManager.startSimulation();
    }
  }

  run() {
    requestAnimationFrame(this.animate);
  }
}

const app = new App();
app.run();
