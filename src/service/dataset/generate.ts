import {
  CameraParameters,
  CinematographyPrompt,
  SimulationInstruction,
} from "@/service/simulation/instruction/types";
import { translatePromptToSimulationInstruction } from "@/service/simulation/instruction/high-level/translator";
import { generateSubjects } from "@/service/subjects/generateSubjects";
import { ObjectClass, Subject, SubjectInfo } from "@/service/subjects/types";
import { generateRandomCinematographyPrompt } from "../simulation/instruction/high-level/generator";
import {
  generateFrames,
  movementGenerators,
} from "@/service/subjects/generateFrames";
import { calculateCameraPositions } from "../simulation/optimization";

export interface GenerateDatasetConfig {
  simulationCount: number;
  subjectCount?: number;
  instructionCount?: number;
  minFrameCount?: number;
  maxFrameCount?: number;
  subjectClassProbabilities?: Partial<Record<ObjectClass, number>>;
}

interface SimulationData {
  subjectsInfo: SubjectInfo[];
  cinematographyPrompts: CinematographyPrompt[];
  simulationInstructions: SimulationInstruction[];
  cameraFrames: CameraParameters[];
}

function assignRandomMovements(subjects: Subject[]): Record<string, string> {
  const movements: Record<string, string> = {};
  const movementTypes = Object.keys(movementGenerators);

  subjects.forEach((subject) => {
    const randomMovement =
      movementTypes[Math.floor(Math.random() * movementTypes.length)];
    movements[subject.id] = randomMovement;
  });

  return movements;
}

export function generateRandomDataset(
  config: GenerateDatasetConfig
): SimulationData[] {
  const {
    simulationCount = 1000,
    subjectCount = 1,
    instructionCount = 1,
    minFrameCount = 30,
    maxFrameCount = 30,
    subjectClassProbabilities,
  } = config;

  const dataset: SimulationData[] = [];

  for (let s = 0; s < simulationCount; s++) {
    const subjects = generateSubjects(subjectCount, subjectClassProbabilities);

    const subjectMovements = assignRandomMovements(subjects);

    const subjectFrames = generateFrames(subjects, subjectMovements);

    const cinematographyPrompts: CinematographyPrompt[] = [];
    const simulationInstructions: SimulationInstruction[] = [];

    for (let i = 0; i < instructionCount; i++) {
      const frameCount =
        Math.floor(Math.random() * (maxFrameCount - minFrameCount + 1)) +
        minFrameCount;

      const prompt = generateRandomCinematographyPrompt();
      cinematographyPrompts.push(prompt);

      const instruction = translatePromptToSimulationInstruction(prompt, {
        frameCount,
        subjectIndex: Math.floor(Math.random() * subjects.length),
      });
      simulationInstructions.push(instruction);
    }

    const subjectsInfo = subjects.map((subject, index) => ({
      subject,
      frames: subjectFrames[index],
    }));

    const cameraFrames = calculateCameraPositions(
      simulationInstructions,
      subjectsInfo
    );

    dataset.push({
      subjectsInfo,
      cinematographyPrompts,
      simulationInstructions,
      cameraFrames,
    });
  }

  const jsonString = JSON.stringify(
    dataset,
    (key, value) => {
      if (value?.isVector3) {
        return { x: value.x, y: value.y, z: value.z };
      }
      if (value?.isEuler) {
        return { x: value.x, y: value.y, z: value.z };
      }
      return value;
    },
    2
  );

  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cinematography_dataset.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return dataset;
}
