import {
  CinematographyPrompt,
  SimulationInstruction,
  CameraParameters,
} from "../simulation/instruction/types";
import { SubjectInfo } from "../subjects/types";

export interface SimulationData {
  subjectsInfo: SubjectInfo[];
  cinematographyPrompts: CinematographyPrompt[];
  simulationInstructions: SimulationInstruction[];
  cameraFrames: CameraParameters[];
}
