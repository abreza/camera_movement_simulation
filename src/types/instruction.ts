export type InstructionType = "zoomIn" | "zoomOut" | "moveAround";

export interface Instruction {
  type: InstructionType;
  subject: string;
  duration: number;
}
