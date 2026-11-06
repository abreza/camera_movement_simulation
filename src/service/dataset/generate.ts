import {
  BlobWriter,
  Uint8ArrayReader,
  ZipWriter,
} from "@zip.js/zip.js";
import { pack } from "msgpackr";
import { v4 as uuidv4 } from "uuid";
import {
  CameraParameters,
  CameraMovementType,
  CinematographyPrompt,
  CinematographySetup,
  SimulationInstruction,
  DynamicMode,
  MovementEasing,
  ShotSize,
  SubjectInFramePosition,
} from "@/service/simulation/instruction/types";
import { translatePromptToSimulationInstruction } from "@/service/simulation/instruction/high-level/translator";
import { normalizeCinematographyPrompt } from "@/service/simulation/instruction/high-level/rules";
import {
  DATASET_SUBJECT_SCALE_RANGE,
  generateDatasetSubjectDimensions,
} from "./subjectDimensions";
import { ObjectClass, Subject, SubjectInfo } from "@/service/subjects/types";
import { generateRandomCinematographyPrompt } from "../simulation/instruction/high-level/generator";
import { generateFrames, isHumanMovement, isMovementSupportedForSubject } from "@/service/subjects/movements";
import {
  DATASET_MOVEMENT_TYPES,
  DEFAULT_DATASET_MOVEMENT_DISTRIBUTION,
  DEFAULT_DATASET_SUBJECT_CLASS_PROBABILITIES,
  DatasetMovementType,
} from "./subjectMotion";
export {
  DATASET_MOVEMENT_TYPES,
  DEFAULT_DATASET_MOVEMENT_DISTRIBUTION,
  DEFAULT_DATASET_SUBJECT_CLASS_PROBABILITIES,
} from "./subjectMotion";
export type { DatasetMovementType } from "./subjectMotion";
import { calculateCameraPositions } from "../simulation/rule-based/sequence";
import {
  DATASET_FLOAT_FACTOR,
  formatSimulationData,
  quantizeCameraFramesForDataset,
  quantizeSubjectInfoForDataset,
} from "./simulationFormatter";
import {
  createParameterDictionary,
  IndexedParameterDictionary,
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
import {
  DATASET_TRAJECTORY_QUALITY_POLICY,
  DatasetTrajectoryQualityError,
  validateDatasetTrajectory,
} from "./quality";
import {
  DatasetCameraMovementQualityError,
  validateDatasetCameraMovement,
} from "./movementQuality";
import {
  ET_MODEL_OBSERVATION,
  generateETCameraCandidate,
  intendedETClipMetrics,
  measureETGeneratedClip,
  normalizeETTrainingProfile,
  prepareETSubjectFrames,
  sampleETClipControls,
  summarizeETGeneratedMetrics,
  type ETGeneratedMetrics,
  type ETSubjectRegime,
  type ETTrainingProfile,
  type NormalizedETTrainingProfile,
} from "./etTrainingProfile";
import {
  applyDatasetOptics,
  createDatasetDiversityPlan,
  DATASET_CAMERA_MOVEMENT_TYPES,
  DATASET_DIVERSITY_PROFILE,
  normalizeDatasetDiversity,
  scaleDatasetCameraFrames,
  scaleDatasetInstruction,
  scaleDatasetSubjects,
  type DatasetDiversityAssignment,
  type DatasetDiversityConfig,
  type NormalizedDatasetDiversityConfig,
} from "./diversity";
export {
  DATASET_CAMERA_MOVEMENT_TYPES,
  DATASET_DIVERSITY_PROFILE,
  DEFAULT_DATASET_DIVERSITY,
} from "./diversity";
export type { DatasetDiversityConfig } from "./diversity";
import {
  DATASET_SUBJECT_PATH_FRACTIONS,
  windowDatasetSubjectFrames,
} from "./subjectProgress";

export type DatasetProgressPhase = "generating" | "zipping";

export interface GenerateDatasetConfig {
  simulationCount: number;
  subjectCount?: number;
  instructionCount?: number;
  minFrameCount?: number;
  maxFrameCount?: number;
  seed?: string | number;
  /** Time between stored samples is 1 / framesPerSecond seconds. */
  framesPerSecond?: number;
  /** Aggregate ET TRAIN calibration; never native trajectory replay or evaluation fitting. */
  etTrainingProfile?: ETTrainingProfile;
  /** Standard rule-based diversity is enabled by default; false retains legacy sampling. */
  diversity?: false | DatasetDiversityConfig;
  subjectClassProbabilities?: Partial<Record<ObjectClass, number>>;
  movementDistribution?: Record<string, number>;
  onProgress?: (progress: number, phase: DatasetProgressPhase) => void;
  chunkSize?: number;
  noiseConfig?: {
    applyNoise?: boolean;
    positionAmplitude?: number;
    rotationAmplitude?: number;
    frequency?: number;
  };
}

export interface GenerateDatasetArchiveOptions {
  /**
   * When supplied, the ZIP is written incrementally instead of being retained
   * in memory. FileSystemWritableFileStream is the intended browser sink.
   */
  writable?: WritableStream;
  signal?: AbortSignal;
}

export interface GeneratedDatasetArchive {
  datasetId: string;
  filename: string;
  /** Present only when no streaming destination was supplied. */
  data?: Blob;
}

export const DATASET_SUBJECT_COUNT = 1;
export const DATASET_INSTRUCTION_COUNT = 1;
export const MIN_DATASET_FRAME_COUNT = 100;
export const MAX_DATASET_FRAME_COUNT = 500;
export const MAX_DATASET_ROTATION_NOISE_AMPLITUDE = 0.15;

const DATASET_MOVEMENT_TYPE_SET = new Set<string>(DATASET_MOVEMENT_TYPES);
const DATASET_SUBJECT_CLASSES = Object.values(ObjectClass);
const DATASET_SUBJECT_CLASS_SET = new Set<string>(DATASET_SUBJECT_CLASSES);
const CHUNK_SIZE = 10000;
const MAIN_THREAD_TIME_BUDGET_MS = 16;
const MAX_DATASET_CAMERA_ATTEMPTS = 50;
const MAX_DIVERSE_DATASET_CAMERA_ATTEMPTS = 200;

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
  | "framesPerSecond"
  | "etTrainingProfile"
  | "diversity"
> & {
  simulationCount: number;
  subjectCount: typeof DATASET_SUBJECT_COUNT;
  instructionCount: typeof DATASET_INSTRUCTION_COUNT;
  minFrameCount: number;
  maxFrameCount: number;
  framesPerSecond: number;
  subjectClassProbabilities: Record<ObjectClass, number>;
  movementDistribution: Record<DatasetMovementType, number>;
  chunkSize: number;
  noiseConfig: EffectiveNoiseConfig;
  etTrainingProfile?: NormalizedETTrainingProfile;
  diversity: false | NormalizedDatasetDiversityConfig;
};

function normalizeMovementDistribution(
  distribution?: Record<string, number>
): Record<DatasetMovementType, number> {
  const supplied = distribution ?? DEFAULT_DATASET_MOVEMENT_DISTRIBUTION;
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
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    throw new RangeError("Dataset movement weights must have a finite positive total.");
  }

  return Object.fromEntries(
    DATASET_MOVEMENT_TYPES.map((movement) => [
      movement,
      weights[movement] / totalWeight,
    ])
  ) as Record<DatasetMovementType, number>;
}

function normalizeSubjectClassProbabilities(
  probabilities: Partial<Record<ObjectClass, number>> | undefined,
  defaults: Record<ObjectClass, number>
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
    ...defaults,
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
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
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
    applyNoise: noiseConfig?.applyNoise ?? true,
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
  const dimensions = generateDatasetSubjectDimensions(objectClass);
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
  const etTrainingProfile = config.etTrainingProfile
    ? normalizeETTrainingProfile(config.etTrainingProfile)
    : undefined;
  if (etTrainingProfile && config.diversity !== undefined && config.diversity !== false) {
    throw new RangeError("etTrainingProfile has its own explicit distribution and requires diversity: false.");
  }
  const diversity = etTrainingProfile ? false : normalizeDatasetDiversity(config.diversity);
  const calibratedFrames = etTrainingProfile?.calibration.quantiles.frames;
  const minFrameCount = calibratedFrames
    ? Math.max(30, Math.floor(calibratedFrames[0] as number))
    : config.minFrameCount ?? MIN_DATASET_FRAME_COUNT;
  const maxFrameCount = calibratedFrames
    ? Math.max(30, Math.min(500, Math.ceil(calibratedFrames.at(-1) as number)))
    : config.maxFrameCount ?? MAX_DATASET_FRAME_COUNT;
  const chunkSize = config.chunkSize ?? CHUNK_SIZE;
  const framesPerSecond = etTrainingProfile?.framesPerSecond ?? config.framesPerSecond ?? 30;
  if (!Number.isFinite(framesPerSecond) || framesPerSecond < 10 || framesPerSecond > 120) {
    throw new RangeError("framesPerSecond must be a finite number between 10 and 120.");
  }
  const profileMovementWeights: Record<string, number> = {};
  if (etTrainingProfile) {
    for (const regime of etTrainingProfile.calibration.regimes) {
      if (regime.key === "exact_static") profileMovementWeights.static = regime.weight;
      else if (regime.key === "near_static") profileMovementWeights.idle = regime.weight;
      else for (const movement of ["walk", "wander", "sidestep", "backward"]) profileMovementWeights[movement] = regime.weight / 4;
    }
  }
  const movementDistribution = normalizeMovementDistribution(
    etTrainingProfile ? profileMovementWeights : config.movementDistribution
  );
  const subjectClassProbabilities = normalizeSubjectClassProbabilities(
    etTrainingProfile
      ? Object.fromEntries(DATASET_SUBJECT_CLASSES.map((objectClass) => [objectClass, objectClass === ObjectClass.Human ? 1 : 0]))
      : config.subjectClassProbabilities,
    DEFAULT_DATASET_SUBJECT_CLASS_PROBABILITIES
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
    minFrameCount < (etTrainingProfile ? 30 : MIN_DATASET_FRAME_COUNT) ||
    maxFrameCount > MAX_DATASET_FRAME_COUNT ||
    minFrameCount > maxFrameCount
  ) {
    throw new RangeError(
      `Frame counts must be integers in the inclusive range ${etTrainingProfile ? 30 : MIN_DATASET_FRAME_COUNT}-${MAX_DATASET_FRAME_COUNT}, with minFrameCount <= maxFrameCount.`
    );
  }
  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new RangeError("chunkSize must be a positive integer.");
  }
  for (const movement of DATASET_MOVEMENT_TYPES) {
    if (movementDistribution[movement] <= 0) continue;
    const supported = DATASET_SUBJECT_CLASSES.filter(
      (objectClass) => isMovementSupportedForSubject(movement, objectClass)
    );
    if (!supported.some((objectClass) => subjectClassProbabilities[objectClass] > 0)) {
      throw new RangeError(
        `Movement ${movement} needs a positive weight for a supported subject class: ${supported.join(", ")}.`
      );
    }
  }

  return {
    ...config,
    simulationCount,
    subjectCount: DATASET_SUBJECT_COUNT,
    instructionCount: DATASET_INSTRUCTION_COUNT,
    minFrameCount,
    maxFrameCount,
    framesPerSecond,
    chunkSize,
    subjectClassProbabilities,
    movementDistribution,
    noiseConfig: normalizeNoiseConfig(config.noiseConfig),
    etTrainingProfile,
    diversity,
  };
}

function getCurrentTime(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

function yieldToEventLoop(): Promise<void> {
  // Use a scheduled task when available so repeated yields do not pay the
  // browser's minimum delay for nested timers. Both paths allow cancellation.
  if (typeof scheduler !== "undefined" && typeof scheduler.yield === "function") {
    return scheduler.yield();
  }
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;

  if (signal.reason instanceof Error) {
    throw signal.reason;
  }

  throw new DOMException("Dataset generation was cancelled.", "AbortError");
}

/**
 * Yields after crossing a work threshold (rather than requiring an exact
 * modulo hit) and whenever a task has occupied a full frame budget. The time
 * check also covers expensive camera-solver attempts whose cost is difficult
 * to represent with a simple operation counter.
 */
function createCooperativeYield(
  chunkSize: number,
  signal?: AbortSignal
): (operationCount: number) => Promise<void> {
  let nextYieldAt = chunkSize;
  let deadline = getCurrentTime() + MAIN_THREAD_TIME_BUDGET_MS;

  return async (operationCount: number) => {
    throwIfAborted(signal);

    if (operationCount < nextYieldAt && getCurrentTime() < deadline) {
      return;
    }

    nextYieldAt = operationCount + chunkSize;
    await yieldToEventLoop();
    deadline = getCurrentTime() + MAIN_THREAD_TIME_BUDGET_MS;
    throwIfAborted(signal);
  };
}

export async function buildRandomDatasetArchive(
  config: GenerateDatasetConfig,
  options: GenerateDatasetArchiveOptions = {}
): Promise<GeneratedDatasetArchive> {
  const normalizedConfig = normalizeDatasetConfig(config);
  const {
    simulationCount,
    subjectCount,
    instructionCount,
    minFrameCount,
    maxFrameCount,
    framesPerSecond,
    seed: configuredSeed,
    subjectClassProbabilities,
    movementDistribution,
    onProgress,
    chunkSize,
    noiseConfig,
    etTrainingProfile,
    diversity,
  } = normalizedConfig;
  const { writable, signal } = options;
  throwIfAborted(signal);
  const seed = String(configuredSeed ?? createRandomSeed());
  const random = createSeededRandom(seed);
  const paddingLength = Math.floor(Math.log10(simulationCount)) + 1;
  const datasetId = `lenscraft_sim_${uuidv4()}`;
  const filename = `${datasetId}.zip`;
  const generatedAt = new Date();
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
  const diversityPlan = diversity
    ? createDatasetDiversityPlan(diversity, movementSchedule, random)
    : undefined;
  const summarizeDiversity = (assignments: readonly DatasetDiversityAssignment[]) => {
    const cameraMovementCounts = Object.fromEntries(DATASET_CAMERA_MOVEMENT_TYPES.map((movement) => [movement, 0]));
    const sceneScaleStratumCounts = { base: 0, smaller: 0, larger: 0 };
    const aspectRatioCounts: Record<string, number> = {};
    let scaleMinimum = Infinity, scaleMaximum = -Infinity, focalMinimum = Infinity, focalMaximum = -Infinity;
    let scaleTotal = 0, focalTotal = 0;
    for (const assignment of assignments) {
      cameraMovementCounts[assignment.cameraMovement]++;
      sceneScaleStratumCounts[assignment.sceneScaleStratum]++;
      aspectRatioCounts[String(assignment.aspectRatio)] = (aspectRatioCounts[String(assignment.aspectRatio)] ?? 0) + 1;
      scaleMinimum = Math.min(scaleMinimum, assignment.sceneScale);
      scaleMaximum = Math.max(scaleMaximum, assignment.sceneScale);
      focalMinimum = Math.min(focalMinimum, assignment.focalLength);
      focalMaximum = Math.max(focalMaximum, assignment.focalLength);
      scaleTotal += assignment.sceneScale;
      focalTotal += assignment.focalLength;
    }
    return { sampleCount: assignments.length, cameraMovementCounts, sceneScaleStratumCounts, aspectRatioCounts,
      sceneScale: assignments.length ? { min: scaleMinimum, max: scaleMaximum, mean: scaleTotal / assignments.length } : null,
      focalLength: assignments.length ? { min: focalMinimum, max: focalMaximum, mean: focalTotal / assignments.length } : null,
    };
  };
  const acceptedDiversityAssignments: DatasetDiversityAssignment[] = [];
  const diversityReceipts: Array<DatasetDiversityAssignment & {
    sampleIndex: number; baseSubjectDimensions: Subject["dimensions"]; subjectPathSeed: string;
    subjectPathDraw: number; cameraAttempts: number; frameCount: number; centeredFullShotProposals: number;
    storedOptics: { focalLength: number; aspectRatio: number };
    subjectPathFraction: number; subjectPathStart: number;
  }> = [];
  const diversityRejectedCandidates: Record<string, Record<string, number>> = {};
  const diversityRejectedByPathFraction: Record<string, Record<string, number>> = {};
  const realizedSubjectPathFractionCounts: Record<string, number> = {};
  // Preserve motion quotas while conditioning class allocation on what can
  // perform that motion: a prop never walks, and a car never sidesteps.
  const subjectClassProbabilitiesByMovement: Partial<Record<DatasetMovementType, Partial<Record<ObjectClass, number>>>> = {};
  const classSchedules = {} as Record<DatasetMovementType, ObjectClass[]>;
  const classIndices = {} as Record<DatasetMovementType, number>;
  for (const movement of DATASET_MOVEMENT_TYPES) {
    classIndices[movement] = 0;
    const supported = DATASET_SUBJECT_CLASSES.filter(
      (objectClass) => isMovementSupportedForSubject(movement, objectClass)
    );
    if (realizedMovementCounts[movement] === 0) {
      classSchedules[movement] = [];
      continue;
    }
    const weights = normalizeSubset(supported, subjectClassProbabilities);
    subjectClassProbabilitiesByMovement[movement] = weights;
    classSchedules[movement] = createWeightedSchedule(
      supported, weights, realizedMovementCounts[movement], random
    );
  }
  const realizedSubjectClassCounts = Object.fromEntries(
    DATASET_SUBJECT_CLASSES.map((objectClass) => [objectClass, 0])
  ) as Record<ObjectClass, number>;
  const realizedCameraMovementCounts: Partial<Record<CameraMovementType, number>> = {};
  const rejectedCameraCandidates: Record<string, number> = {};
  const subjectClassMovementCounts: Record<string, Record<string, number>> = {};
  const etIntendedMetrics: ETGeneratedMetrics[] = [];
  const etRealizedMetrics: ETGeneratedMetrics[] = [];
  const etMetricsByRegime: Partial<Record<ETSubjectRegime, ETGeneratedMetrics[]>> = {};
  const etRejectedByRegime: Partial<Record<ETSubjectRegime, Record<string, number>>> = {};
  const etRejectedControlMetrics: ETGeneratedMetrics[] = [];
  const etResampledControlsByRegime: Partial<Record<ETSubjectRegime, number>> = {};
  let etShortClipCount = 0;
  const etPlausibilityAdjustments: Record<string, number> = {};
  const recordRejectedCandidate = (reason: string) => {
    rejectedCameraCandidates[reason] = (rejectedCameraCandidates[reason] ?? 0) + 1;
  };

  const memoryWriter = writable
    ? undefined
    : new BlobWriter("application/zip");
  const zip = new ZipWriter<Blob>(
    writable ?? memoryWriter!,
    {
      level: 0,
      keepOrder: true,
      bufferedWrite: false,
      dataDescriptor: true,
      extendedTimestamp: false,
      useWebWorkers: false,
      signal,
    }
  );
  const zipEntryOptions = {
    level: 0,
    extendedTimestamp: false,
    lastModDate: generatedAt,
    signal,
  } as const;
  await zip.add(`${datasetId}/`, undefined, {
    ...zipEntryOptions,
    directory: true,
  });
  let operationCount = 0;
  const yieldIfNeeded = createCooperativeYield(chunkSize, signal);

  let parameterDictionary: ParameterDictionary =
    createParameterDictionary(datasetId);
  const parameterWriter = diversity
    ? new IndexedParameterDictionary(parameterDictionary)
    : undefined;

  for (let s = 0; s < simulationCount; s++) {
    operationCount++;
    await yieldIfNeeded(operationCount);

    onProgress?.((s / simulationCount) * 100, "generating");

    const subjectMovement = movementSchedule[s];
    const diversityAssignment = diversityPlan?.[s];
    const sceneScale = diversityAssignment?.sceneScale ?? 1;
    let subjectPathDraw = 0;
    let subjectPathSeed = `${seed}:diversity:sample:${s}:subject:${subjectPathDraw}`;
    let subjectPathFraction = 1;
    let subjectPathStart = 0;
    let cameraAttempts = 0;
    let centeredFullShotProposals = 0;
    const cameraAttemptLimit = diversityAssignment ? MAX_DIVERSE_DATASET_CAMERA_ATTEMPTS : MAX_DATASET_CAMERA_ATTEMPTS;
    const subjectClass = classSchedules[subjectMovement][classIndices[subjectMovement]++];
    if (!subjectClass) {
      throw new Error(
        `Subject class schedule was exhausted for ${subjectMovement} at sample ${s}.`
      );
    }
    realizedSubjectClassCounts[subjectClass]++;
    const classMovementCounts = subjectClassMovementCounts[subjectClass] ??= {};
    classMovementCounts[subjectMovement] = (classMovementCounts[subjectMovement] ?? 0) + 1;
    const subjects = [
      withRandomSource(random, () => createSubjectForClass(subjectClass)),
    ];
    operationCount += subjectCount;
    await yieldIfNeeded(operationCount);

    const subjectMovements: Record<string, DatasetMovementType> = {
      [subjects[0].id]: subjectMovement,
    };

    operationCount += subjects.length;
    await yieldIfNeeded(operationCount);

    operationCount++;
    await yieldIfNeeded(operationCount);

    const etRegime: ETSubjectRegime = subjectMovement === "static" ? "exact_static"
      : subjectMovement === "idle" ? "near_static" : "moving";
    let etControls = etTrainingProfile
      ? sampleETClipControls(etTrainingProfile, etRegime, random)
      : undefined;
    let frameCount = etControls?.frameCount ??
      Math.floor(random() * (maxFrameCount - minFrameCount + 1)) + minFrameCount;
    const rebuildCurrentSubjectsInfo = (): SubjectInfo[] => {
      const subjectRandom = diversityAssignment ? createSeededRandom(subjectPathSeed) : random;
      const authoredSubjectFrames = withRandomSource(subjectRandom, () => generateFrames(subjects, subjectMovements, {
        ...noiseConfig, frameCount, durationSeconds: (frameCount - 1) / framesPerSecond,
      }));
      const subjectFrames = etTrainingProfile && etControls
        ? authoredSubjectFrames.map((frames) => prepareETSubjectFrames(etTrainingProfile, etControls!, frames))
        : diversityAssignment
        ? authoredSubjectFrames.map((frames) => windowDatasetSubjectFrames(frames, subjectPathStart, subjectPathFraction))
        : authoredSubjectFrames;
      return subjects.map((subject, index) => ({ subject, frames: subjectFrames[index], movementType: subjectMovements[subject.id] }));
    };
    let subjectsInfo = rebuildCurrentSubjectsInfo();
    operationCount += subjects.length * frameCount;
    await yieldIfNeeded(operationCount);
    let exportedSubjectsInfo = quantizeSubjectInfoForDataset(
      diversityAssignment ? scaleDatasetSubjects(subjectsInfo, sceneScale) : subjectsInfo
    );
    operationCount += subjects.length;
    await yieldIfNeeded(operationCount);

    let prompt: CinematographyPrompt | undefined;
    let instruction: SimulationInstruction | undefined;
    let cameraFrames: CameraParameters[] | undefined;
    let observedInitial: CinematographySetup | undefined;
    let observedFinal: CinematographySetup | undefined;
    let labelingError: unknown;
    for (
      let attempt = 0;
      attempt < cameraAttemptLimit;
      attempt++
    ) {
      operationCount++;
      await yieldIfNeeded(operationCount);
      cameraAttempts++;
      if (diversityAssignment && attempt > 0 && attempt % 5 === 0) {
        // Retry only the path realization. The assigned class, dimensions,
        // motion family, duration, camera quota, scale and optics remain fixed.
        subjectPathDraw++;
        subjectPathSeed = `${seed}:diversity:sample:${s}:subject:${subjectPathDraw}`;
        subjectPathFraction = isHumanMovement(subjectMovement) || subjectMovement === "static"
          ? 1
          : DATASET_SUBJECT_PATH_FRACTIONS[subjectPathDraw % DATASET_SUBJECT_PATH_FRACTIONS.length];
        subjectPathStart = createSeededRandom(`${subjectPathSeed}:window`)() * (1 - subjectPathFraction);
        subjectsInfo = rebuildCurrentSubjectsInfo();
        exportedSubjectsInfo = quantizeSubjectInfoForDataset(scaleDatasetSubjects(subjectsInfo, sceneScale));
        operationCount += subjects.length * frameCount;
      }
      if (etTrainingProfile && etControls && attempt > 0 && attempt % 5 === 0) {
        // A fixed high-excursion path can be infeasible for every camera axis.
        // Resample within the assigned regime, preserving quotas and every quality
        // requirement. Keep the discarded intended distribution visible in receipts.
        etRejectedControlMetrics.push(intendedETClipMetrics(etControls));
        etResampledControlsByRegime[etRegime] = (etResampledControlsByRegime[etRegime] ?? 0) + 1;
        etControls = sampleETClipControls(etTrainingProfile, etRegime, random);
        frameCount = etControls.frameCount;
        subjectsInfo = rebuildCurrentSubjectsInfo();
        exportedSubjectsInfo = quantizeSubjectInfoForDataset(subjectsInfo);
        operationCount += subjects.length * frameCount;
      }
      const etCandidate = etTrainingProfile && etControls
        ? generateETCameraCandidate(etTrainingProfile, etControls, subjectsInfo[0], random)
        : undefined;
      const candidateRandom = diversityAssignment
        ? createSeededRandom(`${seed}:diversity:sample:${s}:camera:${attempt}`)
        : random;
      let candidatePrompt = etCandidate?.prompt ?? withRandomSource(candidateRandom, () =>
        generateRandomCinematographyPrompt(diversityAssignment?.cameraMovement));
      if (diversityAssignment && attempt > 0 && attempt % 5 === 4) {
        // Offer a feasible, close visible setup among otherwise random setups.
        // This remains a prompt for the same rule solver, never a substitute path.
        centeredFullShotProposals++;
        candidatePrompt = normalizeCinematographyPrompt({ ...candidatePrompt,
          initial: { ...candidatePrompt.initial, shotSize: ShotSize.FullShot,
            subjectFraming: SubjectInFramePosition.Center },
        });
      }
      if (
        ["static", "idle", "turnInPlace"].includes(subjectMovement) &&
        (candidatePrompt.movement.type === CameraMovementType.Follow ||
          candidatePrompt.movement.type === CameraMovementType.Track)
      ) {
        labelingError = new Error(
          `${candidatePrompt.movement.type} requires a moving subject`
        );
        recordRejectedCandidate("tracking-requires-moving-subject");
        continue;
      }
      try {
        // This diagnostic instruction is unavailable to the model under the
        // explicit profile. Numeric poses, not SIM primitive locks, are authoritative.
        let candidateInstruction: SimulationInstruction = etCandidate
          ? { setup: { config: {}, kind: "init" }, dynamic: {
              type: DynamicMode.Interpolation, easing: MovementEasing.Linear,
              complementSetup: {}, subjectAwareInterpolation: false,
            }, frameCount, subjectIndex: 0 }
          : translatePromptToSimulationInstruction(candidatePrompt, { frameCount, subjectIndex: 0 });
        if (diversityAssignment) candidateInstruction = applyDatasetOptics(candidateInstruction, diversityAssignment);
        const candidateCameraFrames = etCandidate?.cameraFrames ?? withRandomSource(candidateRandom, () =>
          calculateCameraPositions([candidateInstruction], subjectsInfo));
        operationCount += candidateCameraFrames.length;
        await yieldIfNeeded(operationCount);
        if (candidateCameraFrames.length !== frameCount) {
          throw new Error(
            `Camera solver returned ${candidateCameraFrames.length} frames; expected ${frameCount}.`
          );
        }
        const exportedCameraFrames = quantizeCameraFramesForDataset(
          diversityAssignment ? scaleDatasetCameraFrames(candidateCameraFrames, sceneScale) : candidateCameraFrames
        );
        const exportedSubject = exportedSubjectsInfo[0];
        const exportedSubjectFrames = exportedSubject.frames;
        if (!exportedSubjectFrames?.length) {
          throw new Error("Dataset subject has no exported frames.");
        }
        // Gate the exact stored geometry and LensCraft's nearest 30 paired
        // frames. Relative camera limits alone do not prevent a distant
        // camera from whipping around when its subject turns.
        validateDatasetTrajectory(exportedCameraFrames, exportedSubject, sceneScale);
        if (diversityAssignment) {
          validateDatasetCameraMovement(exportedCameraFrames, exportedSubject, diversityAssignment.cameraMovement);
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
        if (!etCandidate) {
          observedInitial = deriveCinematographySetupFromPose(exportedCameraFrames[0], exportedSubject.subject, exportedSubjectFrames[0]);
          observedFinal = deriveCinematographySetupFromPose(exportedCameraFrames[finalFrameIndex], exportedSubject.subject, exportedSubjectFrames[finalFrameIndex]);
        }
        prompt = candidatePrompt;
        instruction = diversityAssignment
          ? applyDatasetOptics(scaleDatasetInstruction(candidateInstruction, sceneScale), {
            focalLength: exportedCameraFrames[0].focalLength,
            aspectRatio: exportedCameraFrames[0].aspectRatio,
          })
          : candidateInstruction;
        cameraFrames = exportedCameraFrames;
        break;
      } catch (error) {
        labelingError = error;
        const reason = error instanceof DatasetTrajectoryQualityError ? error.reason
          : error instanceof DatasetCameraMovementQualityError ? `movement-${error.reason}`
          : "camera-solver-or-endpoint";
        recordRejectedCandidate(reason);
        if (diversityAssignment) {
          const key = `${diversityAssignment.cameraMovement}|${diversityAssignment.sceneScaleStratum}|${diversityAssignment.aspectRatio}`;
          const rejected = diversityRejectedCandidates[key] ??= {};
          rejected[reason] = (rejected[reason] ?? 0) + 1;
          const rejectedAtFraction = diversityRejectedByPathFraction[String(subjectPathFraction)] ??= {};
          rejectedAtFraction[reason] = (rejectedAtFraction[reason] ?? 0) + 1;
        }
        if (etTrainingProfile) {
          const rejected = etRejectedByRegime[etRegime] ??= {};
          rejected[reason] = (rejected[reason] ?? 0) + 1;
        }
      }
    }
    if (!prompt || !instruction || !cameraFrames || (!etTrainingProfile && (!observedInitial || !observedFinal))) {
      throw new Error(
        `Unable to generate a camera trajectory meeting dataset quality${etTrainingProfile ? "" : " and endpoint"} requirements for sample ${s} after ${cameraAttemptLimit} attempts (${subjectClass}/${subjectMovement} subject${diversityAssignment ? `, assigned ${diversityAssignment.cameraMovement}, sceneScale ${sceneScale}, focalLength ${diversityAssignment.focalLength}, aspectRatio ${diversityAssignment.aspectRatio}` : ""}). Last failure: ${labelingError instanceof Error ? labelingError.message : String(labelingError)}.`,
        { cause: labelingError }
      );
    }
    const trajectoryPrompt = etTrainingProfile ? prompt : createTrajectoryPrompt(prompt, observedInitial!, observedFinal!);
    if (diversityAssignment) {
      if (trajectoryPrompt.movement.type !== diversityAssignment.cameraMovement) {
        throw new Error(`Camera quota changed at sample ${s}: assigned ${diversityAssignment.cameraMovement}, realized ${trajectoryPrompt.movement.type}.`);
      }
      const storedOptics = { focalLength: cameraFrames[0].focalLength, aspectRatio: cameraFrames[0].aspectRatio };
      acceptedDiversityAssignments.push({ ...diversityAssignment, ...storedOptics });
      realizedSubjectPathFractionCounts[String(subjectPathFraction)] =
        (realizedSubjectPathFractionCounts[String(subjectPathFraction)] ?? 0) + 1;
      diversityReceipts.push({ ...diversityAssignment, sampleIndex: s,
        baseSubjectDimensions: { ...subjects[0].dimensions }, subjectPathSeed,
        subjectPathDraw, cameraAttempts, frameCount, centeredFullShotProposals, storedOptics,
        subjectPathFraction, subjectPathStart,
      });
    }
    if (etTrainingProfile && etControls) {
      const realized = measureETGeneratedClip(cameraFrames, exportedSubjectsInfo[0].frames!);
      for (const adjustment of etControls.plausibilityAdjustments) etPlausibilityAdjustments[adjustment] = (etPlausibilityAdjustments[adjustment] ?? 0) + 1;
      etRealizedMetrics.push(realized);
      (etMetricsByRegime[etRegime] ??= []).push(realized);
      etIntendedMetrics.push(intendedETClipMetrics(etControls));
      if (etControls.nativeFrameCount < 30) etShortClipCount++;
    }
    realizedCameraMovementCounts[trajectoryPrompt.movement.type] =
      (realizedCameraMovementCounts[trajectoryPrompt.movement.type] ?? 0) + 1;
    const cinematographyPrompts: CinematographyPrompt[] = [trajectoryPrompt];
    const realizedSimulationInstructions: SimulationInstruction[] = [
      etTrainingProfile ? instruction : alignInstructionSetupsWithTrajectory(instruction, observedInitial!, observedFinal!),
    ];

    const simulationData = {
      cinematographyPrompts,
      simulationInstructions: realizedSimulationInstructions,
      subjectsInfo: exportedSubjectsInfo,
      cameraFrames,
    };

    const { formattedData, parameterDictionary: newParameterDictionary } =
      formatSimulationData(simulationData, parameterDictionary, parameterWriter);

    parameterDictionary = newParameterDictionary;

    const packedData = pack(formattedData);
    await zip.add(
      `${datasetId}/simulation_${datasetId}_${s
        .toString()
        .padStart(paddingLength, "0")}.msgpack`,
      new Uint8ArrayReader(new Uint8Array(packedData)),
      zipEntryOptions
    );

    operationCount += frameCount;
    await yieldIfNeeded(operationCount);
  }

  onProgress?.(100, "generating");
  throwIfAborted(signal);

  parameterDictionary = parameterWriter?.snapshot() ?? parameterDictionary;
  const packedDictionary = pack(parameterDictionary);
  await zip.add(
    `${datasetId}/parameter_dictionary.msgpack`,
    new Uint8ArrayReader(new Uint8Array(packedDictionary)),
    zipEntryOptions
  );

  const manifest = {
    schemaVersion: diversity ? 3 : 2,
    generatorVersion: etTrainingProfile ? 7 : diversity ? 8 : 5,
    generationProfile: etTrainingProfile ? "et-training-calibration" : diversity ? DATASET_DIVERSITY_PROFILE : "legacy-rule-based",
    datasetId,
    generatedAt: generatedAt.toISOString(),
    seed,
    ...(diversity && diversityPlan ? {
      diversity: {
        profile: DATASET_DIVERSITY_PROFILE,
        config: diversity,
        cameraSolver: "existing-rule-based-camera-trajectory-solver; no-separate-analytic-camera-path",
        cameraQuotaPolicy: "uniform-largest-remainder; follow-and-track-limited-to-moving-subject-count; remaining-quota-balanced-across-compatible-movements; assigned-type-retained-on-retry",
        sceneScaleInterpretation: "whole-scene-physical-similarity-transform; scales-subject-dimensions-subject-positions-camera-positions-and-linear-limits-together; does-not-add-independent-relative-framing",
        scaleSampling: "largest-remainder-base-smaller-larger-strata; base=1; log-uniform-within-smaller-and-larger-intervals; no-post-transform-human-dimension-clamp",
        opticsSampling: "per-clip-uniform-focal-millimetres; largest-remainder-aspect-ratios; same-optics-throughout-clip",
        realizedOptics: "exact-quantized-stored-camera-optics; planned-draws-and-storedOptics-both-in-sample-receipts",
        retryPolicy: "200-camera-attempts; same-camera-movement-class-dimensions-motion-family-duration-scale-optics; subject-path-realization-resampled-after-each-five-failed-camera-attempts; every-fifth-proposal-offers-normalized-centered-FullShot-initial-setup; fail-on-exhaustion",
        subjectPathSampling: {
          fractions: DATASET_SUBJECT_PATH_FRACTIONS,
          policy: "full-authored-curve-at-first-draw; legacy-geometric-families-cycle-declared-fractions-on-path-retry-with-seeded-contiguous-start; named-human-movements-and-static-always-retain-full-fraction=1,start=0; position-linear-and-body-rotation-quaternion-SLERP; same-stored-frame-count-and-clip-duration",
          interpretation: "feasibility-conditioned-motion-extent-and-speed-diversity; partial-curves-retain-the-authored-family-and-body-headings; not-an-unbiased-distribution-of-complete-source-curves",
          realizedFractionCounts: realizedSubjectPathFractionCounts,
          rejectedCandidatesByFraction: diversityRejectedByPathFraction,
        },
        reconstruction: "baseSubjectDimensions-and-frameCount-in-sample-receipts; subjectPathSeed-uses-createSeededRandom; camera-attempt-seed=seed+:diversity:sample:+sampleIndex+:camera:+zero-based-attempt; final-attempt=cameraAttempts-1; generatorVersion-and-config-required",
        planned: summarizeDiversity(diversityPlan),
        realized: summarizeDiversity(acceptedDiversityAssignments),
        rejectedCandidatesByCameraScaleAspect: diversityRejectedCandidates,
        sampleReceipts: diversityReceipts,
      },
    } : {}),
    ...(etTrainingProfile ? {
      modelObservation: ET_MODEL_OBSERVATION,
      etTrainingProfile: {
        ...etTrainingProfile,
        fit: "regime-conditional-quantiles; comonotonic-ranks-within-subject-netXZ/XZ/XYZ/path-and-camera-excursion/path-and-angular-excursion/path-and-H/V-lens-proxies; independent-between-groups; no-native-path-replay",
        dependenceAssumption: {
          sharedQuantileRanks: [
            ["subjectNetXZOverMedianRange", "subjectXZExcursionOverMedianRange", "subjectXYZExcursionOverMedianRange", "subjectPath30OverMedianRange"],
            ["cameraExcursionOverMedianRange", "cameraPath30OverMedianRange"],
            ["cameraAngularExcursionDeg", "cameraAngularPath30Deg"],
            ...(etTrainingProfile.useCenteredPrincipalPointFovProxy ? [["horizontalFovCenteredPrincipalPointDeg", "verticalFovCenteredPrincipalPointDeg"]] : []),
          ],
          interpretation: "comonotonic copula assumption within physically ordered groups; empirical joint correlations are not recovered",
        },
        sceneScale: "authored-scene-units; ET native units are not calibrated metres",
        framing: etTrainingProfile.useCenteredPrincipalPointFovProxy
          ? "camera-ray-proxy; paired-K-derived-H/V-FOV-assumes-centered-principal-point; effective-optical-aspect-is-tan(H/2)/tan(V/2), not measured image aspect"
          : "camera-ray-proxy; authored-FOV-and-aspect; native-subject-bbox-unknown",
        limitations: [
          "Aggregate quantiles do not recover the joint distribution or real subject articulation.",
          "Quantile draws use the central probability range; extreme reconstruction tails are not interpolated by default.",
          "Shared marginal ranks preserve physical order and TRAIN marginal quantiles; their comonotonic dependence is assumed, not fitted as the native joint distribution.",
          "Subject center paths use a controlled radial trajectory along the authored travel axis, with exact horizontal endpoint and bounded reversals; full authored curved paths are not preserved.",
          "Authored body headings remain physical truth, but the subject movement-type token is diagnostic after center-path matching.",
          "Scalar center paths fit excursion, net horizontal displacement, cumulative travel and pauses; infeasible path/pause combinations are counted explicitly. Actual median range and quantization can change realized ratios.",
          "Synthetic local-axis camera translations and independent yaw/pitch fit excursion and travel; finite sample limits and quality rejection can underfit extreme ratios.",
          "Source frame counts are floored to 30; short native durations are extended at the declared source FPS. FPS is provenance, not a model input.",
          "Quality rejection can bias rotation/position distributions; rejected candidates are reported by regime.",
        ],
      },
    } : {}),
    contract: {
      subjectsPerSample: DATASET_SUBJECT_COUNT,
      instructionsPerSample: DATASET_INSTRUCTION_COUNT,
      frameCountStoredAsParameter: false,
      subjectIndexStoredAsParameter: false,
      parameterValueTypes: ["string", "number", "boolean"],
      movementSampling: "largest-remainder-marginal",
      cameraPromptSampling: etTrainingProfile ? "ET-train-aggregate-local-translation-and-independent-rotation; quality-rejection" : diversity ? "planned-compatible-camera-movement-quotas; same-type-rejection-sampled-setups-for-quality-and-observable-endpoints" : "rejection-sampled-for-trajectory-quality-and-observable-endpoints",
      staticCameraSpeed: etTrainingProfile ? "position-static-can-rotate; fully-static-requires-exactly-frozen-pose" : "constant-with-linear-easing",
      endpointFraming: etTrainingProfile ? "not-conditioned; initial-camera-rays-fit-as-proxies; native-subject-bounds-unavailable" : "inner-labels-require-in-frame-center-no-diagonal-offscreen-labels",
      ...(etTrainingProfile ? {
        primaryMovementEnum: "diagnostic-primary-component; exact-observedMotionText-is-authoritative",
        subjectMovementEnum: "diagnostic-authored-family; controlled-center-path-may-include-reversals-and-vertical-variation",
        movementSpeedToken: "diagnostic-placeholder-unused-by-motion-only-model-caption; actual-path-speed-varies",
        minimumStoredFrameCount: 30,
      } : {}),
      cameraTrajectoryValidation: "quantized-source-and-nearest-30-frame-world-space",
      ...(diversity ? {
        linearQualityLimits: "base-policy-translation-acceleration-and-collision-clearance-multiplied-by-sample-sceneScale; angular-limits-and-absolute-packing-tolerances-unchanged",
      } : {}),
      cameraCollisionValidation: "camera-point-outside-oriented-subject-box-with-clearance",
      subjectHeadingSource: "authored-human-body-heading-or-513-frame-velocity-path",
      subjectRepresentation: "rigid-body-bounding-box-center-xyz-and-XYZ-Euler; canonical-front=-Z",
      ...(etTrainingProfile ? { worldReference: "first-subject-position-zero; coherent-translation-before-camera-generation; authored-body-and-camera-orientation-preserved" } : {}),
      humanMotion: "procedural-root-trajectories-not-articulated-motion-capture",
      subjectClassSampling: "largest-remainder-per-compatible-movement",
      subjectDimensionSampling: diversity ? "class-shape-variation-and-bounded-base-proxy; then-whole-scene-scale-without-human-bound-clamp" : "class-shape-variation-with-uniform-scale-restricted-to-human-bounds",
      initialSetupSource: etTrainingProfile ? "unavailable; motion-only caption" : "derived-from-first-camera-frame",
      finalSetupSource: etTrainingProfile ? "unavailable; motion-only caption" : "derived-from-last-camera-frame",
      instructionSetupSource: etTrainingProfile ? "diagnostic-only-unavailable-to-model; numeric poses authoritative" : "derived-from-corresponding-camera-endpoints",
      noiseApplication:
        "legacy-dynamic-position-before-heading-and-rotation-after-heading; named-human-motions-use-authored-variation",
    },
    config: {
      simulationCount,
      subjectCount,
      instructionCount,
      minFrameCount,
      maxFrameCount,
      framesPerSecond,
      subjectClassProbabilities,
      movementDistribution,
      subjectClassProbabilitiesByMovement,
      subjectScaleRange: DATASET_SUBJECT_SCALE_RANGE,
      diversity,
      noiseConfig,
    },
    realized: {
      movementCounts: realizedMovementCounts,
      subjectClassCounts: realizedSubjectClassCounts,
      subjectClassMovementCounts,
      cameraMovementCounts: realizedCameraMovementCounts,
      rejectedCameraCandidates,
      ...(etTrainingProfile ? {
        etCompatibility: {
          sourceFrameCountsFlooredTo30: etShortClipCount,
          physicalPlausibilityAdjustments: etPlausibilityAdjustments,
          intendedQuantiles: summarizeETGeneratedMetrics(etIntendedMetrics, etTrainingProfile.calibration.quantileProbabilities),
          realizedQuantiles: summarizeETGeneratedMetrics(etRealizedMetrics, etTrainingProfile.calibration.quantileProbabilities),
          realizedQuantilesByRegime: Object.fromEntries(Object.entries(etMetricsByRegime).map(([regime, rows]) =>
            [regime, summarizeETGeneratedMetrics(rows!, etTrainingProfile.calibration.quantileProbabilities)])),
          rejectedCameraCandidatesByRegime: etRejectedByRegime,
          resampledControlSetsByRegime: etResampledControlsByRegime,
          rejectedControlSetsIntendedQuantiles: summarizeETGeneratedMetrics(etRejectedControlMetrics, etTrainingProfile.calibration.quantileProbabilities),
          controlResamplingPolicy: "at-most-ten-regime-preserving-control-draws; five-camera-orientation-candidates-per-control-set; no-quality-weakening",
        },
      } : {}),
    },
    quality: DATASET_TRAJECTORY_QUALITY_POLICY,
    time: {
      framesPerSecond,
      timestampSeconds: "frameIndex / framesPerSecond",
      durationSeconds: "(storedFrameCount - 1) / framesPerSecond",
      durationRangeSeconds: [(minFrameCount - 1) / framesPerSecond, (maxFrameCount - 1) / framesPerSecond],
      trainingResampling: "LensCraft currently selects 30 paired poses; timestamps are not model inputs",
    },
    encoding: {
      archiveRootDirectory: datasetId,
      simulationFilePattern: `simulation_${datasetId}_*.msgpack`,
      parameterDictionaryFile: "parameter_dictionary.msgpack",
      parameterDictionarySchemaVersion: parameterDictionary.schemaVersion,
      fixedPointScale: DATASET_FLOAT_FACTOR,
    },
  };
  await zip.add(
    `${datasetId}/manifest.json`,
    new Uint8ArrayReader(
      new TextEncoder().encode(JSON.stringify(manifest, null, 2))
    ),
    zipEntryOptions
  );

  onProgress?.(0, "zipping");
  let finalizationDeadline = getCurrentTime() + MAIN_THREAD_TIME_BUDGET_MS;
  let finalizationOutputAborted = false;

  const abortFinalizationOutput = async () => {
    if (finalizationOutputAborted || !writable || writable.locked) return;

    finalizationOutputAborted = true;
    try {
      await writable.abort(signal?.reason);
    } catch {
      // The worker/client cleanup path also retries stream abortion.
    }
  };

  const content = await zip.close(undefined, {
    // A dataset can legitimately contain more than the classic ZIP limit of
    // 65,535 entries. Force a ZIP64 central directory in that case.
    zip64: simulationCount + 3 >= 0xffff,
    onprogress: async (progress, total) => {
      onProgress?.(total === 0 ? 100 : (progress / total) * 100, "zipping");

      if (signal?.aborted) {
        await abortFinalizationOutput();
        return;
      }

      if (getCurrentTime() < finalizationDeadline) return;

      // ZipWriter awaits this callback for every central-directory entry.
      // Yielding here lets the worker receive cancellation messages even while
      // finalizing very large ZIP64 archives.
      await yieldToEventLoop();
      finalizationDeadline = getCurrentTime() + MAIN_THREAD_TIME_BUDGET_MS;

      if (signal?.aborted) await abortFinalizationOutput();
    },
  });
  throwIfAborted(signal);

  return {
    datasetId,
    filename,
    ...(memoryWriter ? { data: content } : {}),
  };
}
