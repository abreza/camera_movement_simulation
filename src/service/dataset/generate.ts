import JSZip from "jszip";
import { pack } from "msgpackr";
import { v4 as uuidv4 } from "uuid";
import {
  CameraParameters,
  CameraMovementType,
  CinematographyPrompt,
  CinematographySetup,
  SimulationInstruction,
} from "@/service/simulation/instruction/types";
import { translatePromptToSimulationInstruction } from "@/service/simulation/instruction/high-level/translator";
import {
  DEFAULT_SUBJECT_CLASS_WEIGHTS,
  generateDimensions,
} from "@/service/subjects/generateSubjects";
import { ObjectClass, Subject, SubjectInfo } from "@/service/subjects/types";
import { generateRandomCinematographyPrompt } from "../simulation/instruction/high-level/generator";
import { generateFrames } from "@/service/subjects/movements";
import { calculateCameraPositions } from "../simulation/optimization";
import {
  DATASET_FLOAT_FACTOR,
  formatSimulationData,
  quantizeCameraFramesForDataset,
  quantizeSubjectInfoForDataset,
} from "./simulationFormatter";
import {
  createParameterDictionary,
  ParameterDictionary,
} from "./parameterDictionary";
import {
  createRandomSeed,
  createSeededRandom,
  RandomSource,
  withRandomSource,
} from "@/utils/randomUtils";
import {
  alignInstructionSetupsWithTrajectory,
  createTrajectoryPrompt,
  deriveCinematographySetupFromPose,
} from "./finalSetup";
import { projectBoundingBox } from "../simulation/utils";
import { isProjectedBoundsFullyVisible } from "../simulation/rule-based/setup/framing";

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

export const DATASET_SUBJECT_COUNT = 1;
export const DATASET_INSTRUCTION_COUNT = 1;
export const MIN_DATASET_FRAME_COUNT = 100;
export const MAX_DATASET_FRAME_COUNT = 500;
export const MAX_DATASET_ROTATION_NOISE_AMPLITUDE = 0.15;

export const DATASET_MOVEMENT_TYPES = [
  "linear",
  "circular",
  "spiral",
  "figureEight",
  "wave",
  "zigzag",
  "static",
] as const;
export type DatasetMovementType = (typeof DATASET_MOVEMENT_TYPES)[number];

const DATASET_MOVEMENT_TYPE_SET = new Set<string>(DATASET_MOVEMENT_TYPES);
const DATASET_SUBJECT_CLASSES = Object.values(ObjectClass);
const DATASET_SUBJECT_CLASS_SET = new Set<string>(DATASET_SUBJECT_CLASSES);
const CHUNK_SIZE = 10000;
const MAX_OBSERVABLE_CAMERA_ATTEMPTS = 50;

type EffectiveNoiseConfig = Required<
  NonNullable<GenerateDatasetConfig["noiseConfig"]>
>;

export type NormalizedDatasetConfig = Omit<
  GenerateDatasetConfig,
  | "simulationCount"
  | "subjectCount"
  | "instructionCount"
  | "minFrameCount"
  | "maxFrameCount"
  | "subjectClassProbabilities"
  | "movementDistribution"
  | "chunkSize"
  | "noiseConfig"
> & {
  simulationCount: number;
  subjectCount: typeof DATASET_SUBJECT_COUNT;
  instructionCount: typeof DATASET_INSTRUCTION_COUNT;
  minFrameCount: number;
  maxFrameCount: number;
  subjectClassProbabilities: Record<ObjectClass, number>;
  movementDistribution: Record<DatasetMovementType, number>;
  chunkSize: number;
  noiseConfig: EffectiveNoiseConfig;
};

function normalizeMovementDistribution(
  distribution?: Record<string, number>
): Record<DatasetMovementType, number> {
  const supplied = distribution ?? Object.fromEntries(
    DATASET_MOVEMENT_TYPES.map((movement) => [movement, 1])
  );
  const unsupported = Object.keys(supplied).filter(
    (movement) => !DATASET_MOVEMENT_TYPE_SET.has(movement)
  );
  if (unsupported.length > 0) {
    throw new RangeError(
      `Unsupported dataset movement type(s): ${unsupported.join(", ")}. ` +
        `Supported types are ${DATASET_MOVEMENT_TYPES.join(", ")}.`
    );
  }

  const weights = Object.fromEntries(
    DATASET_MOVEMENT_TYPES.map((movement) => [movement, supplied[movement] ?? 0])
  ) as Record<DatasetMovementType, number>;
  for (const [movement, weight] of Object.entries(weights)) {
    if (!Number.isFinite(weight) || weight < 0) {
      throw new RangeError(
        `Movement weight for ${movement} must be a finite non-negative number.`
      );
    }
  }

  const totalWeight = Object.values(weights).reduce(
    (sum, weight) => sum + weight,
    0
  );
  if (totalWeight <= 0) {
    throw new RangeError("At least one dataset movement weight must be positive.");
  }

  return Object.fromEntries(
    DATASET_MOVEMENT_TYPES.map((movement) => [
      movement,
      weights[movement] / totalWeight,
    ])
  ) as Record<DatasetMovementType, number>;
}

function normalizeSubjectClassProbabilities(
  probabilities?: Partial<Record<ObjectClass, number>>
): Record<ObjectClass, number> {
  const unsupported = Object.keys(probabilities ?? {}).filter(
    (objectClass) => !DATASET_SUBJECT_CLASS_SET.has(objectClass)
  );
  if (unsupported.length > 0) {
    throw new RangeError(
      `Unsupported subject class(es): ${unsupported.join(", ")}.`
    );
  }

  const weights: Record<ObjectClass, number> = {
    ...DEFAULT_SUBJECT_CLASS_WEIGHTS,
    ...probabilities,
  };
  for (const [objectClass, weight] of Object.entries(weights)) {
    if (!Number.isFinite(weight) || weight < 0) {
      throw new RangeError(
        `Subject class weight for ${objectClass} must be a finite non-negative number.`
      );
    }
  }

  const totalWeight = Object.values(weights).reduce(
    (sum, weight) => sum + weight,
    0
  );
  if (totalWeight <= 0) {
    throw new RangeError("At least one subject class weight must be positive.");
  }

  return Object.fromEntries(
    DATASET_SUBJECT_CLASSES.map((objectClass) => [
      objectClass,
      weights[objectClass] / totalWeight,
    ])
  ) as Record<ObjectClass, number>;
}

function normalizeNoiseConfig(
  noiseConfig?: GenerateDatasetConfig["noiseConfig"]
): EffectiveNoiseConfig {
  const effective: EffectiveNoiseConfig = {
    applyNoise: noiseConfig?.applyNoise ?? false,
    positionAmplitude: noiseConfig?.positionAmplitude ?? 0.1,
    rotationAmplitude: noiseConfig?.rotationAmplitude ?? 0.02,
    frequency: noiseConfig?.frequency ?? 0.5,
  };
  if (typeof effective.applyNoise !== "boolean") {
    throw new TypeError("noiseConfig.applyNoise must be a boolean.");
  }
  for (const field of [
    "positionAmplitude",
    "rotationAmplitude",
  ] as const) {
    const value = effective[field];
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(
        `noiseConfig.${field} must be a finite non-negative number.`
      );
    }
  }
  if (
    effective.rotationAmplitude > MAX_DATASET_ROTATION_NOISE_AMPLITUDE
  ) {
    throw new RangeError(
      `noiseConfig.rotationAmplitude must not exceed ${MAX_DATASET_ROTATION_NOISE_AMPLITUDE} radians.`
    );
  }
  if (!Number.isFinite(effective.frequency) || effective.frequency <= 0) {
    throw new RangeError(
      "noiseConfig.frequency must be a finite positive number."
    );
  }
  return effective;
}

function shuffleInPlace<T>(values: T[], random: RandomSource): void {
  for (let index = values.length - 1; index > 0; index--) {
    const swapIndex = Math.min(index, Math.floor(random() * (index + 1)));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
}

/**
 * Allocates a finite schedule with Hamilton's largest-remainder method, then
 * shuffles it. Counts are therefore deterministic and as close as possible to
 * the requested marginal probabilities; the seed changes only their order.
 */
export function createWeightedSchedule<T extends string>(
  orderedValues: readonly T[],
  probabilities: Record<T, number>,
  count: number,
  random: RandomSource
): T[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError("Schedule count must be a non-negative integer.");
  }
  if (count === 0) return [];

  const allocations = orderedValues.map((value, order) => {
    const exactCount = probabilities[value] * count;
    return {
      value,
      order,
      count: Math.floor(exactCount),
      remainder: exactCount - Math.floor(exactCount),
    };
  });
  let remaining =
    count - allocations.reduce((sum, allocation) => sum + allocation.count, 0);
  const remainderOrder = [...allocations].sort(
    (first, second) =>
      second.remainder - first.remainder || first.order - second.order
  );
  for (let index = 0; index < remaining; index++) {
    remainderOrder[index % remainderOrder.length].count++;
  }

  const schedule = allocations.flatMap(({ value, count: allocatedCount }) =>
    Array.from({ length: allocatedCount }, () => value)
  );
  shuffleInPlace(schedule, random);
  return schedule;
}

function countScheduleValues<T extends string>(
  orderedValues: readonly T[],
  schedule: readonly T[]
): Record<T, number> {
  const counts = Object.fromEntries(
    orderedValues.map((value) => [value, 0])
  ) as Record<T, number>;
  schedule.forEach((value) => counts[value]++);
  return counts;
}

function normalizeSubset<T extends string>(
  orderedValues: readonly T[],
  probabilities: Record<T, number>
): Record<T, number> {
  const total = orderedValues.reduce(
    (sum, value) => sum + probabilities[value],
    0
  );
  if (total <= 0) {
    throw new RangeError("A weighted subset must contain a positive weight.");
  }
  return Object.fromEntries(
    orderedValues.map((value) => [value, probabilities[value] / total])
  ) as Record<T, number>;
}

function createSubjectForClass(objectClass: ObjectClass): Subject {
  const dimensions = generateDimensions(objectClass);
  return {
    id: `${objectClass}-0`,
    class: objectClass,
    dimensions: {
      width: dimensions.x,
      height: dimensions.y,
      depth: dimensions.z,
    },
  };
}

export function normalizeDatasetConfig(
  config: GenerateDatasetConfig
): NormalizedDatasetConfig {
  const simulationCount = config.simulationCount ?? 1000;
  const subjectCount = config.subjectCount ?? DATASET_SUBJECT_COUNT;
  const instructionCount =
    config.instructionCount ?? DATASET_INSTRUCTION_COUNT;
  const minFrameCount = config.minFrameCount ?? MIN_DATASET_FRAME_COUNT;
  const maxFrameCount = config.maxFrameCount ?? MAX_DATASET_FRAME_COUNT;
  const chunkSize = config.chunkSize ?? CHUNK_SIZE;
  const movementDistribution = normalizeMovementDistribution(
    config.movementDistribution
  );
  const subjectClassProbabilities = normalizeSubjectClassProbabilities(
    config.subjectClassProbabilities
  );

  if (!Number.isInteger(simulationCount) || simulationCount < 1) {
    throw new RangeError("simulationCount must be a positive integer.");
  }
  if (subjectCount !== DATASET_SUBJECT_COUNT) {
    throw new RangeError(
      `Dataset samples require exactly ${DATASET_SUBJECT_COUNT} subject.`
    );
  }
  if (instructionCount !== DATASET_INSTRUCTION_COUNT) {
    throw new RangeError(
      `Dataset samples require exactly ${DATASET_INSTRUCTION_COUNT} instruction.`
    );
  }
  if (
    !Number.isInteger(minFrameCount) ||
    !Number.isInteger(maxFrameCount) ||
    minFrameCount < MIN_DATASET_FRAME_COUNT ||
    maxFrameCount > MAX_DATASET_FRAME_COUNT ||
    minFrameCount > maxFrameCount
  ) {
    throw new RangeError(
      `Frame counts must be integers in the inclusive range ${MIN_DATASET_FRAME_COUNT}-${MAX_DATASET_FRAME_COUNT}, with minFrameCount <= maxFrameCount.`
    );
  }
  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new RangeError("chunkSize must be a positive integer.");
  }
  const hasDynamicMovement = DATASET_MOVEMENT_TYPES.some(
    (movement) =>
      movement !== "static" && movementDistribution[movement] > 0
  );
  if (
    hasDynamicMovement &&
    subjectClassProbabilities[ObjectClass.Car] +
      subjectClassProbabilities[ObjectClass.Bicycle] <=
      0
  ) {
    throw new RangeError(
      "A positive dynamic movement weight requires a positive Car or Bicycle subject class weight."
    );
  }

  return {
    ...config,
    simulationCount,
    subjectCount: DATASET_SUBJECT_COUNT,
    instructionCount: DATASET_INSTRUCTION_COUNT,
    minFrameCount,
    maxFrameCount,
    chunkSize,
    subjectClassProbabilities,
    movementDistribution,
    noiseConfig: normalizeNoiseConfig(config.noiseConfig),
  };
}

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
  const normalizedConfig = normalizeDatasetConfig(config);
  const {
    simulationCount,
    subjectCount,
    instructionCount,
    minFrameCount,
    maxFrameCount,
    seed: configuredSeed,
    subjectClassProbabilities,
    movementDistribution,
    onProgress,
    chunkSize,
    noiseConfig,
  } = normalizedConfig;
  const seed = String(configuredSeed ?? createRandomSeed());
  const random = createSeededRandom(seed);
  const paddingLength = Math.floor(Math.log10(simulationCount)) + 1;
  const datasetId = `lenscraft_sim_${uuidv4()}`;
  const movementSchedule = createWeightedSchedule(
    DATASET_MOVEMENT_TYPES,
    movementDistribution,
    simulationCount,
    random
  );
  const realizedMovementCounts = countScheduleValues(
    DATASET_MOVEMENT_TYPES,
    movementSchedule
  );
  const staticSampleCount = realizedMovementCounts.static;
  const dynamicSampleCount = simulationCount - staticSampleCount;
  const staticClassSchedule = createWeightedSchedule(
    DATASET_SUBJECT_CLASSES,
    subjectClassProbabilities,
    staticSampleCount,
    random
  );
  const vehicleClasses = [ObjectClass.Car, ObjectClass.Bicycle] as const;
  const dynamicSubjectClassProbabilities =
    dynamicSampleCount > 0
      ? normalizeSubset(vehicleClasses, subjectClassProbabilities)
      : {
          [ObjectClass.Car]: 0,
          [ObjectClass.Bicycle]: 0,
        };
  const dynamicClassSchedule =
    dynamicSampleCount > 0
      ? createWeightedSchedule(
          vehicleClasses,
          dynamicSubjectClassProbabilities,
          dynamicSampleCount,
          random
        )
      : [];
  const realizedSubjectClassCounts = Object.fromEntries(
    DATASET_SUBJECT_CLASSES.map((objectClass) => [objectClass, 0])
  ) as Record<ObjectClass, number>;
  let staticClassIndex = 0;
  let dynamicClassIndex = 0;

  const zip = new JSZip();
  const datasetDirectory = zip.folder(datasetId);
  if (!datasetDirectory) {
    throw new Error(`Unable to create archive directory ${datasetId}.`);
  }
  let operationCount = 0;

  let parameterDictionary: ParameterDictionary =
    createParameterDictionary(datasetId);

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

    const subjectMovement = movementSchedule[s];
    const subjectClass =
      subjectMovement === "static"
        ? staticClassSchedule[staticClassIndex++]
        : dynamicClassSchedule[dynamicClassIndex++];
    if (!subjectClass) {
      throw new Error(
        `Subject class schedule was exhausted for ${subjectMovement} at sample ${s}.`
      );
    }
    realizedSubjectClassCounts[subjectClass]++;
    const subjects = [
      withRandomSource(random, () => createSubjectForClass(subjectClass)),
    ];
    operationCount += subjectCount;
    await yieldIfNeeded(operationCount, chunkSize);

    const subjectMovements: Record<string, DatasetMovementType> = {
      [subjects[0].id]: subjectMovement,
    };

    operationCount += subjects.length;
    await yieldIfNeeded(operationCount, chunkSize);

    operationCount++;
    await yieldIfNeeded(operationCount, chunkSize);

    const frameCount =
      Math.floor(random() * (maxFrameCount - minFrameCount + 1)) +
      minFrameCount;
    const totalFrameCount = frameCount;
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
    const exportedSubjectsInfo = quantizeSubjectInfoForDataset(subjectsInfo);
    operationCount += subjects.length;
    await yieldIfNeeded(operationCount, chunkSize);

    let prompt: CinematographyPrompt | undefined;
    let instruction: SimulationInstruction | undefined;
    let cameraFrames: CameraParameters[] | undefined;
    let observedInitial: CinematographySetup | undefined;
    let observedFinal: CinematographySetup | undefined;
    let labelingError: unknown;
    for (
      let attempt = 0;
      attempt < MAX_OBSERVABLE_CAMERA_ATTEMPTS;
      attempt++
    ) {
      const candidatePrompt = withRandomSource(random, () =>
        generateRandomCinematographyPrompt()
      );
      if (
        subjectMovement === "static" &&
        (candidatePrompt.movement.type === CameraMovementType.Follow ||
          candidatePrompt.movement.type === CameraMovementType.Track)
      ) {
        labelingError = new Error(
          `${candidatePrompt.movement.type} requires a moving subject`
        );
        continue;
      }
      try {
        const candidateInstruction = translatePromptToSimulationInstruction(
          candidatePrompt,
          { frameCount, subjectIndex: 0 }
        );
        const candidateCameraFrames = withRandomSource(random, () =>
          calculateCameraPositions([candidateInstruction], subjectsInfo)
        );
        if (candidateCameraFrames.length !== frameCount) {
          throw new Error(
            `Camera solver returned ${candidateCameraFrames.length} frames; expected ${frameCount}.`
          );
        }
        const exportedCameraFrames = quantizeCameraFramesForDataset(
          candidateCameraFrames
        );
        const exportedSubject = exportedSubjectsInfo[0];
        const exportedSubjectFrames = exportedSubject.frames;
        if (!exportedSubjectFrames?.length) {
          throw new Error("Dataset subject has no exported frames.");
        }
        if (
          candidateInstruction.constraints?.allFramesVisibility &&
          !exportedCameraFrames.every((camera, index) => {
            const subjectFrame = exportedSubjectFrames[index];
            return (
              !!subjectFrame &&
              isProjectedBoundsFullyVisible(
                projectBoundingBox(
                  exportedSubject.subject.dimensions,
                  subjectFrame.position,
                  camera,
                  subjectFrame.rotation
                )
              )
            );
          })
        ) {
          throw new Error(
            "Quantized dataset geometry violates allFramesVisibility."
          );
        }
        const finalFrameIndex = exportedCameraFrames.length - 1;
        observedInitial = deriveCinematographySetupFromPose(
          exportedCameraFrames[0],
          exportedSubject.subject,
          exportedSubjectFrames[0]
        );
        observedFinal = deriveCinematographySetupFromPose(
          exportedCameraFrames[finalFrameIndex],
          exportedSubject.subject,
          exportedSubjectFrames[finalFrameIndex]
        );
        prompt = candidatePrompt;
        instruction = candidateInstruction;
        cameraFrames = exportedCameraFrames;
        break;
      } catch (error) {
        labelingError = error;
      }
    }
    if (!prompt || !instruction || !cameraFrames || !observedInitial || !observedFinal) {
      throw new Error(
        `Unable to generate an observable camera endpoint for dataset sample ${s} after ${MAX_OBSERVABLE_CAMERA_ATTEMPTS} attempts (${subjectMovement} subject).`,
        { cause: labelingError }
      );
    }
    const trajectoryPrompt = createTrajectoryPrompt(
      prompt,
      observedInitial,
      observedFinal
    );
    const cinematographyPrompts: CinematographyPrompt[] = [trajectoryPrompt];
    const realizedSimulationInstructions: SimulationInstruction[] = [
      alignInstructionSetupsWithTrajectory(
        instruction,
        observedInitial,
        observedFinal
      ),
    ];

    const simulationData = {
      cinematographyPrompts,
      simulationInstructions: realizedSimulationInstructions,
      subjectsInfo: exportedSubjectsInfo,
      cameraFrames,
    };

    const { formattedData, parameterDictionary: newParameterDictionary } =
      formatSimulationData(simulationData, parameterDictionary);

    parameterDictionary = newParameterDictionary;

    const packedData = pack(formattedData);
    datasetDirectory.file(
      `simulation_${datasetId}_${s
        .toString()
        .padStart(paddingLength, "0")}.msgpack`,
      new Uint8Array(packedData),
      zipOptions
    );

    operationCount += frameCount;
    await yieldIfNeeded(operationCount, chunkSize);
  }

  const packedDictionary = pack(parameterDictionary);
  datasetDirectory.file(
    "parameter_dictionary.msgpack",
    new Uint8Array(packedDictionary),
    zipOptions
  );

  const manifest = {
    schemaVersion: 2,
    generatorVersion: 2,
    datasetId,
    generatedAt: new Date().toISOString(),
    seed,
    contract: {
      subjectsPerSample: DATASET_SUBJECT_COUNT,
      instructionsPerSample: DATASET_INSTRUCTION_COUNT,
      frameCountStoredAsParameter: false,
      subjectIndexStoredAsParameter: false,
      parameterValueTypes: ["string", "number", "boolean"],
      movementSampling: "largest-remainder-marginal",
      cameraPromptSampling: "rejection-sampled-for-observable-endpoints",
      initialSetupSource: "derived-from-first-camera-frame",
      finalSetupSource: "derived-from-last-camera-frame",
      instructionSetupSource: "derived-from-corresponding-camera-endpoints",
      noiseApplication:
        "dynamic-position-before-heading-and-rotation-after-heading",
    },
    config: {
      simulationCount,
      subjectCount,
      instructionCount,
      minFrameCount,
      maxFrameCount,
      subjectClassProbabilities,
      movementDistribution,
      dynamicSubjectClassProbabilities,
      noiseConfig,
    },
    realized: {
      movementCounts: realizedMovementCounts,
      subjectClassCounts: realizedSubjectClassCounts,
    },
    encoding: {
      archiveRootDirectory: datasetId,
      simulationFilePattern: `simulation_${datasetId}_*.msgpack`,
      parameterDictionaryFile: "parameter_dictionary.msgpack",
      parameterDictionarySchemaVersion: parameterDictionary.schemaVersion,
      fixedPointScale: DATASET_FLOAT_FACTOR,
    },
  };
  datasetDirectory.file(
    "manifest.json",
    JSON.stringify(manifest, null, 2),
    zipOptions
  );

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
  link.download = `${datasetId}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
