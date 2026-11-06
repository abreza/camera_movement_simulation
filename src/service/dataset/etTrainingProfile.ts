import { Euler, Quaternion, Vector3 } from "three";
import type { RandomSource } from "@/utils/randomUtils";
import type { SubjectFrame, SubjectInfo } from "../subjects/types";
import {
  CameraMovementType,
  MovementSpeed,
  type CameraParameters,
  type CinematographyPrompt,
} from "../simulation/instruction/types";
import { SENSOR_WIDTH } from "../simulation/constants";

export const ET_SUBJECT_REGIMES = ["exact_static", "near_static", "moving"] as const;
export type ETSubjectRegime = (typeof ET_SUBJECT_REGIMES)[number];
export const ET_TRANSLATION_DIRECTIONS = ["right", "left", "up", "down", "forward", "backward", "static"] as const;
export type ETTranslationDirection = (typeof ET_TRANSLATION_DIRECTIONS)[number];

export interface ETQuantileSummary {
  quantiles: Record<string, Array<number | null>>;
  translationDirectionWeights: Record<ETTranslationDirection, number>;
}

/**
 * Aggregate TRAIN statistics on one common ET adapter timeline. Every motion,
 * excursion, range, ray and pause quantity uses the same 30 linear-position /
 * SLERP-camera samples. Only `frames` retains the native count for timing.
 * Native ET paths are never used as synthetic generation templates.
 */
export interface ETTrainingCalibration extends ETQuantileSummary {
  schemaVersion: 1;
  source: {
    dataset: "ET";
    split: "train" | "mixed_train";
    sampleCount: number;
    trainSplitSha256: string;
    mediaHoldoutCount: number;
    fps?: number;
    sourceFps?: number;
    fpsProvenance: string;
    modelFrameCount: 30;
    metricTimeline: "ET_adapter_linear_positions_SLERP_camera30";
    geometryTimeline: "model30";
    [key: string]: unknown;
  };
  quantileProbabilities: number[];
  regimes: Array<ETQuantileSummary & { key: ETSubjectRegime; count: number; weight: number }>;
  [key: string]: unknown;
}

export interface ETTrainingProfile {
  calibration: ETTrainingCalibration;
  /** Authored scene scale, not a conversion from ET's uncalibrated native units. */
  cameraSubjectDistanceSceneUnits?: number;
  horizontalFovDegrees?: number;
  aspectRatio?: number;
  /** K-derived FOV requires a centered principal-point assumption; opt in explicitly. */
  useCenteredPrincipalPointFovProxy?: boolean;
  /** Avoid interpolation from a p95 value to an extreme reconstruction outlier at p100. */
  quantileSamplingRange?: [number, number];
}

export interface NormalizedETTrainingProfile extends Required<ETTrainingProfile> {
  profile: "et_compatible_v1";
  framesPerSecond: number;
}

export const ET_MODEL_OBSERVATION = Object.freeze({
  profile: "et_compatible_v1",
  subjectOrientation: "unavailable",
  subjectDimensions: "default",
  defaultSubjectDimensions: [0.5, 1.7, 0.3],
  simulationInstructions: "unavailable",
  captionPolicy: "motion_only",
  movementSpeed: "unavailable",
});

const REQUIRED_QUANTILES = [
  "frames", "subjectXZExcursionOverMedianRange", "subjectXYZExcursionOverMedianRange",
  "subjectNetXZOverMedianRange",
  "subjectPath30OverMedianRange", "subjectPauseFraction30", "cameraExcursionOverMedianRange",
  "cameraPath30OverMedianRange", "cameraAngularPath30Deg", "cameraAngularExcursionDeg",
  "initialRayXOverZ", "initialRayYOverZ", "initialCameraIdentityAngleDeg",
] as const;
const signedQuantiles = new Set(["initialRayXOverZ", "initialRayYOverZ"]);
const finitePositive = (value: number, name: string) => {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be finite and positive.`);
};

function validateSummary(summary: ETQuantileSummary, probabilities: readonly number[], name: string): void {
  if (!summary || typeof summary !== "object" || !summary.quantiles) {
    throw new TypeError(`${name} requires quantiles.`);
  }
  for (const [larger, smaller] of [
    ["subjectXYZExcursionOverMedianRange", "subjectXZExcursionOverMedianRange"],
    ["subjectXZExcursionOverMedianRange", "subjectNetXZOverMedianRange"],
    ["subjectPath30OverMedianRange", "subjectXYZExcursionOverMedianRange"],
    ["cameraPath30OverMedianRange", "cameraExcursionOverMedianRange"],
    ["cameraAngularPath30Deg", "cameraAngularExcursionDeg"],
  ]) {
    if (summary.quantiles[larger].some((value, index) => (value as number) + 1e-10 < (summary.quantiles[smaller][index] as number))) {
      throw new RangeError(`${name} violates the physical quantile order ${larger} >= ${smaller}.`);
    }
  }
  for (const key of REQUIRED_QUANTILES) {
    const values = summary.quantiles[key];
    if (!Array.isArray(values) || values.length !== probabilities.length ||
        values.some((value, index) => typeof value !== "number" || !Number.isFinite(value) ||
          (!signedQuantiles.has(key) && value < 0) ||
          (index > 0 && value < (values[index - 1] as number)))) {
      throw new RangeError(`${name}.${key} requires ordered finite quantiles matching quantileProbabilities.`);
    }
    if (key === "frames" && ((values[0] as number) < 2 || (values.at(-1) as number) > 500)) {
      throw new RangeError(`${name}.frames must lie in [2, 500].`);
    }
    if (key === "subjectPauseFraction30" && (values.at(-1) as number) > 1) {
      throw new RangeError(`${name}.subjectPauseFraction30 must lie in [0, 1].`);
    }
  }
  const directions = summary.translationDirectionWeights;
  if (!directions || ET_TRANSLATION_DIRECTIONS.some((key) =>
    !Number.isFinite(directions[key]) || directions[key] < 0) ||
    Math.abs(ET_TRANSLATION_DIRECTIONS.reduce((total, key) => total + directions[key], 0) - 1) > 1e-6) {
    throw new RangeError(`${name}.translationDirectionWeights must be non-negative and sum to one.`);
  }
}

export function normalizeETTrainingProfile(profile: ETTrainingProfile): NormalizedETTrainingProfile {
  if (!profile || typeof profile !== "object") throw new TypeError("etTrainingProfile must be an object.");
  const calibration = profile.calibration;
  if (!calibration || calibration.schemaVersion !== 1 || calibration.source?.dataset !== "ET" ||
      !["train", "mixed_train"].includes(calibration.source?.split)) {
    throw new TypeError("ET calibration must use schemaVersion 1 and the ET training split.");
  }
  const source = calibration.source;
  if (source.modelFrameCount !== 30 || source.metricTimeline !== "ET_adapter_linear_positions_SLERP_camera30" ||
      source.geometryTimeline !== "model30") {
    throw new TypeError("ET calibration requires a common model30 timeline: modelFrameCount=30, " +
      "metricTimeline='ET_adapter_linear_positions_SLERP_camera30', geometryTimeline='model30'. " +
      "Legacy native/nearest-frame statistics are not valid ET model calibration.");
  }
  if (!Number.isInteger(source.sampleCount) || source.sampleCount < 1 ||
      !Number.isInteger(source.mediaHoldoutCount) || source.mediaHoldoutCount < 0 ||
      !/^[0-9a-f]{64}$/i.test(source.trainSplitSha256) || !source.fpsProvenance) {
    throw new TypeError("ET calibration requires a positive sample count, training split SHA-256 and FPS provenance.");
  }
  const framesPerSecond = source.fps ?? source.sourceFps ?? NaN;
  if (!Number.isFinite(framesPerSecond) || framesPerSecond < 10 || framesPerSecond > 120) {
    throw new RangeError("ET source FPS must lie in [10, 120].");
  }
  const probabilities = calibration.quantileProbabilities;
  if (!Array.isArray(probabilities) || probabilities.length < 2 || probabilities[0] !== 0 ||
      probabilities.at(-1) !== 1 || probabilities.some((value, index) =>
        !Number.isFinite(value) || value < 0 || value > 1 || (index > 0 && value <= probabilities[index - 1]))) {
    throw new RangeError("ET quantileProbabilities must increase strictly from zero to one.");
  }
  validateSummary(calibration, probabilities, "ET calibration");
  if (!Array.isArray(calibration.regimes) || calibration.regimes.length !== ET_SUBJECT_REGIMES.length) {
    throw new TypeError("ET calibration requires exact_static, near_static and moving regimes.");
  }
  const seen = new Set<string>();
  let regimeCount = 0;
  let totalWeight = 0;
  for (const regime of calibration.regimes) {
    if (!ET_SUBJECT_REGIMES.includes(regime.key) || seen.has(regime.key) ||
        !Number.isInteger(regime.count) || regime.count < 0 || !Number.isFinite(regime.weight) || regime.weight < 0 ||
        Math.abs(regime.weight - regime.count / source.sampleCount) > 1e-6) {
      throw new RangeError("ET regime keys/counts/weights must be unique and agree with the calibration cohort.");
    }
    seen.add(regime.key);
    regimeCount += regime.count;
    totalWeight += regime.weight;
    // Empty regimes cannot supply an empirical distribution and are never sampled.
    if (regime.count > 0) validateSummary(regime, probabilities, `ET regime ${regime.key}`);
  }
  if (regimeCount !== source.sampleCount || Math.abs(totalWeight - 1) > 1e-6) {
    throw new RangeError("ET regime counts and weights must partition the calibration cohort.");
  }
  const normalized: NormalizedETTrainingProfile = {
    profile: "et_compatible_v1",
    framesPerSecond,
    calibration,
    cameraSubjectDistanceSceneUnits: profile.cameraSubjectDistanceSceneUnits ?? 4,
    horizontalFovDegrees: profile.horizontalFovDegrees ?? 50,
    aspectRatio: profile.aspectRatio ?? 16 / 9,
    useCenteredPrincipalPointFovProxy: profile.useCenteredPrincipalPointFovProxy ?? false,
    quantileSamplingRange: profile.quantileSamplingRange ?? [0.05, 0.95],
  };
  finitePositive(normalized.cameraSubjectDistanceSceneUnits, "cameraSubjectDistanceSceneUnits");
  finitePositive(normalized.aspectRatio, "aspectRatio");
  if (!Number.isFinite(normalized.horizontalFovDegrees) || normalized.horizontalFovDegrees < 10 ||
      normalized.horizontalFovDegrees > 150 || typeof normalized.useCenteredPrincipalPointFovProxy !== "boolean") {
    throw new RangeError("ET optics require a FOV in [10, 150] and a boolean proxy opt-in.");
  }
  const [lowerProbability, upperProbability] = normalized.quantileSamplingRange;
  if (!Array.isArray(normalized.quantileSamplingRange) || normalized.quantileSamplingRange.length !== 2 ||
      !Number.isFinite(lowerProbability) || !Number.isFinite(upperProbability) ||
      lowerProbability < 0 || upperProbability > 1 || lowerProbability >= upperProbability) {
    throw new RangeError("quantileSamplingRange must be two increasing probabilities in [0, 1].");
  }
  if (normalized.useCenteredPrincipalPointFovProxy) {
    for (const [name, summary] of [["calibration", calibration], ...calibration.regimes.filter((regime) => regime.count > 0).map((regime) => [regime.key, regime])] as const) {
      const quantiles = (summary as ETQuantileSummary).quantiles;
      for (const key of ["horizontalFovCenteredPrincipalPointDeg", "verticalFovCenteredPrincipalPointDeg"]) {
        const values = quantiles[key];
        if (!Array.isArray(values) || values.length !== probabilities.length || values.some((value, index) =>
          typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value >= 180 ||
          (index > 0 && value < (values[index - 1] as number)))) {
          throw new RangeError(`ET ${name}.${key} requires finite ordered FOV quantiles in (0, 180).`);
        }
      }
    }
  }
  return normalized;
}

export function sampleETQuantile(
  profile: NormalizedETTrainingProfile,
  summary: ETQuantileSummary,
  key: string,
  random: RandomSource,
  fallback?: number,
): number {
  const values = summary.quantiles[key];
  if (!values || values.some((value) => value === null || !Number.isFinite(value))) {
    if (fallback !== undefined) return fallback;
    throw new RangeError(`No usable ET quantiles for ${key}.`);
  }
  const probabilities = profile.calibration.quantileProbabilities;
  const [minimumProbability, maximumProbability] = profile.quantileSamplingRange;
  const probability = minimumProbability + random() * (maximumProbability - minimumProbability);
  let upper = 1;
  while (upper < probabilities.length - 1 && probabilities[upper] < probability) upper++;
  const fraction = (probability - probabilities[upper - 1]) / (probabilities[upper] - probabilities[upper - 1]);
  return (values[upper - 1] as number) + ((values[upper] as number) - (values[upper - 1] as number)) * fraction;
}

function sampleDirection(summary: ETQuantileSummary, random: RandomSource): ETTranslationDirection {
  let sample = random();
  for (const direction of ET_TRANSLATION_DIRECTIONS) {
    sample -= summary.translationDirectionWeights[direction];
    if (sample < 0) return direction;
  }
  return "static";
}

export interface ETClipControls {
  regime: ETSubjectRegime;
  frameCount: number;
  nativeFrameCount: number;
  durationSeconds: number;
  subjectExcursionRatio: number;
  subjectXZExcursionRatio: number;
  subjectNetXZRatio?: number;
  subjectPathRatio: number;
  pauseFraction: number;
  cameraExcursionRatio: number;
  cameraPathRatio: number;
  cameraAngularPathDeg: number;
  cameraAngularExcursionDeg: number;
  initialRayXOverZ: number;
  initialRayYOverZ: number;
  initialCameraIdentityAngleDeg: number;
  translationDirection: ETTranslationDirection;
  horizontalFovDegrees: number;
  verticalFovDegrees?: number;
  effectiveOpticalAspectRatio?: number;
  plausibilityAdjustments: string[];
}

export function sampleETClipControls(
  profile: NormalizedETTrainingProfile,
  regime: ETSubjectRegime,
  random: RandomSource,
): ETClipControls {
  const summary = profile.calibration.regimes.find((candidate) => candidate.key === regime);
  if (!summary || summary.count === 0) throw new RangeError(`Cannot sample empty ET regime ${regime}.`);
  const sample = (key: string) => sampleETQuantile(profile, summary, key, random);
  const nativeFrameCount = Math.max(2, Math.min(500, Math.round(sample("frames"))));
  const frameCount = Math.max(30, nativeFrameCount);
  // Shared ranks preserve each TRAIN marginal and its known pointwise order.
  // This is an explicit comonotonic copula approximation within three groups,
  // not a claim to have recovered their empirical joint distribution.
  const subjectRank = random();
  const cameraTranslationRank = random();
  const cameraRotationRank = random();
  const cameraLensRank = random();
  const sampleSubject = (key: string) => sampleETQuantile(profile, summary, key, () => subjectRank);
  const sampleTranslation = (key: string) => sampleETQuantile(profile, summary, key, () => cameraTranslationRank);
  const sampleRotation = (key: string) => sampleETQuantile(profile, summary, key, () => cameraRotationRank);
  const sampleLens = (key: string) => sampleETQuantile(profile, summary, key, () => cameraLensRank);
  const horizontalFovDegrees = profile.useCenteredPrincipalPointFovProxy
    ? sampleLens("horizontalFovCenteredPrincipalPointDeg") : profile.horizontalFovDegrees;
  const verticalFovDegrees = profile.useCenteredPrincipalPointFovProxy
    ? sampleLens("verticalFovCenteredPrincipalPointDeg")
    : 2 * Math.atan(Math.tan(horizontalFovDegrees * Math.PI / 360) / profile.aspectRatio) * 180 / Math.PI;
  const effectiveOpticalAspectRatio = profile.useCenteredPrincipalPointFovProxy
    ? Math.tan(horizontalFovDegrees * Math.PI / 360) / Math.tan(verticalFovDegrees * Math.PI / 360)
    : profile.aspectRatio;
  finitePositive(effectiveOpticalAspectRatio, "effective optical aspect ratio");
  const result: ETClipControls = {
    regime,
    frameCount,
    nativeFrameCount,
    durationSeconds: (frameCount - 1) / profile.framesPerSecond,
    subjectExcursionRatio: regime === "exact_static" ? 0 : sampleSubject("subjectXYZExcursionOverMedianRange"),
    subjectXZExcursionRatio: regime === "exact_static" ? 0 : sampleSubject("subjectXZExcursionOverMedianRange"),
    subjectNetXZRatio: regime === "exact_static" ? 0 : sampleSubject("subjectNetXZOverMedianRange"),
    subjectPathRatio: regime === "exact_static" ? 0 : sampleSubject("subjectPath30OverMedianRange"),
    pauseFraction: regime === "exact_static" ? 1 : sample("subjectPauseFraction30"),
    cameraExcursionRatio: sampleTranslation("cameraExcursionOverMedianRange"),
    cameraPathRatio: sampleTranslation("cameraPath30OverMedianRange"),
    cameraAngularPathDeg: sampleRotation("cameraAngularPath30Deg"),
    cameraAngularExcursionDeg: sampleRotation("cameraAngularExcursionDeg"),
    initialRayXOverZ: sample("initialRayXOverZ"),
    initialRayYOverZ: sample("initialRayYOverZ"),
    initialCameraIdentityAngleDeg: sample("initialCameraIdentityAngleDeg"),
    translationDirection: sampleDirection(summary, random),
    horizontalFovDegrees,
    verticalFovDegrees,
    effectiveOpticalAspectRatio,
    plausibilityAdjustments: [],
  };
  for (const [pathKey, excursionKey] of [
    ["subjectPathRatio", "subjectExcursionRatio"],
    ["cameraPathRatio", "cameraExcursionRatio"],
    ["cameraAngularPathDeg", "cameraAngularExcursionDeg"],
  ] as const) {
    if (result[pathKey] < result[excursionKey]) {
      result[pathKey] = result[excursionKey];
      result.plausibilityAdjustments.push(`${pathKey}-raised-to-excursion`);
    }
  }
  if (result.subjectExcursionRatio < result.subjectXZExcursionRatio) {
    result.subjectExcursionRatio = result.subjectXZExcursionRatio;
    result.subjectPathRatio = Math.max(result.subjectPathRatio, result.subjectExcursionRatio);
    result.plausibilityAdjustments.push("subjectXYZ-raised-to-XZ-excursion");
  }
  if (nativeFrameCount < 30) result.plausibilityAdjustments.push("source-frame-count-floored-to-30");
  return result;
}

const smooth = (value: number) => value * value * (3 - 2 * value);
const trainingIndices = (count: number) => Array.from({ length: 30 }, (_, index) => Math.round(index * (count - 1) / 29));

/** A genuine interior pause, with smooth braking and acceleration. */
function pausedProgress(time: number, pauseFraction: number): number {
  const pause = Math.min(0.9, Math.max(0, pauseFraction));
  if (pause < 1e-6) return time;
  const stop = (1 - pause) / 2;
  const resume = 1 - stop;
  if (time < stop) return 0.5 * smooth(time / stop);
  if (time <= resume) return 0.5;
  return 0.5 + 0.5 * smooth((time - resume) / stop);
}

/** Fits finite cumulative travel and excursion separately on the model's 30 paired samples. */
function fitBoundedProgress(
  frameCount: number,
  desiredTravelRatio: number,
  pauseFraction = 0,
  measureRatio?: (progress: number[]) => number,
): { progress: number[]; reverses: boolean } {
  const indices = trainingIndices(frameCount);
  const make = (cycles: number) => {
    const values = Array.from({ length: frameCount }, (_, index) =>
      Math.sin(Math.PI * cycles * pausedProgress(index / (frameCount - 1), pauseFraction) / 2) ** 2);
    const peak = Math.max(...indices.map((index) => values[index]));
    return values.map((value) => Math.min(1, value / Math.max(peak, 1e-12)));
  };
  const travel = measureRatio ?? ((progress: number[]) => indices.slice(1).reduce((sum, index, step) =>
    sum + Math.abs(progress[index] - progress[indices[step]]), 0));
  const target = Math.max(1, desiredTravelRatio);
  let bestCycles = 1;
  let bestProgress = make(1);
  let bestError = Math.abs(travel(bestProgress) - target);
  const maximumCycles = Math.min(12, (frameCount - 1) / 3);
  for (let cycles = 1.25; cycles <= maximumCycles; cycles += 0.25) {
    const progress = make(cycles);
    const error = Math.abs(travel(progress) - target);
    if (error < bestError) { bestCycles = cycles; bestProgress = progress; bestError = error; }
  }
  let lower = Math.max(1, bestCycles - 0.25);
  let upper = Math.min(maximumCycles, bestCycles + 0.25);
  for (let iteration = 0; iteration < 22; iteration++) {
    const cycles = (lower + upper) / 2;
    const progress = make(cycles);
    const ratio = travel(progress);
    const error = Math.abs(ratio - target);
    if (error < bestError) { bestCycles = cycles; bestProgress = progress; bestError = error; }
    if (ratio < target) lower = cycles;
    else upper = cycles;
  }
  return { progress: bestProgress, reverses: bestCycles > 1.001 };
}

/** Exact peak/end anchors on the stored model samples, with bounded extra travel. */
function fitEndpointProgress(
  frameCount: number,
  endpoint: number,
  targetPath: number,
  pauseFraction: number,
  measurePath: (progress: number[]) => number,
): { progress: number[]; adjustments: string[] } {
  const adjustments: string[] = [];
  const alpha = Math.min(1, Math.max(0, endpoint));
  const indices = trainingIndices(frameCount);
  const baseLegCount = alpha >= 1 - 1e-12 ? 1 : 2;
  const requestedPauseEdges = Math.min(28, Math.max(0, Math.round(pauseFraction * 29)));
  const build = (fullLoops: number, partial: number | undefined) => {
    const marks = [0];
    for (let loop = 0; loop < fullLoops; loop++) marks.push(1, 0);
    if (partial !== undefined) marks.push(partial, 0);
    marks.push(1);
    if (baseLegCount === 2) marks.push(alpha);
    const legCount = marks.length - 1;
    const pauseEdges = Math.min(requestedPauseEdges, 29 - legCount);
    // Use equal fixed leg allocation. Changing the partial-loop depth then
    // changes the measured path continuously without moving/skipping a turn.
    const movingEdges = 29 - pauseEdges;
    const steps = Array.from({ length: legCount }, (_, leg) =>
      Math.floor(movingEdges / legCount) + (leg < movingEdges % legCount ? 1 : 0));
    const values = [0];
    const basePeak = marks.length - baseLegCount;
    for (let leg = 0; leg < legCount; leg++) {
      for (let step = 1; step <= steps[leg]; step++) {
        values.push(marks[leg] + (marks[leg + 1] - marks[leg]) * smooth(step / steps[leg]));
      }
      if (leg + 1 === basePeak) for (let hold = 0; hold < pauseEdges; hold++) values.push(1);
    }
    const source = Array(frameCount).fill(0);
    for (let interval = 1; interval < 30; interval++) {
      const first = indices[interval - 1];
      const last = indices[interval];
      for (let index = first; index <= last; index++) {
        source[index] = values[interval - 1] + (values[interval] - values[interval - 1]) * smooth((index - first) / (last - first));
      }
    }
    return { progress: source, pauseEdges };
  };
  const base = build(0, undefined);
  const minimumPath = measurePath(base.progress);
  if (targetPath < minimumPath - 1e-6) {
    adjustments.push("subject-path-raised-to-scalar-endpoint-minimum");
    if (base.pauseEdges < requestedPauseEdges) adjustments.push("subject-pause-reduced-for-endpoint-capacity");
    return { progress: base.progress, adjustments };
  }
  if (Math.abs(targetPath - minimumPath) <= 1e-6) {
    if (base.pauseEdges < requestedPauseEdges) adjustments.push("subject-pause-reduced-for-endpoint-capacity");
    return { progress: base.progress, adjustments };
  }
  // Never allocate more turning legs than the 29 model intervals can contain.
  const maximumLoops = Math.max(0, Math.floor((29 - requestedPauseEdges - baseLegCount - 2) / 2));
  let best = base;
  let bestError = Math.abs(minimumPath - targetPath);
  for (let loops = 0; loops <= maximumLoops; loops++) {
    const lowCandidate = build(loops, 0);
    const highCandidate = build(loops, 1);
    const lowPath = measurePath(lowCandidate.progress);
    const highPath = measurePath(highCandidate.progress);
    for (const candidate of [lowCandidate, highCandidate]) {
      const error = Math.abs(measurePath(candidate.progress) - targetPath);
      if (error < bestError) { best = candidate; bestError = error; }
    }
    if (targetPath < lowPath || targetPath > highPath) continue;
    let lower = 0;
    let upper = 1;
    for (let iteration = 0; iteration < 24; iteration++) {
      const candidate = build(loops, (lower + upper) / 2);
      const path = measurePath(candidate.progress);
      const error = Math.abs(path - targetPath);
      if (error < bestError) { best = candidate; bestError = error; }
      if (path < targetPath) lower = (lower + upper) / 2;
      else upper = (lower + upper) / 2;
    }
    break;
  }
  if (best.pauseEdges < requestedPauseEdges) adjustments.push("subject-pause-reduced-for-endpoint-capacity");
  if (bestError > Math.max(1e-5, targetPath * 1e-4)) adjustments.push("subject-path-limited-by-29-model-edges-and-scalar-shape");
  return { progress: best.progress, adjustments };
}

/** Preserves authored body heading; movement direction never substitutes for it. */
export function prepareETSubjectFrames(
  profile: NormalizedETTrainingProfile,
  controls: ETClipControls,
  inputFrames: readonly SubjectFrame[],
): SubjectFrame[] {
  if (!inputFrames.length) throw new RangeError("ET subject needs authored frames.");
  const origin = inputFrames[0].position;
  const indices = trainingIndices(controls.frameCount);
  const distance = profile.cameraSubjectDistanceSceneUnits;
  const targetXZ = controls.subjectXZExcursionRatio * distance;
  const targetXYZ = controls.subjectExcursionRatio * distance;
  const targetNetXZ = Math.min(targetXZ, Math.max(0, (controls.subjectNetXZRatio ?? controls.subjectXZExcursionRatio) * distance));
  const peakAuthored = inputFrames.reduce((best, frame) => {
    const delta = frame.position.clone().sub(origin).setY(0);
    return delta.lengthSq() > best.lengthSq() ? delta : best;
  }, new Vector3());
  const travelAxis = peakAuthored.lengthSq() > 1e-12 ? peakAuthored.normalize() : new Vector3(1, 0, 0);
  const verticalAmplitude = Math.sqrt(Math.max(0, targetXYZ ** 2 - targetXZ ** 2));
  const makeFrames = (progress: number[]) => {
    const frames = progress.map((value) => {
      const source = value * (inputFrames.length - 1);
      const lower = Math.floor(source);
      const upper = Math.min(lower + 1, inputFrames.length - 1);
      const fraction = source - lower;
      return {
        // Center coherently on the first subject point, as in ET. The camera
        // is subsequently generated in this same frame; body rotations stay authored.
        position: travelAxis.clone().multiplyScalar(value * targetXZ).setY(
          verticalAmplitude * Math.sin(Math.PI * value / 2) ** 2),
        rotation: new Euler(0, inputFrames[lower].rotation.y +
          (inputFrames[upper].rotation.y - inputFrames[lower].rotation.y) * fraction, 0, "XYZ"),
      };
    });
    return frames;
  };
  if (controls.regime === "exact_static" || targetXYZ < 1e-12) {
    return Array.from({ length: controls.frameCount }, () => ({ position: new Vector3(), rotation: inputFrames[0].rotation.clone() }));
  }
  const fit = fitEndpointProgress(controls.frameCount, targetXZ > 1e-12 ? targetNetXZ / targetXZ : 1,
    controls.subjectPathRatio * distance, controls.pauseFraction, (progress) => {
    const frames = makeFrames(progress);
    return indices.slice(1).reduce((sum, index, step) =>
      sum + frames[index].position.distanceTo(frames[indices[step]].position), 0);
  });
  for (const adjustment of fit.adjustments) if (!controls.plausibilityAdjustments.includes(adjustment)) controls.plausibilityAdjustments.push(adjustment);
  return makeFrames(fit.progress);
}

const directionVectors: Record<ETTranslationDirection, Vector3> = {
  right: new Vector3(1, 0, 0), left: new Vector3(-1, 0, 0),
  up: new Vector3(0, 1, 0), down: new Vector3(0, -1, 0),
  forward: new Vector3(0, 0, -1), backward: new Vector3(0, 0, 1), static: new Vector3(),
};

export interface ETGeneratedCandidate {
  cameraFrames: CameraParameters[];
  prompt: CinematographyPrompt;
  controls: { yawDegrees: number; pitchDegrees: number; translationSceneUnits: number };
}

/** Camera-local translation and independent yaw/pitch, without subject-front information. */
export function generateETCameraCandidate(
  profile: NormalizedETTrainingProfile,
  controls: ETClipControls,
  subjectInfo: SubjectInfo,
  random: RandomSource,
): ETGeneratedCandidate {
  const subjectStart = subjectInfo.frames?.[0];
  if (!subjectStart) throw new RangeError("ET camera generation needs the subject's initial position.");
  const ray = new Vector3(controls.initialRayXOverZ, -controls.initialRayYOverZ, -1).normalize();
  const axis = new Vector3(random() * 2 - 1, random() * 2 - 1, 0).normalize();
  if (axis.lengthSq() < 1e-12) axis.set(0, 1, 0);
  const initialRotation = new Quaternion().setFromAxisAngle(axis, controls.initialCameraIdentityAngleDeg * Math.PI / 180);
  const start = subjectStart.position.clone().addScaledVector(ray.clone().applyQuaternion(initialRotation),
    -profile.cameraSubjectDistanceSceneUnits);
  const rotationAngle = Math.max(0, controls.cameraAngularExcursionDeg) * Math.PI / 180;
  const yawShare = 0.55 + random() * 0.4;
  const sampledYaw = rotationAngle * yawShare * (random() < 0.5 ? -1 : 1);
  const sampledPitch = rotationAngle * Math.sqrt(1 - yawShare ** 2) * (random() < 0.5 ? -1 : 1);
  // Explicitly freeze components below export resolution. A Static label must
  // describe exact frozen geometry, never merely a small native translation.
  const yaw = Math.abs(sampledYaw) > 0.003 ? sampledYaw : 0;
  const pitch = Math.abs(sampledPitch) > 0.003 ? sampledPitch : 0;
  const effectiveAngle = Math.hypot(yaw, pitch);
  const rotationAxis = new Vector3(pitch, yaw, 0).normalize();
  if (rotationAxis.lengthSq() < 1e-12) rotationAxis.set(0, 1, 0);
  const angularProgress = fitBoundedProgress(controls.frameCount,
    effectiveAngle > 1e-12 ? controls.cameraAngularPathDeg * Math.PI / 180 / effectiveAngle : 1);
  const rotations = angularProgress.progress.map((progress) => initialRotation.clone().multiply(
    new Quaternion().setFromAxisAngle(rotationAxis, effectiveAngle * progress)));
  const makePositions = (progress: number[]) => {
    const positions = [start.clone()];
    for (let index = 1; index < controls.frameCount; index++) {
      const midRotation = rotations[index - 1].clone().slerp(rotations[index], 0.5);
      const velocity = directionVectors[controls.translationDirection].clone().applyQuaternion(midRotation);
      positions.push(positions[index - 1].clone().addScaledVector(velocity, progress[index] - progress[index - 1]));
    }
    return positions;
  };
  const indices = trainingIndices(controls.frameCount);
  const translationProgress = fitBoundedProgress(controls.frameCount,
    controls.cameraExcursionRatio > 1e-12 ? controls.cameraPathRatio / controls.cameraExcursionRatio : 1,
    0, (progress) => {
      const positions = makePositions(progress);
      const peak = Math.max(...indices.map((index) => positions[index].distanceTo(start)));
      return peak > 1e-12 ? indices.slice(1).reduce((sum, index, step) =>
        sum + positions[index].distanceTo(positions[indices[step]]), 0) / peak : 1;
    });
  const positions = makePositions(translationProgress.progress);
  const sampledDistance = profile.cameraSubjectDistanceSceneUnits * controls.cameraExcursionRatio;
  const distance = sampledDistance > 0.002 ? sampledDistance : 0;
  const generatedExcursion = Math.max(...indices.map((index) => positions[index].distanceTo(start)));
  const translationScale = generatedExcursion > 1e-12 ? distance / generatedExcursion : 0;
  const horizontalFov = controls.horizontalFovDegrees * Math.PI / 180;
  const opticalAspect = controls.effectiveOpticalAspectRatio ?? profile.aspectRatio;
  finitePositive(opticalAspect, "effective optical aspect ratio");
  const focalLength = SENSOR_WIDTH * Math.min(opticalAspect, 1) / (2 * Math.tan(horizontalFov / 2));
  const cameraFrames = positions.map((position, index) => ({
    position: position.sub(start).multiplyScalar(translationScale).add(start),
    rotation: new Euler().setFromQuaternion(rotations[index], "XYZ"),
    focalLength,
    aspectRatio: opticalAspect,
  }));
  const translate = controls.translationDirection !== "static" && distance > 0.002;
  const yawActive = Math.abs(yaw) > 0.003;
  const pitchActive = Math.abs(pitch) > 0.003;
  const directionTypes: Record<ETTranslationDirection, CameraMovementType> = {
    right: CameraMovementType.TruckRight, left: CameraMovementType.TruckLeft,
    up: CameraMovementType.PedestalUp, down: CameraMovementType.PedestalDown,
    forward: CameraMovementType.DollyIn, backward: CameraMovementType.DollyOut, static: CameraMovementType.Static,
  };
  const type = translate ? directionTypes[controls.translationDirection]
    : yawActive ? (yaw > 0 ? CameraMovementType.PanLeft : CameraMovementType.PanRight)
    : pitchActive ? (pitch > 0 ? CameraMovementType.TiltUp : CameraMovementType.TiltDown)
    : CameraMovementType.Static;
  // This exact authored text is the observation. SIM's stronger primitive semantics
  // and endpoint/body-view labels are deliberately absent from model conditioning.
  const clauses: string[] = [];
  if (translate) clauses.push(`moves ${controls.translationDirection} along its own ${["up", "down"].includes(controls.translationDirection) ? "vertical" : ["left", "right"].includes(controls.translationDirection) ? "horizontal" : "forward"} axis${translationProgress.reverses ? " and reverses direction during the shot" : ""}`);
  else clauses.push("stays in the same position");
  if (yawActive) clauses.push(`pans ${yaw > 0 ? "left" : "right"}`);
  if (pitchActive) clauses.push(`tilts ${pitch > 0 ? "up" : "down"}`);
  if (!yawActive && !pitchActive) clauses.push("keeps its orientation fixed");
  if ((yawActive || pitchActive) && angularProgress.reverses) clauses.push("reverses its rotation during the shot");
  const observedMotionText = `The camera ${clauses.join(" and ")}.`;
  return {
    cameraFrames,
    prompt: { movement: { type, speed: MovementSpeed.Constant }, observedMotionText },
    controls: { yawDegrees: yaw * 180 / Math.PI, pitchDegrees: pitch * 180 / Math.PI, translationSceneUnits: translate ? distance : 0 },
  };
}

export interface ETGeneratedMetrics {
  frames: number;
  subjectXZExcursionOverMedianRange: number;
  subjectXYZExcursionOverMedianRange: number;
  subjectNetXZOverMedianRange: number;
  subjectPath30OverMedianRange: number;
  subjectPauseFraction30: number;
  cameraExcursionOverMedianRange: number;
  cameraPath30OverMedianRange: number;
  cameraAngularPath30Deg: number;
  cameraAngularExcursionDeg: number;
  initialRayXOverZ: number;
  initialRayYOverZ: number;
  initialCameraIdentityAngleDeg: number;
  horizontalFovCenteredPrincipalPointDeg: number;
  verticalFovCenteredPrincipalPointDeg: number;
}

export function intendedETClipMetrics(controls: ETClipControls): ETGeneratedMetrics {
  return {
    frames: controls.frameCount,
    subjectXZExcursionOverMedianRange: controls.subjectXZExcursionRatio,
    subjectXYZExcursionOverMedianRange: controls.subjectExcursionRatio,
    subjectNetXZOverMedianRange: controls.subjectNetXZRatio ?? controls.subjectXZExcursionRatio,
    subjectPath30OverMedianRange: controls.subjectPathRatio,
    subjectPauseFraction30: controls.pauseFraction,
    cameraExcursionOverMedianRange: controls.cameraExcursionRatio,
    cameraPath30OverMedianRange: controls.cameraPathRatio,
    cameraAngularPath30Deg: controls.cameraAngularPathDeg,
    cameraAngularExcursionDeg: controls.cameraAngularExcursionDeg,
    initialRayXOverZ: controls.initialRayXOverZ,
    initialRayYOverZ: controls.initialRayYOverZ,
    initialCameraIdentityAngleDeg: controls.initialCameraIdentityAngleDeg,
    horizontalFovCenteredPrincipalPointDeg: controls.horizontalFovDegrees,
    verticalFovCenteredPrincipalPointDeg: controls.verticalFovDegrees ??
      2 * Math.atan(Math.tan(controls.horizontalFovDegrees * Math.PI / 360) /
        (controls.effectiveOpticalAspectRatio ?? 16 / 9)) * 180 / Math.PI,
  };
}

function median(values: number[]): number {
  const ordered = [...values].sort((a, b) => a - b);
  const mid = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[mid] : (ordered[mid - 1] + ordered[mid]) / 2;
}

/** Measures the stored paired poses, using the same nearest 30-frame selection as training. */
export function measureETGeneratedClip(cameraFrames: readonly CameraParameters[], subjectFrames: readonly SubjectFrame[]): ETGeneratedMetrics {
  const indices = trainingIndices(cameraFrames.length);
  const range = median(indices.map((index) => cameraFrames[index].position.distanceTo(subjectFrames[index].position)));
  finitePositive(range, "Generated median camera-subject range");
  const subjectStart = subjectFrames[0].position;
  const cameraStart = cameraFrames[0].position;
  const cameraRotations = cameraFrames.map((camera) => new Quaternion().setFromEuler(camera.rotation));
  let subjectPath = 0;
  let cameraPath = 0;
  let angularPath = 0;
  let pauses = 0;
  for (let step = 1; step < indices.length; step++) {
    const current = indices[step];
    const previous = indices[step - 1];
    const subjectStep = subjectFrames[current].position.distanceTo(subjectFrames[previous].position);
    subjectPath += subjectStep;
    cameraPath += cameraFrames[current].position.distanceTo(cameraFrames[previous].position);
    angularPath += cameraRotations[current].angleTo(cameraRotations[previous]) * 180 / Math.PI;
    if (subjectStep <= 0.0005 * range) pauses++;
  }
  const initialRay = subjectStart.clone().sub(cameraStart).applyQuaternion(cameraRotations[0].clone().invert());
  const initialCamera = cameraFrames[0];
  const filmWidth = SENSOR_WIDTH * Math.min(initialCamera.aspectRatio, 1);
  const filmHeight = SENSOR_WIDTH / Math.max(initialCamera.aspectRatio, 1);
  const lastSubject = subjectFrames.at(-1)!.position;
  return {
    frames: cameraFrames.length,
    subjectXZExcursionOverMedianRange: Math.max(...indices.map((index) => Math.hypot(subjectFrames[index].position.x - subjectStart.x, subjectFrames[index].position.z - subjectStart.z))) / range,
    subjectXYZExcursionOverMedianRange: Math.max(...indices.map((index) => subjectFrames[index].position.distanceTo(subjectStart))) / range,
    subjectNetXZOverMedianRange: Math.hypot(lastSubject.x - subjectStart.x, lastSubject.z - subjectStart.z) / range,
    subjectPath30OverMedianRange: subjectPath / range,
    subjectPauseFraction30: pauses / 29,
    cameraExcursionOverMedianRange: Math.max(...indices.map((index) => cameraFrames[index].position.distanceTo(cameraStart))) / range,
    cameraPath30OverMedianRange: cameraPath / range,
    cameraAngularPath30Deg: angularPath,
    cameraAngularExcursionDeg: Math.max(...indices.map((index) => cameraRotations[index].angleTo(cameraRotations[0]))) * 180 / Math.PI,
    initialRayXOverZ: initialRay.x / -initialRay.z,
    initialRayYOverZ: -initialRay.y / -initialRay.z,
    initialCameraIdentityAngleDeg: cameraRotations[0].angleTo(new Quaternion()) * 180 / Math.PI,
    horizontalFovCenteredPrincipalPointDeg: 2 * Math.atan(filmWidth / (2 * initialCamera.focalLength)) * 180 / Math.PI,
    verticalFovCenteredPrincipalPointDeg: 2 * Math.atan(filmHeight / (2 * initialCamera.focalLength)) * 180 / Math.PI,
  };
}

export function summarizeETGeneratedMetrics(rows: readonly ETGeneratedMetrics[], probabilities: readonly number[]): Record<string, number[]> {
  if (!rows.length) return {};
  return Object.fromEntries(Object.keys(rows[0]).map((key) => {
    const values = rows.map((row) => row[key as keyof ETGeneratedMetrics]).sort((a, b) => a - b);
    return [key, probabilities.map((probability) => {
      const location = probability * (values.length - 1);
      const lower = Math.floor(location);
      const upper = Math.ceil(location);
      return values[lower] + (values[upper] - values[lower]) * (location - lower);
    })];
  }));
}
