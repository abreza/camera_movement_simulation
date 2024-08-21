export function setupUIInteractions(
  instructionManager,
  startSimulation,
  downloadJSON
) {
  const addInstructionBtn = document.getElementById("addInstruction");
  const simulateBtn = document.getElementById("simulateBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const toggleBtn = document.getElementById("toggle-sidebar");
  const frameCountInput = document.getElementById("frameCount");

  addInstructionBtn.addEventListener("click", () =>
    addInstruction(instructionManager)
  );
  simulateBtn.addEventListener("click", startSimulation);
  downloadBtn.addEventListener("click", downloadJSON);
  toggleBtn.addEventListener("click", toggleSidebar);

  frameCountInput.addEventListener("input", () => {
    const value = parseInt(frameCountInput.value);
    if (value < 1) {
      frameCountInput.value = 1;
    }
  });

  updateInstructionList(instructionManager);
}

function addInstruction(instructionManager) {
  const instructionType = document.getElementById("instructionType").value;
  const subjectIndex = document.getElementById("subjectSelect").value;
  const duration = parseInt(document.getElementById("duration").value);

  const instruction = `${instructionType},${subjectIndex},${duration}`;
  instructionManager.addInstruction(instruction);

  updateInstructionList(instructionManager);
}

function updateInstructionList(instructionManager) {
  const instructionList = document.getElementById("instructionList");
  instructionList.innerHTML = "";
  instructionManager.getInstructions().forEach((instruction, index) => {
    const [type, subject, duration] = instruction.split(",");
    const listItem = document.createElement("li");
    listItem.innerHTML = `
          ${type} Subject ${subject} (${duration}ms)
          <button class="edit-btn" data-index="${index}">Edit</button>
          <button class="delete-btn" data-index="${index}">Delete</button>
      `;
    instructionList.appendChild(listItem);
  });

  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", (event) =>
      editInstruction(event, instructionManager)
    );
  });
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (event) =>
      deleteInstruction(event, instructionManager)
    );
  });
}

function editInstruction(event, instructionManager) {
  const index = event.target.dataset.index;
  const [type, subject, duration] = instructionManager
    .getInstructions()
    [index].split(",");

  document.getElementById("instructionType").value = type;
  document.getElementById("subjectSelect").value = subject;
  document.getElementById("duration").value = duration;

  instructionManager.deleteInstruction(index);
  updateInstructionList(instructionManager);
}

function deleteInstruction(event, instructionManager) {
  const index = event.target.dataset.index;
  instructionManager.deleteInstruction(index);
  updateInstructionList(instructionManager);
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("-translate-x-64");
}
