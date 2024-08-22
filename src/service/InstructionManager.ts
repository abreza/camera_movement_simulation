import { PositionCalculator } from "./PositionCalculator";

export class InstructionManager {
  private positionCalculator: PositionCalculator;
  private instructions: string[];
  private currentInstructionIndex: number;
  private totalDuration: number;

  constructor(positionCalculator: PositionCalculator) {
    this.positionCalculator = positionCalculator;
    this.instructions = [];
    this.currentInstructionIndex = 0;
    this.totalDuration = 0;
  }

  addInstruction(instruction: string): void {
    this.instructions.push(instruction);
    this.calculateTotalDuration();
  }

  editInstruction(index: number, instruction: string): void {
    this.instructions[index] = instruction;
    this.calculateTotalDuration();
  }

  deleteInstruction(index: number): void {
    this.instructions.splice(index, 1);
    this.calculateTotalDuration();
  }

  getInstructions(): string[] {
    return this.instructions;
  }

  hasInstructions(): boolean {
    return this.instructions.length > 0;
  }

  startSimulation(): void {
    this.currentInstructionIndex = 0;
    this.positionCalculator.startInstruction(this.instructions[0]);
  }

  private calculateTotalDuration(): void {
    this.totalDuration = this.instructions.reduce((total, instruction) => {
      const [, , duration] = instruction.split(",");
      return total + parseInt(duration, 10);
    }, 0);
  }

  updateToProgress(progress: number): void {
    const targetTime = progress * this.totalDuration;
    let currentTime = 0;
    let instructionIndex = 0;

    while (instructionIndex < this.instructions.length) {
      const [action, subjectIndex, duration] =
        this.instructions[instructionIndex].split(",");
      const instructionDuration = parseInt(duration, 10);

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

  isSimulationComplete(): boolean {
    return this.currentInstructionIndex >= this.instructions.length;
  }
}
