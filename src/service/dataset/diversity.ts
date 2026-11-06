import {
  CameraMovementType,
  CameraParameters,
  DynamicMode,
  SimulationInstruction,
} from "@/service/simulation/instruction/types";
import type { SubjectInfo } from "@/service/subjects/types";
import type { RandomSource } from "@/utils/randomUtils";

/** Distribution controls for the standard rule-based dataset generator. */
export interface DatasetDiversityConfig {
  sceneScale?: { min?: number; max?: number; baseFraction?: number };
  focalLength?: { min?: number; max?: number };
  aspectRatios?: number[];
}

export interface NormalizedDatasetDiversityConfig {
  sceneScale: { min: number; max: number; baseFraction: number };
  focalLength: { min: number; max: number };
  aspectRatios: number[];
}

export const DATASET_DIVERSITY_PROFILE = "rule-based-diversity-v1";
export const DEFAULT_DATASET_DIVERSITY: NormalizedDatasetDiversityConfig = {
  sceneScale: { min: 0.25, max: 3, baseFraction: 0.5 },
  focalLength: { min: 24, max: 70 },
  aspectRatios: [9 / 16, 1, 4 / 3, 16 / 9, 2.35],
};

export const DATASET_CAMERA_MOVEMENT_TYPES = Object.values(CameraMovementType)
  .filter((movement) => movement !== CameraMovementType.DutchLeft &&
    movement !== CameraMovementType.DutchRight);

export type DatasetSceneScaleStratum = "base" | "smaller" | "larger";
export interface DatasetDiversityAssignment {
  cameraMovement: CameraMovementType;
  sceneScaleStratum: DatasetSceneScaleStratum;
  sceneScale: number;
  focalLength: number;
  aspectRatio: number;
}

function assertKnownKeys(value: object, allowed: readonly string[], path: string): void {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new RangeError(`Unknown ${path} option(s): ${unknown.join(", ")}.`);
}

export function normalizeDatasetDiversity(
  config: false | DatasetDiversityConfig | undefined
): false | NormalizedDatasetDiversityConfig {
  if (config === false) return false;
  if (config !== undefined && (!config || typeof config !== "object" || Array.isArray(config))) {
    throw new TypeError("diversity must be false or a configuration object.");
  }
  if (config) assertKnownKeys(config, ["sceneScale", "focalLength", "aspectRatios"], "diversity");
  for (const key of ["sceneScale", "focalLength"] as const) {
    const value = config?.[key];
    if (value !== undefined && (!value || typeof value !== "object" || Array.isArray(value))) {
      throw new TypeError(`diversity.${key} must be a configuration object.`);
    }
    if (value) assertKnownKeys(value, key === "sceneScale" ? ["min", "max", "baseFraction"] : ["min", "max"], `diversity.${key}`);
  }
  const sceneScale = { ...DEFAULT_DATASET_DIVERSITY.sceneScale, ...config?.sceneScale };
  const focalLength = { ...DEFAULT_DATASET_DIVERSITY.focalLength, ...config?.focalLength };
  for (const [name, interval] of [["sceneScale", sceneScale], ["focalLength", focalLength]] as const) {
    if (![interval.min, interval.max].every((value) => Number.isFinite(value) && value > 0) || interval.min > interval.max) {
      throw new RangeError(`diversity.${name} requires finite positive min <= max.`);
    }
  }
  if (!Number.isFinite(sceneScale.baseFraction) || sceneScale.baseFraction < 0 || sceneScale.baseFraction > 1) {
    throw new RangeError("diversity.sceneScale.baseFraction must be between 0 and 1.");
  }
  if (sceneScale.min > 1 || sceneScale.max < 1 ||
      (sceneScale.baseFraction < 1 && (sceneScale.min === 1 || sceneScale.max === 1))) {
    throw new RangeError("diversity.sceneScale must bracket 1, with min < 1 < max when non-base samples are requested.");
  }
  const aspectRatios = config?.aspectRatios ?? DEFAULT_DATASET_DIVERSITY.aspectRatios;
  if (!Array.isArray(aspectRatios) || !aspectRatios.length ||
      aspectRatios.some((value) => !Number.isFinite(value) || value <= 0) ||
      new Set(aspectRatios).size !== aspectRatios.length) {
    throw new RangeError("diversity.aspectRatios must be a non-empty array of distinct finite positive numbers.");
  }
  return { sceneScale, focalLength, aspectRatios: [...aspectRatios] };
}

function shuffle<T>(values: T[], random: RandomSource): T[] {
  for (let index = values.length - 1; index > 0; index--) {
    const swap = Math.min(index, Math.floor(random() * (index + 1)));
    [values[index], values[swap]] = [values[swap], values[index]];
  }
  return values;
}

function schedule<T>(values: readonly T[], weights: readonly number[], count: number, random: RandomSource): T[] {
  const allocations = weights.map((weight, index) => ({ index, count: Math.floor(weight * count), remainder: weight * count % 1 }));
  const remaining = count - allocations.reduce((sum, item) => sum + item.count, 0);
  const ranked = [...allocations].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let index = 0; index < remaining; index++) ranked[index % ranked.length].count++;
  return shuffle(allocations.flatMap((item) => Array<T>(item.count).fill(values[item.index])), random);
}

export function isTrackingSubjectMovement(movement: string): boolean {
  return !["static", "idle", "turnInPlace"].includes(movement);
}

/**
 * Marginal camera quotas are as uniform as subject compatibility permits.
 * Tracking slots are assigned only to moving subjects before any camera retry.
 */
export function createDatasetCameraMovementSchedule(
  subjectMovements: readonly string[], random: RandomSource
): CameraMovementType[] {
  const count = subjectMovements.length;
  const movingIndices = shuffle(subjectMovements.flatMap((movement, index) =>
    isTrackingSubjectMovement(movement) ? [index] : []), random);
  const trackingTypes = [CameraMovementType.Follow, CameraMovementType.Track];
  const nonTrackingTypes = DATASET_CAMERA_MOVEMENT_TYPES.filter((movement) => !trackingTypes.includes(movement));
  const balanced = schedule(DATASET_CAMERA_MOVEMENT_TYPES,
    DATASET_CAMERA_MOVEMENT_TYPES.map(() => 1 / DATASET_CAMERA_MOVEMENT_TYPES.length), count, random);
  const trackingCount = Math.min(movingIndices.length,
    balanced.filter((movement) => trackingTypes.includes(movement)).length);
  const tracking = schedule(trackingTypes, [0.5, 0.5], trackingCount, random);
  const ordinary = schedule(nonTrackingTypes, nonTrackingTypes.map(() => 1 / nonTrackingTypes.length), count - trackingCount, random);
  const result = Array<CameraMovementType>(count);
  tracking.forEach((movement, index) => { result[movingIndices[index]] = movement; });
  let ordinaryIndex = 0;
  for (let index = 0; index < count; index++) result[index] ??= ordinary[ordinaryIndex++];
  return result;
}

export function createDatasetDiversityPlan(
  config: NormalizedDatasetDiversityConfig,
  subjectMovements: readonly string[], random: RandomSource
): DatasetDiversityAssignment[] {
  const count = subjectMovements.length;
  const cameraMovements = createDatasetCameraMovementSchedule(subjectMovements, random);
  const strata = schedule<DatasetSceneScaleStratum>(["base", "smaller", "larger"],
    [config.sceneScale.baseFraction, (1 - config.sceneScale.baseFraction) / 2, (1 - config.sceneScale.baseFraction) / 2], count, random);
  const aspects = schedule(config.aspectRatios, config.aspectRatios.map(() => 1 / config.aspectRatios.length), count, random);
  return strata.map((stratum, index) => ({
    cameraMovement: cameraMovements[index],
    sceneScaleStratum: stratum,
    sceneScale: stratum === "base" ? 1 : Math.exp(stratum === "smaller"
      ? Math.log(config.sceneScale.min) * (1 - random())
      : Math.log(config.sceneScale.max) * random()),
    focalLength: config.focalLength.min + random() * (config.focalLength.max - config.focalLength.min),
    aspectRatio: aspects[index],
  }));
}

/** Clone every mutable pose/dimension; never change the authored solver scene. */
export function scaleDatasetSubjects(subjects: readonly SubjectInfo[], scale: number): SubjectInfo[] {
  return subjects.map((info) => ({ ...info, subject: { ...info.subject,
    dimensions: {
      width: info.subject.dimensions.width * scale,
      height: info.subject.dimensions.height * scale,
      depth: info.subject.dimensions.depth * scale,
    },
    ...(info.subject.attentionBox ? { attentionBox: {
      dimensions: {
        width: info.subject.attentionBox.dimensions.width * scale,
        height: info.subject.attentionBox.dimensions.height * scale,
        depth: info.subject.attentionBox.dimensions.depth * scale,
      },
      position: info.subject.attentionBox.position.clone().multiplyScalar(scale),
    } } : {}),
  }, frames: info.frames?.map((frame) => ({
    position: frame.position.clone().multiplyScalar(scale), rotation: frame.rotation.clone(),
  })) }));
}

export function scaleDatasetCameraFrames(frames: readonly CameraParameters[], scale: number): CameraParameters[] {
  return frames.map((frame) => ({ ...frame,
    position: frame.position.clone().multiplyScalar(scale), rotation: frame.rotation.clone(),
  }));
}

/** Exported numeric linear limits use the same physical units as scaled poses. */
export function scaleDatasetInstruction(instruction: SimulationInstruction, scale: number): SimulationInstruction {
  return { ...instruction, setup: { ...instruction.setup, config: { ...instruction.setup.config } },
    dynamic: instruction.dynamic.type === DynamicMode.Interpolation
      ? { ...instruction.dynamic, complementSetup: { ...instruction.dynamic.complementSetup } }
      : { ...instruction.dynamic },
    ...(instruction.constraints ? { constraints: { ...instruction.constraints,
      ...(instruction.constraints.maxSpeed === undefined ? {} : { maxSpeed: instruction.constraints.maxSpeed * scale }),
      ...(instruction.constraints.maxAccelerate === undefined ? {} : { maxAccelerate: instruction.constraints.maxAccelerate * scale }),
    } } : {}),
  };
}

export function applyDatasetOptics(instruction: SimulationInstruction,
  optics: Pick<DatasetDiversityAssignment, "focalLength" | "aspectRatio">): SimulationInstruction {
  const { focalLength, aspectRatio } = optics;
  return { ...instruction,
    setup: { ...instruction.setup, config: { ...instruction.setup.config, focalLength, aspectRatio } },
    dynamic: instruction.dynamic.type === DynamicMode.Interpolation
      ? { ...instruction.dynamic, complementSetup: { ...instruction.dynamic.complementSetup, focalLength, aspectRatio } }
      : { ...instruction.dynamic },
  };
}
