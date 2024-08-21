export function setupUIInteractions(instructionManager, startSimulation) {
  const addInstructionBtn = document.getElementById("addInstruction");
  const simulateBtn = document.getElementById("simulateBtn");
  const toggleBtn = document.getElementById("toggle-sidebar");

  addInstructionBtn.addEventListener("click", () =>
    addInstruction(instructionManager)
  );
  simulateBtn.addEventListener("click", startSimulation);
  toggleBtn.addEventListener("click", toggleSidebar);

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

  // Add event listeners for edit and delete buttons
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
  const canvasContainer = document.getElementById("canvas-container");
  sidebar.classList.toggle("-translate-x-64");
  canvasContainer.classList.toggle("ml-64");
}
