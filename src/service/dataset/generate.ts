import {
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
import { exportDataset, SimulationData } from "./export";

export interface GenerateDatasetConfig {
  simulationCount: number;
  subjectCount?: number;
  instructionCount?: number;
  minFrameCount?: number;
  maxFrameCount?: number;
  subjectClassProbabilities?: Partial<Record<ObjectClass, number>>;
  onProgress?: (progress: number) => void;
  chunkSize?: number;
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

const CHUNK_SIZE = 10000;

async function yieldIfNeeded(
  operationCount: number,
  chunkSize: number = CHUNK_SIZE
): Promise<void> {
  if (operationCount % chunkSize === 0) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

export async function generateRandomDataset(
  config: GenerateDatasetConfig
): Promise<void> {
  const {
    simulationCount = 1000,
    subjectCount = 1,
    instructionCount = 1,
    minFrameCount = 30,
    maxFrameCount = 30,
    subjectClassProbabilities,
    onProgress,
    chunkSize = CHUNK_SIZE,
  } = config;

  const dataset: SimulationData[] = [];
  let operationCount = 0;

  for (let s = 0; s < simulationCount; s++) {
    operationCount++;
    await yieldIfNeeded(operationCount, chunkSize);

    if (onProgress) {
      onProgress((s / simulationCount) * 100);
    }

    const subjects = generateSubjects(subjectCount, subjectClassProbabilities);
    operationCount += subjectCount;
    await yieldIfNeeded(operationCount, chunkSize);

    const subjectMovements = assignRandomMovements(subjects);
    operationCount += subjects.length;
    await yieldIfNeeded(operationCount, chunkSize);

    const subjectFrames = generateFrames(subjects, subjectMovements);
    operationCount += subjects.length * (maxFrameCount - minFrameCount + 1);
    await yieldIfNeeded(operationCount, chunkSize);

    const cinematographyPrompts: CinematographyPrompt[] = [];
    const simulationInstructions: SimulationInstruction[] = [];

    for (let i = 0; i < instructionCount; i++) {
      operationCount++;
      await yieldIfNeeded(operationCount, chunkSize);

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
    operationCount += subjects.length;
    await yieldIfNeeded(operationCount, chunkSize);

    const cameraFrames = calculateCameraPositions(
      simulationInstructions,
      subjectsInfo
    );

    const totalFramesProcessed = simulationInstructions.reduce(
      (sum, instruction) => sum + instruction.frameCount,
      0
    );
    operationCount += totalFramesProcessed;
    await yieldIfNeeded(operationCount, chunkSize);

    dataset.push({
      subjectsInfo,
      cinematographyPrompts,
      simulationInstructions,
      cameraFrames,
    });
  }

  await yieldIfNeeded(operationCount, chunkSize);
  await exportDataset(dataset);
}
