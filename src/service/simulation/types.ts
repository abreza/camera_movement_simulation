import { SubjectFrame, Subject } from "../subjects/types";
import {
  CameraParameters,
  CinematographyInstruction,
} from "./instruction/types";

export type SimulationFrame = {
  camera: CameraParameters;
  subjectsFrames: Record<string, SubjectFrame[]>;
};

export type Simulation = {
  subjects: Subject[];
  instructions: CinematographyInstruction[];
  frames: SimulationFrame[];
};
