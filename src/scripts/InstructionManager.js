export class InstructionManager {
  constructor(positionCalculator) {
    this.positionCalculator = positionCalculator;
    this.instructions = [];
    this.currentInstructionIndex = 0;
  }

  addInstruction(instruction) {
    this.instructions.push(instruction);
  }

  editInstruction(index, instruction) {
    this.instructions[index] = instruction;
  }

  deleteInstruction(index) {
    this.instructions.splice(index, 1);
  }

  getInstructions() {
    return this.instructions;
  }

  hasInstructions() {
    return this.instructions.length > 0;
  }

  startSimulation() {
    this.currentInstructionIndex = 0;
    this.positionCalculator.startInstruction(
      this.instructions[this.currentInstructionIndex]
    );
  }

  update(deltaTime) {
    const currentInstruction = this.instructions[this.currentInstructionIndex];
    if (currentInstruction) {
      this.positionCalculator.updatePositions(deltaTime, currentInstruction);

      if (this.positionCalculator.isInstructionComplete()) {
        this.currentInstructionIndex++;
        if (this.currentInstructionIndex < this.instructions.length) {
          this.positionCalculator.startInstruction(
            this.instructions[this.currentInstructionIndex]
          );
        }
      }
    }
  }

  isSimulationComplete() {
    return this.currentInstructionIndex >= this.instructions.length;
  }
}
