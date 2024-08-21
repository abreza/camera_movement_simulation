export class InstructionManager {
  constructor(positionCalculator) {
    this.positionCalculator = positionCalculator;
    this.instructions = [];
    this.currentInstructionIndex = 0;
    this.totalDuration = 0;
  }

  addInstruction(instruction) {
    this.instructions.push(instruction);
    this.calculateTotalDuration();
  }

  editInstruction(index, instruction) {
    this.instructions[index] = instruction;
    this.calculateTotalDuration();
  }

  deleteInstruction(index) {
    this.instructions.splice(index, 1);
    this.calculateTotalDuration();
  }

  getInstructions() {
    return this.instructions;
  }

  hasInstructions() {
    return this.instructions.length > 0;
  }

  startSimulation() {
    this.currentInstructionIndex = 0;
    this.positionCalculator.startInstruction(this.instructions[0]);
  }

  calculateTotalDuration() {
    this.totalDuration = this.instructions.reduce((total, instruction) => {
      const [, , duration] = instruction.split(",");
      return total + parseInt(duration);
    }, 0);
  }

  updateToProgress(progress) {
    const targetTime = progress * this.totalDuration;
    let currentTime = 0;
    let instructionIndex = 0;

    while (instructionIndex < this.instructions.length) {
      const [action, subjectIndex, duration] =
        this.instructions[instructionIndex].split(",");
      const instructionDuration = parseInt(duration);

      if (currentTime + instructionDuration > targetTime) {
        const instructionProgress =
          (targetTime - currentTime) / instructionDuration;
        this.positionCalculator.startInstruction(
          this.instructions[instructionIndex]
        );
        this.positionCalculator.updatePositions(
          instructionDuration * instructionProgress
        );
        break;
      }

      currentTime += instructionDuration;
      instructionIndex++;
    }

    this.currentInstructionIndex = instructionIndex;
  }

  isSimulationComplete() {
    return this.currentInstructionIndex >= this.instructions.length;
  }
}
