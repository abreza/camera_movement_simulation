import JSZip from "jszip";
import { pack } from "msgpackr";
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
} from "@/service/subjects/movements";
import { calculateCameraPositions } from "../simulation/optimization";
import { formatSimulationData } from "./simulationFormatter";
import { ParameterDictionary } from "./parameterDictionary";
import {
  createRandomSeed,
  createSeededRandom,
  RandomSource,
  withRandomSource,
} from "@/utils/randomUtils";

export interface GenerateDatasetConfig {
  simulationCount: number;
  subjectCount?: number;
  instructionCount?: number;
  minFrameCount?: number;
  maxFrameCount?: number;
  seed?: string | number;
  subjectClassProbabilities?: Partial<Record<ObjectClass, number>>;
  movementDistribution?: Record<string, number>;
  onProgress?: (progress: number, phase: "generating" | "zipping") => void;
  chunkSize?: number;
  noiseConfig?: {
    applyNoise?: boolean;
    positionAmplitude?: number;
    rotationAmplitude?: number;
    frequency?: number;
  };
}

function assignRandomMovements(
  subjects: Subject[],
  movementDistribution?: Record<string, number>,
  random: RandomSource = Math.random
): Record<string, string> {
  const movements: Record<string, string> = {};
  const movementTypes = Object.keys(movementGenerators);

  if (!movementDistribution) {
    subjects.forEach((subject) => {
      const randomMovement =
        movementTypes[Math.floor(random() * movementTypes.length)];
      movements[subject.id] = randomMovement;
    });
    return movements;
  }

  const totalWeight = Object.values(movementDistribution).reduce(
    (sum, weight) => sum + weight,
    0
  );

  subjects.forEach((subject) => {
    let randomWeight = random() * totalWeight;
    let selectedMovement = movementTypes[0];

    for (const [movement, weight] of Object.entries(movementDistribution)) {
      randomWeight -= weight;
      if (randomWeight <= 0) {
        selectedMovement = movement;
        break;
      }
    }

    movements[subject.id] = selectedMovement;
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
    seed: configuredSeed,
    subjectClassProbabilities,
    movementDistribution,
    onProgress,
    chunkSize = CHUNK_SIZE,
    noiseConfig,
  } = config;
  const seed = String(configuredSeed ?? createRandomSeed());
  const random = createSeededRandom(seed);
  const paddingLength = Math.floor(Math.log10(simulationCount)) + 1;

  const zip = new JSZip();
  let operationCount = 0;

  let parameterDictionary: ParameterDictionary | undefined = undefined;

  const zipOptions: JSZip.JSZipFileOptions = {
    compression: "STORE",
    compressionOptions: {
      level: 1,
    },
  };

  for (let s = 0; s < simulationCount; s++) {
    operationCount++;
    await yieldIfNeeded(operationCount, chunkSize);

    onProgress?.((s / simulationCount) * 100, "generating");

    const subjects = withRandomSource(random, () =>
      generateSubjects(subjectCount, subjectClassProbabilities)
    );
    operationCount += subjectCount;
    await yieldIfNeeded(operationCount, chunkSize);

    const subjectMovements = assignRandomMovements(
      subjects,
      movementDistribution,
      random
    );

    operationCount += subjects.length;
    await yieldIfNeeded(operationCount, chunkSize);

    const cinematographyPrompts: CinematographyPrompt[] = [];
    const simulationInstructions: SimulationInstruction[] = [];

    for (let i = 0; i < instructionCount; i++) {
      operationCount++;
      await yieldIfNeeded(operationCount, chunkSize);

      const frameCount =
        Math.floor(random() * (maxFrameCount - minFrameCount + 1)) +
        minFrameCount;

      const prompt = withRandomSource(random, () =>
        generateRandomCinematographyPrompt()
      );
      cinematographyPrompts.push(prompt);

      const instruction = translatePromptToSimulationInstruction(prompt, {
        frameCount,
        subjectIndex: Math.floor(random() * subjects.length),
      });
      simulationInstructions.push(instruction);
    }

    const totalFrameCount = simulationInstructions.reduce(
      (sum, instruction) => sum + instruction.frameCount,
      0
    );
    const subjectFrames = withRandomSource(random, () =>
      generateFrames(subjects, subjectMovements, {
        ...noiseConfig,
        frameCount: totalFrameCount,
      })
    );
    operationCount += subjects.length * totalFrameCount;
    await yieldIfNeeded(operationCount, chunkSize);

    const subjectsInfo: SubjectInfo[] = subjects.map((subject, index) => ({
      subject,
      frames: subjectFrames[index],
      movementType: subjectMovements[subject.id],
    }));
    operationCount += subjects.length;
    await yieldIfNeeded(operationCount, chunkSize);

    const cameraFrames = withRandomSource(random, () =>
      calculateCameraPositions(simulationInstructions, subjectsInfo)
    );

    const simulationData = {
      cinematographyPrompts,
      simulationInstructions,
      subjectsInfo,
      cameraFrames,
    };

    const { formattedData, parameterDictionary: newParameterDictionary } =
      formatSimulationData(simulationData, parameterDictionary);

    parameterDictionary = newParameterDictionary;

    const packedData = pack(formattedData);
    zip.file(
      `simulation_${s.toString().padStart(paddingLength, "0")}.msgpack`,
      new Uint8Array(packedData),
      zipOptions
    );

    const totalFramesProcessed = simulationInstructions.reduce(
      (sum, instruction) => sum + instruction.frameCount,
      0
    );
    operationCount += totalFramesProcessed;
    await yieldIfNeeded(operationCount, chunkSize);
  }

  const packedDictionary = pack(parameterDictionary || {});
  zip.file(
    "parameter_dictionary.msgpack",
    new Uint8Array(packedDictionary),
    zipOptions
  );

  const manifest = {
    schemaVersion: 1,
    generatorVersion: 1,
    generatedAt: new Date().toISOString(),
    seed,
    config: {
      simulationCount,
      subjectCount,
      instructionCount,
      minFrameCount,
      maxFrameCount,
      subjectClassProbabilities: subjectClassProbabilities || null,
      movementDistribution: movementDistribution || null,
      noiseConfig: noiseConfig || null,
    },
    encoding: {
      simulationFilePattern: "simulation_*.msgpack",
      parameterDictionaryFile: "parameter_dictionary.msgpack",
      fixedPointScale: 1000,
    },
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2), zipOptions);

  const content = await zip.generateAsync(
    {
      type: "blob",
      compression: "STORE",
      compressionOptions: {
        level: 1,
      },
    },
    (metadata) => {
      onProgress?.(metadata.percent, "zipping");
    }
  );

  const url = URL.createObjectURL(content);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cinematography_dataset.zip";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
