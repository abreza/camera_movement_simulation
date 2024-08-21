import { Renderer } from "./Renderer.js";
import { PositionCalculator } from "./PositionCalculator.js";

const positionCalculator = new PositionCalculator();
const renderer = new Renderer();

positionCalculator.addSubject(
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(1, 1, 1)
);
positionCalculator.addSubject(
  new THREE.Vector3(3, 0, 0),
  new THREE.Vector3(1, 1, 1)
);
positionCalculator.addSubject(
  new THREE.Vector3(-3, 0, 0),
  new THREE.Vector3(1, 1, 1)
);

let lastTime = 0;
let isSimulating = false;
let currentInstructionIndex = 0;
let instructions = [];

function animate(currentTime) {
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  if (isSimulating) {
    const currentInstruction = instructions[currentInstructionIndex];
    if (currentInstruction) {
      positionCalculator.updatePositions(deltaTime, currentInstruction);

      if (positionCalculator.isInstructionComplete()) {
        currentInstructionIndex++;
        if (currentInstructionIndex >= instructions.length) {
          isSimulating = false;
        } else {
          positionCalculator.startInstruction(
            instructions[currentInstructionIndex]
          );
        }
      }
    }
  }

  const cameraPosition = positionCalculator.getCameraPosition();
  const cameraLookAt = positionCalculator.getCameraLookAt();
  const subjects = positionCalculator.getSubjects();

  renderer.updateScene(cameraPosition, cameraLookAt, subjects);
  renderer.render();

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

function addInstruction() {
  const instructionType = document.getElementById("instructionType").value;
  const subjectIndex = document.getElementById("subjectSelect").value;
  const duration = parseInt(document.getElementById("duration").value);

  const instruction = `${instructionType},${subjectIndex},${duration}`;
  instructions.push(instruction);

  const listItem = document.createElement("li");
  listItem.textContent = `${instructionType} Subject ${subjectIndex} (${duration}ms)`;
  document.getElementById("instructionList").appendChild(listItem);
}

function startSimulation() {
  if (instructions.length > 0) {
    isSimulating = true;
    currentInstructionIndex = 0;
    positionCalculator.startInstruction(instructions[currentInstructionIndex]);
  }
}

document
  .getElementById("addInstruction")
  .addEventListener("click", addInstruction);
document
  .getElementById("simulateBtn")
  .addEventListener("click", startSimulation);
