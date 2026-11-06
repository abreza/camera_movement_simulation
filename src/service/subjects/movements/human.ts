import * as THREE from "three";
import { DEFAULT_FRAME_COUNT } from "../../simulation/constants";
import { MovementGenerator, ObjectClass, RandomizationSettings, Subject, SubjectFrame } from "../types";
import { getRandomWithSeed } from "../utils";

export const HUMAN_MOVEMENT_TYPES = [
  "walk", "run", "wander", "stopStart", "sidestep", "backward", "turnInPlace", "idle",
] as const;
export type HumanMovementType = (typeof HUMAN_MOVEMENT_TYPES)[number];

export function isHumanMovement(movement: string): movement is HumanMovementType {
  return (HUMAN_MOVEMENT_TYPES as readonly string[]).includes(movement);
}

export const DEFAULT_HUMAN_DURATION_SECONDS = 4;
// A fixed integration grid makes curved paths independent of export FPS.
const COURSE_SAMPLES = 2049;
const clamp = (x: number, low: number, high: number) => Math.min(high, Math.max(low, x));
const smoothstep = (x: number) => x * x * (3 - 2 * x);
const smootherstep = (x: number) => x * x * x * (10 + x * (-15 + 6 * x));

export function validateMotionDuration(duration = DEFAULT_HUMAN_DURATION_SECONDS): number {
  if (!Number.isFinite(duration) || duration <= 0 || duration > 60) {
    throw new RangeError("Subject motion durationSeconds must be finite and in (0, 60]");
  }
  return duration;
}

/** Normalized moving time and speed, with smooth braking and a genuine pause. */
function stopStartProgress(t: number, stop: number, resume: number): [number, number] {
  const ramp = 0.09;
  if (t <= stop - ramp) return [t, 1];
  if (t < stop) {
    const q = (t - stop + ramp) / ramp;
    return [stop - ramp + ramp * (q - q ** 3 + 0.5 * q ** 4), 1 - smoothstep(q)];
  }
  const stoppedDistance = stop - ramp / 2;
  if (t <= resume) return [stoppedDistance, 0];
  if (t < resume + ramp) {
    const q = (t - resume) / ramp;
    return [stoppedDistance + ramp * (q ** 3 - 0.5 * q ** 4), smoothstep(q)];
  }
  return [stoppedDistance + t - resume - ramp / 2, 1];
}

/**
 * Root trajectories, not skeletal animation. Positions are bbox centres and
 * local -Z is the body front. Small positive root bob keeps every upright bbox
 * above the floor. All random choices are made per clip, never per frame.
 * Generic position/rotation noise and vehicle heading recovery must not be
 * applied afterwards: they would erase the pause and sideways/backward intent.
 */
export function generateHumanMotionFrames(
  subject: Subject,
  index: number,
  totalSubjects: number,
  movement: HumanMovementType,
  settings?: RandomizationSettings,
  frameCount = DEFAULT_FRAME_COUNT
): SubjectFrame[] {
  if (subject.class !== ObjectClass.Human) {
    throw new Error(`Movement ${movement} requires a Human subject`);
  }
  const duration = validateMotionDuration(settings?.durationSeconds);
  const randomized = settings?.enabled ?? false;
  const seed = settings?.seed ?? 0;
  const random = (salt: number, low: number, high: number) =>
    randomized ? getRandomWithSeed(seed + salt, low, high) : (low + high) / 2;
  const height = subject.dimensions.height;
  const stature = clamp(Math.sqrt(height / 1.7), 0.8, 1.2);
  const baseYaw = 2 * Math.PI * index / Math.max(1, totalSubjects) +
    (randomized ? settings?.rotationOffset ?? 0 : 0);
  const sign = randomized && random(7.12, 0, 1) < (settings?.directionReversalProbability ?? 0.5) ? -1 : 1;
  const originX = randomized ? settings?.positionOffset?.x ?? 0 : 0;
  const originZ = randomized ? settings?.positionOffset?.z ?? 0 : 0;
  const phase = randomized ? settings?.phaseOffset ?? random(7.34, 0, 2 * Math.PI) : 0;
  const speedRanges: Record<HumanMovementType, [number, number]> = {
    walk: [0.7, 1.6], run: [1.8, 3.6], wander: [0.5, 1.25], stopStart: [0.8, 1.5],
    sidestep: [0.3, 0.85], backward: [0.3, 0.8], turnInPlace: [0, 0], idle: [0, 0],
  };
  const [minimumSpeed, maximumSpeed] = speedRanges[movement];
  const speedFactor = randomized ? random(7.56,
    clamp(settings?.speedFactor?.min ?? 1, 0.5, 1.5),
    clamp(settings?.speedFactor?.max ?? 1, 0.5, 1.5)) : 1;
  // Size and random speed factors cannot turn a walk/side-step into a sprint.
  const speed = clamp(random(7.78, minimumSpeed, maximumSpeed) * stature * speedFactor,
    minimumSpeed, maximumSpeed);
  const stop = random(8.11, 0.28, 0.36);
  const resume = stop + random(8.22, 0.22, 0.3);
  const bobAmplitude = random(8.33, movement === "run" ? 0.025 : 0.012,
    movement === "run" ? 0.06 : 0.03) * stature;
  const stride = (movement === "run" ? 1.0 : 0.65) * stature;
  const coursePhase = random(8.44, 0, Math.PI * 2);
  // Bound turn rates in seconds as well as keeping the random course smooth.
  const bend = Math.min(random(8.55, 0.35, 0.85), duration * 0.15);
  const cycles = random(8.66, 0.45, 1.05);
  const course = (t: number) => baseYaw + bend * (
    Math.sin(2 * Math.PI * cycles * t + coursePhase) - Math.sin(coursePhase) +
    0.25 * (Math.sin(4 * Math.PI * cycles * t + phase) - Math.sin(phase))
  );

  const integratedCourse: THREE.Vector2[] = [new THREE.Vector2()];
  if (movement === "wander") {
    for (let i = 1; i < COURSE_SAMPLES; i++) {
      const yaw = course((i - 0.5) / (COURSE_SAMPLES - 1));
      integratedCourse.push(integratedCourse[i - 1].clone().add(
        new THREE.Vector2(-Math.sin(yaw), -Math.cos(yaw)).multiplyScalar(speed * duration / (COURSE_SAMPLES - 1))
      ));
    }
  }

  return Array.from({ length: frameCount }, (_, i) => {
    const t = i / Math.max(1, frameCount - 1);
    const seconds = t * duration;
    const [progress, moving] = movement === "stopStart" ? stopStartProgress(t, stop, resume) : [t, 1];
    const distance = speed * duration * progress;
    let yaw = baseYaw;
    let dx = 0;
    let dz = 0;
    let bob = 0;
    if (movement === "turnInPlace") {
      const turn = sign * Math.min(random(8.77, Math.PI / 3, Math.PI * 0.9), duration * 0.75);
      yaw += turn * smootherstep(t);
    } else if (movement === "idle") {
      // Quiet weight shift and looking around; use static for an exact freeze.
      const sway = random(8.88, 0.006, 0.018) * stature;
      const idlePhase = seconds * random(8.99, 0.6, 1.2);
      dx = sway * (Math.sin(idlePhase + phase) - Math.sin(phase));
      dz = sway * 0.5 * (Math.sin(idlePhase * 0.7 + coursePhase) - Math.sin(coursePhase));
      bob = 0.006 * stature * Math.sin(idlePhase * 0.5) ** 2;
      yaw += random(9.11, 0.04, 0.1) * (Math.sin(idlePhase * 0.65 + phase) - Math.sin(phase));
    } else {
      if (movement === "wander") {
        const source = t * (COURSE_SAMPLES - 1);
        const lower = Math.floor(source);
        const point = integratedCourse[lower].clone().lerp(
          integratedCourse[Math.min(lower + 1, COURSE_SAMPLES - 1)], source - lower);
        dx = point.x;
        dz = point.y;
        yaw = course(t);
      } else {
        const travelYaw = baseYaw + (movement === "sidestep" ? sign * Math.PI / 2 : movement === "backward" ? Math.PI : 0);
        dx = -Math.sin(travelYaw) * distance;
        dz = -Math.cos(travelYaw) * distance;
      }
      // Bob follows distance travelled, so no gait continues through a stop.
      bob = bobAmplitude * moving * Math.sin(Math.PI * distance / stride) ** 2;
    }
    return {
      position: new THREE.Vector3(originX + dx, height / 2 + bob, originZ + dz),
      rotation: new THREE.Euler(0, yaw, 0),
    };
  });
}

export const humanMovementGenerators = Object.fromEntries(
  HUMAN_MOVEMENT_TYPES.map((movement) => [movement,
    ((subject, index, totalSubjects, settings) =>
      generateHumanMotionFrames(subject, index, totalSubjects, movement, settings)) as MovementGenerator,
  ])
) as Record<HumanMovementType, MovementGenerator>;
