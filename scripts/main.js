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
function animate(currentTime) {
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  positionCalculator.updatePositions(deltaTime);

  const cameraPosition = positionCalculator.getCameraPosition();
  const cameraLookAt = positionCalculator.getCameraLookAt();
  const subjects = positionCalculator.getSubjects();

  renderer.updateScene(cameraPosition, cameraLookAt, subjects);

  renderer.render();

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

function executeInstruction(instruction) {
  positionCalculator.executeInstruction(instruction);
}

document
  .getElementById("zoomInBtn")
  .addEventListener("click", () => executeInstruction("zoomIn, 1"));
document
  .getElementById("zoomOutBtn")
  .addEventListener("click", () => executeInstruction("zoomOut, 2"));
document
  .getElementById("moveAroundBtn")
  .addEventListener("click", () => executeInstruction("moveAround, 3"));
