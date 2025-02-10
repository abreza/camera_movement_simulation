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
import { encode } from "msgpackr";

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

function roundFloats(obj: any, factor = 1000): any {
  if (obj?.isVector3 || obj?.isEuler) {
    return roundFloats({ x: obj.x, y: obj.y, z: obj.z });
  } else if (typeof obj === "number") {
    return Math.round(obj * factor);
  } else if (Array.isArray(obj)) {
    return obj.map((item) => roundFloats(item, factor));
  } else if (obj && typeof obj === "object") {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = roundFloats(obj[key], factor);
    }
    return result;
  }

  return obj;
}

export async function generateRandomDataset(
  config: GenerateDatasetConfig
): Promise<void> {
  return new Promise(() => {
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
      const subjects = generateSubjects(
        subjectCount,
        subjectClassProbabilities
      );

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

      const subjectsInfo: SubjectInfo[] = subjects.map((subject, index) => ({
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

    const datasetRounded = roundFloats(dataset);

    const binaryData = encode(datasetRounded);

    const blob = new Blob([binaryData], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cinematography_dataset.mpack";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
}
