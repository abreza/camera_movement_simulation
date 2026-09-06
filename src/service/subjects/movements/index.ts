import * as THREE from "three";
import { Subject, SubjectFrame, RandomizationSettings } from "../types";
import { addMovementNoise } from "../utils";
import { generateRandomSettings } from "../randomization";

import { MovementGenerator } from "../types";
import { generateCircularMotion } from "./circular";
import { generateZigzagMotion } from "./zigzag";
import { generateLinearMotion } from "./linear";
import { generateSpiralMotion } from "./spiral";
import { generateStaticMotion } from "./static";
import { generateFigureEightMotion } from "./figureEight";
import { generateWaveMotion } from "./wave";
import { generatePendulumMotion } from "./pendulum";
import { generateOrbitalMotion } from "./orbital";
import { generateBounceMotion } from "./bounce";

export const movementGenerators: Record<string, MovementGenerator> = {
  circular: generateCircularMotion,
  zigzag: generateZigzagMotion,
  linear: generateLinearMotion,
  spiral: generateSpiralMotion,
  static: generateStaticMotion,
  figureEight: generateFigureEightMotion,
  wave: generateWaveMotion,
  pendulum: generatePendulumMotion,
  orbital: generateOrbitalMotion,
  bounce: generateBounceMotion,
};

const COLLISION_MARGIN = 0.2;
const POSITION_EPSILON = 1e-7;
// Derive headings in clip time, independently of the export's frame count.
// Sparse, linearly interpolated control points otherwise create brief turns
// that become large sweeps when a camera follows at a distance.
const HEADING_REFERENCE_FRAME_COUNT = 513;
const TARGET_YAW_TRAVEL_PER_CLIP = 4 * Math.PI;
const MINIMUM_LINEAR_TIME_SHARE = 0.1;
const GROUND_MOVEMENT_TYPES = new Set([
  "linear",
  "circular",
  "spiral",
  "figureEight",
  "wave",
  "zigzag",
  "static",
]);
const VELOCITY_ORIENTED_MOVEMENT_TYPES = new Set([
  "linear",
  "circular",
  "spiral",
  "figureEight",
  "wave",
  "zigzag",
]);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Create a monotonic, endpoint-preserving speed profile.  The smoothstep mix
 * gives natural starts/stops and the (bounded) quadratic term permits gentle
 * acceleration or deceleration without ever playing the path backwards.
 */
function warpProgress(
  progress: number,
  timing?: RandomizationSettings["timing"]
): number {
  if (!timing) return progress;

  const smoothness = clamp(timing.smoothness, 0, 0.8);
  const smoothstep = progress * progress * (3 - 2 * progress);
  const smoothed = progress + (smoothstep - progress) * smoothness;
  const maximumBias = Math.max(0, (1 - smoothness) * 0.75);
  const accelerationBias = clamp(
    timing.accelerationBias,
    -maximumBias,
    maximumBias
  );

  return clamp(
    smoothed + accelerationBias * progress * (1 - progress),
    0,
    1
  );
}

function resampleFrames(
  frames: SubjectFrame[],
  frameCount: number,
  timing?: RandomizationSettings["timing"],
  smoothPositions = false
): SubjectFrame[] {
  if (frames.length === 0 || frameCount <= 0) {
    return [];
  }

  if (frameCount === 1) {
    return [
      {
        position: frames[0].position.clone(),
        rotation: frames[0].rotation.clone(),
      },
    ];
  }

  return Array.from({ length: frameCount }, (_, index) => {
    const progress = warpProgress(index / (frameCount - 1), timing);
    const sourcePosition = progress * Math.max(0, frames.length - 1);
    const lowerIndex = Math.floor(sourcePosition);
    const upperIndex = Math.min(lowerIndex + 1, frames.length - 1);
    const interpolation = sourcePosition - lowerIndex;
    const lowerFrame = frames[lowerIndex];
    const upperFrame = frames[upperIndex];

    const lowerRotation = new THREE.Quaternion().setFromEuler(
      lowerFrame.rotation
    );
    const upperRotation = new THREE.Quaternion().setFromEuler(
      upperFrame.rotation
    );

    let position = lowerFrame.position
      .clone()
      .lerp(upperFrame.position, interpolation);
    if (smoothPositions && lowerIndex !== upperIndex) {
      // Cubic Hermite interpolation follows the authored control points while
      // sharing a tangent across each boundary. Linear interpolation changes
      // velocity instantaneously at every one of the 30 source frames.
      const previousPosition = frames[Math.max(0, lowerIndex - 1)].position;
      const nextPosition =
        frames[Math.min(frames.length - 1, upperIndex + 1)].position;
      const startTangent = upperFrame.position
        .clone()
        .sub(previousPosition)
        .multiplyScalar(lowerIndex === 0 ? 1 : 0.5);
      const endTangent = nextPosition
        .clone()
        .sub(lowerFrame.position)
        .multiplyScalar(upperIndex === frames.length - 1 ? 1 : 0.5);
      const t = interpolation;
      const t2 = t * t;
      const t3 = t2 * t;
      position = lowerFrame.position
        .clone()
        .multiplyScalar(2 * t3 - 3 * t2 + 1)
        .addScaledVector(startTangent, t3 - 2 * t2 + t)
        .addScaledVector(upperFrame.position, -2 * t3 + 3 * t2)
        .addScaledVector(endTangent, t3 - t2);
    }

    return {
      position,
      rotation: new THREE.Euler().setFromQuaternion(
        lowerRotation.slerp(upperRotation, interpolation),
        lowerFrame.rotation.order
      ),
    };
  });
}

function cloneFrames(frames: SubjectFrame[]): SubjectFrame[] {
  return frames.map((frame) => ({
    position: frame.position.clone(),
    rotation: frame.rotation.clone(),
  }));
}

function subjectFootprintRadius(subject: Subject): number {
  // A circle around the oriented footprint is conservative for every yaw, so
  // collision checks remain valid while an object turns.
  return (
    Math.hypot(subject.dimensions.width, subject.dimensions.depth) / 2 +
    COLLISION_MARGIN
  );
}

function verticallyOverlaps(
  first: SubjectFrame,
  firstSubject: Subject,
  second: SubjectFrame,
  secondSubject: Subject
): boolean {
  const halfHeight =
    (firstSubject.dimensions.height + secondSubject.dimensions.height) / 2;
  return Math.abs(first.position.y - second.position.y) < halfHeight;
}

type PathCollision = {
  otherSubjectIndex: number;
  frameIndex: number;
  overlap: number;
  direction: THREE.Vector2;
};

function verticalOverlapInterval(
  firstStart: SubjectFrame,
  firstEnd: SubjectFrame,
  firstSubject: Subject,
  secondStart: SubjectFrame,
  secondEnd: SubjectFrame,
  secondSubject: Subject
): [number, number] | undefined {
  const halfHeight =
    (firstSubject.dimensions.height + secondSubject.dimensions.height) / 2;
  const startDelta = firstStart.position.y - secondStart.position.y;
  const endDelta = firstEnd.position.y - secondEnd.position.y;
  const deltaVelocity = endDelta - startDelta;

  if (Math.abs(deltaVelocity) <= POSITION_EPSILON) {
    return Math.abs(startDelta) < halfHeight ? [0, 1] : undefined;
  }

  const firstBoundary = (-halfHeight - startDelta) / deltaVelocity;
  const secondBoundary = (halfHeight - startDelta) / deltaVelocity;
  const start = Math.max(0, Math.min(firstBoundary, secondBoundary));
  const end = Math.min(1, Math.max(firstBoundary, secondBoundary));
  return start <= end ? [start, end] : undefined;
}

function getSweptCollision(
  movingStart: SubjectFrame,
  movingEnd: SubjectFrame,
  movingSubject: Subject,
  otherStart: SubjectFrame,
  otherEnd: SubjectFrame,
  otherSubject: Subject,
  minimumDistance: number,
  fallbackAngle: number
): Pick<PathCollision, "overlap" | "direction"> | undefined {
  const overlapInterval = verticalOverlapInterval(
    movingStart,
    movingEnd,
    movingSubject,
    otherStart,
    otherEnd,
    otherSubject
  );
  if (!overlapInterval) return undefined;

  const startDelta = new THREE.Vector2(
    movingStart.position.x - otherStart.position.x,
    movingStart.position.z - otherStart.position.z
  );
  const endDelta = new THREE.Vector2(
    movingEnd.position.x - otherEnd.position.x,
    movingEnd.position.z - otherEnd.position.z
  );
  const relativeVelocity = endDelta.clone().sub(startDelta);
  const velocityLengthSquared = relativeVelocity.lengthSq();
  const closestTime =
    velocityLengthSquared <= POSITION_EPSILON
      ? overlapInterval[0]
      : clamp(
          -startDelta.dot(relativeVelocity) / velocityLengthSquared,
          overlapInterval[0],
          overlapInterval[1]
        );
  const closestDelta = startDelta.addScaledVector(
    relativeVelocity,
    closestTime
  );
  const distance = closestDelta.length();
  const overlap = minimumDistance - distance;
  if (overlap <= 0) return undefined;

  return {
    overlap,
    direction: new THREE.Vector2(
      distance > POSITION_EPSILON
        ? closestDelta.x / distance
        : Math.cos(fallbackAngle),
      distance > POSITION_EPSILON
        ? closestDelta.y / distance
        : Math.sin(fallbackAngle)
    ),
  };
}

function findWorstPathCollision(
  paths: SubjectFrame[][],
  subjects: Subject[],
  movingSubjectIndex: number
): PathCollision | undefined {
  const movingRadius = subjectFootprintRadius(subjects[movingSubjectIndex]);
  let worst: PathCollision | undefined;

  for (
    let otherSubjectIndex = 0;
    otherSubjectIndex < movingSubjectIndex;
    otherSubjectIndex++
  ) {
    const minimumDistance =
      movingRadius + subjectFootprintRadius(subjects[otherSubjectIndex]);
    const commonFrameCount = Math.min(
      paths[movingSubjectIndex].length,
      paths[otherSubjectIndex].length
    );

    const fallbackAngle =
      ((otherSubjectIndex + 1) * 2.399963229728653 +
        (movingSubjectIndex + 1) * 0.618033988749895) %
      (Math.PI * 2);

    for (let frameIndex = 0; frameIndex < commonFrameCount; frameIndex++) {
      const movingFrame = paths[movingSubjectIndex][frameIndex];
      const otherFrame = paths[otherSubjectIndex][frameIndex];
      if (
        !verticallyOverlaps(
          movingFrame,
          subjects[movingSubjectIndex],
          otherFrame,
          subjects[otherSubjectIndex]
        )
      ) {
        continue;
      }

      const deltaX = movingFrame.position.x - otherFrame.position.x;
      const deltaZ = movingFrame.position.z - otherFrame.position.z;
      const distance = Math.hypot(deltaX, deltaZ);
      const overlap = minimumDistance - distance;
      if (overlap <= 0 || (worst && overlap <= worst.overlap)) continue;

      worst = {
        otherSubjectIndex,
        frameIndex,
        overlap,
        direction: new THREE.Vector2(
          distance > POSITION_EPSILON
            ? deltaX / distance
            : Math.cos(fallbackAngle),
          distance > POSITION_EPSILON
            ? deltaZ / distance
            : Math.sin(fallbackAngle)
        ),
      };
    }

    // Checking only exported frame instants can miss two fast paths crossing
    // between adjacent frames.  Treat each interval as a pair of swept
    // footprint circles and minimize their relative distance continuously.
    for (let frameIndex = 0; frameIndex + 1 < commonFrameCount; frameIndex++) {
      const sweptCollision = getSweptCollision(
        paths[movingSubjectIndex][frameIndex],
        paths[movingSubjectIndex][frameIndex + 1],
        subjects[movingSubjectIndex],
        paths[otherSubjectIndex][frameIndex],
        paths[otherSubjectIndex][frameIndex + 1],
        subjects[otherSubjectIndex],
        minimumDistance,
        fallbackAngle
      );
      if (
        !sweptCollision ||
        (worst && sweptCollision.overlap <= worst.overlap)
      ) {
        continue;
      }
      worst = {
        otherSubjectIndex,
        frameIndex,
        ...sweptCollision,
      };
    }
  }

  return worst;
}

function translateWholePath(
  frames: SubjectFrame[],
  direction: THREE.Vector2,
  distance: number
): void {
  frames.forEach((frame) => {
    frame.position.x += direction.x * distance;
    frame.position.z += direction.y * distance;
  });
}

function movePathBeyondPriorBounds(
  paths: SubjectFrame[][],
  subjects: Subject[],
  movingSubjectIndex: number
): void {
  let maximumPriorX = Number.NEGATIVE_INFINITY;
  for (let subjectIndex = 0; subjectIndex < movingSubjectIndex; subjectIndex++) {
    const radius = subjectFootprintRadius(subjects[subjectIndex]);
    paths[subjectIndex].forEach((frame) => {
      maximumPriorX = Math.max(maximumPriorX, frame.position.x + radius);
    });
  }

  const movingRadius = subjectFootprintRadius(subjects[movingSubjectIndex]);
  const minimumMovingX = paths[movingSubjectIndex].reduce(
    (minimum, frame) => Math.min(minimum, frame.position.x - movingRadius),
    Number.POSITIVE_INFINITY
  );
  const distance = maximumPriorX - minimumMovingX + COLLISION_MARGIN;
  if (Number.isFinite(distance) && distance > 0) {
    translateWholePath(
      paths[movingSubjectIndex],
      new THREE.Vector2(1, 0),
      distance
    );
  }
}

function orientAlongVelocity(frames: SubjectFrame[]): void {
  const yawAt = (frameIndex: number): number | undefined => {
    const previousFrame = frames[Math.max(0, frameIndex - 1)];
    const nextFrame = frames[Math.min(frames.length - 1, frameIndex + 1)];
    const deltaX = nextFrame.position.x - previousFrame.position.x;
    const deltaZ = nextFrame.position.z - previousFrame.position.z;
    return deltaX * deltaX + deltaZ * deltaZ > POSITION_EPSILON ** 2
      ? Math.atan2(-deltaX, -deltaZ)
      : undefined;
  };
  // A stopped/slow start must inherit the first travel heading, rather than
  // retaining an unrelated authored rotation until a displacement threshold
  // is crossed (which previously produced near-180-degree first-frame turns).
  let initialYaw: number | undefined;
  for (let index = 0; index < frames.length && initialYaw === undefined; index++) {
    initialYaw = yawAt(index);
  }
  if (initialYaw === undefined) return;
  let previousYaw = initialYaw;

  frames.forEach((frame, frameIndex) => {
    // SubjectView defines the subject's front as local -Z. Rotate that axis
    // onto the direction of travel (using +Z here would make cars/bicycles
    // drive backwards while their trajectory itself looked valid).
    let yaw = yawAt(frameIndex) ?? previousYaw;
    while (yaw - previousYaw > Math.PI) yaw -= Math.PI * 2;
    while (yaw - previousYaw < -Math.PI) yaw += Math.PI * 2;

    // Ground-object motion has yaw only. Quaternion resampling across a ±π
    // yaw wrap may produce the equivalent Euler representation (π, y, π);
    // retaining those x/z values would turn the local -Z front backwards even
    // after assigning the correct heading.
    frame.rotation.set(0, yaw, 0, frame.rotation.order);
    previousYaw = yaw;
  });
}

/**
 * Give tight corners more clip time while retaining the path and its travel
 * heading. Capping yaw alone makes vehicles slide sideways through turns.
 * A 4π/clip rate is at most 24.83 degrees per 30-frame interval. Paths with
 * more total turning necessarily need a larger budget; reserve 10% of time
 * for forward progress so straight sections cannot become instantaneous.
 */
function sampleTurnAwareFrames(
  frames: SubjectFrame[],
  frameCount: number
): SubjectFrame[] {
  if (frames.length < 2 || frameCount <= 1) {
    return resampleFrames(frames, frameCount);
  }
  const cumulativeTurning = [0];
  for (let index = 1; index < frames.length; index++) {
    cumulativeTurning.push(
      cumulativeTurning[index - 1] +
        Math.abs(frames[index].rotation.y - frames[index - 1].rotation.y)
    );
  }
  const totalTurning = cumulativeTurning[frames.length - 1];
  const yawRate = Math.max(
    TARGET_YAW_TRAVEL_PER_CLIP,
    totalTurning / (1 - MINIMUM_LINEAR_TIME_SHARE)
  );
  const linearTimeShare = 1 - totalTurning / yawRate;
  const times = cumulativeTurning.map(
    (turning, index) =>
      turning / yawRate + (linearTimeShare * index) / (frames.length - 1)
  );
  let upperIndex = 1;
  return Array.from({ length: frameCount }, (_, index) => {
    const time = index / (frameCount - 1);
    while (upperIndex < frames.length - 1 && times[upperIndex] < time) {
      upperIndex++;
    }
    const lowerIndex = upperIndex - 1;
    const interpolation = clamp(
      (time - times[lowerIndex]) / (times[upperIndex] - times[lowerIndex]),
      0,
      1
    );
    const lower = frames[lowerIndex];
    const upper = frames[upperIndex];
    return {
      position: lower.position.clone().lerp(upper.position, interpolation),
      rotation: new THREE.Euler(
        0,
        lower.rotation.y + (upper.rotation.y - lower.rotation.y) * interpolation,
        0,
        lower.rotation.order
      ),
    };
  });
}

/**
 * Separates subject volumes over the complete clip by translating each whole
 * path.  A constant path translation preserves velocity and acceleration, so
 * avoiding another subject can never introduce a one-frame teleport.
 */
export function ensureCollisionFreeSubjectFrames(
  inputPaths: SubjectFrame[][],
  subjects: Subject[],
  _movements: Record<string, string>
): SubjectFrame[][] {
  if (inputPaths.length !== subjects.length) {
    throw new Error("Every subject must have exactly one generated frame path");
  }

  const separated = inputPaths.map(cloneFrames);
  if (subjects.length < 2) return separated;

  for (
    let movingSubjectIndex = 1;
    movingSubjectIndex < subjects.length;
    movingSubjectIndex++
  ) {
    const maxAttempts = Math.max(100, movingSubjectIndex * 100);
    let attempt = 0;
    let collision = findWorstPathCollision(
      separated,
      subjects,
      movingSubjectIndex
    );

    while (collision && attempt < maxAttempts) {
      translateWholePath(
        separated[movingSubjectIndex],
        collision.direction,
        collision.overlap + COLLISION_MARGIN / 10
      );
      collision = findWorstPathCollision(
        separated,
        subjects,
        movingSubjectIndex
      );
      attempt++;
    }

    // Dense or adversarial path layouts can make iterative packing oscillate.
    // The conservative fallback is deterministic and mathematically separates
    // the complete swept footprints along X.
    if (collision) {
      movePathBeyondPriorBounds(separated, subjects, movingSubjectIndex);
    }
  }

  return separated;
}

export function generateFrames(
  subjects: Subject[],
  movements: Record<string, string>,
  settings?: {
    applyNoise?: boolean;
    positionAmplitude?: number;
    rotationAmplitude?: number;
    frequency?: number;
    randomize?: boolean;
    randomSettings?: Partial<RandomizationSettings>;
    frameCount?: number;
  }
): SubjectFrame[][] {
  const {
    applyNoise = false,
    randomize = true,
    randomSettings = {},
    frameCount,
    ...noiseParams
  } = settings || {};

  const paths = subjects.map((subject, index) => {
    const movementType = movements[subject.id] || "circular";
    const generator = movementGenerators[movementType] || generateStaticMotion;

    const subjectRandomSettings = randomize
      ? generateRandomSettings(randomSettings)
      : undefined;

    const generatedFrames = generator(
      subject,
      index,
      subjects.length,
      subjectRandomSettings
    );
    const isVelocityOriented = VELOCITY_ORIENTED_MOVEMENT_TYPES.has(movementType);
    const outputFrameCount = frameCount ?? generatedFrames.length;
    const baseFrames = resampleFrames(
      generatedFrames,
      isVelocityOriented ? HEADING_REFERENCE_FRAME_COUNT : outputFrameCount,
      subjectRandomSettings?.timing,
      isVelocityOriented
    );

    const isGroundedMovement = GROUND_MOVEMENT_TYPES.has(movementType);
    // A labelled static path must remain bit-for-bit static.  Ground motion
    // may meander in X/Z but cannot make a car, bicycle, or prop float.
    // Position noise must precede heading recovery so ground subjects steer
    // along the path that is actually exported. Rotation noise is applied in
    // a second pass after orientAlongVelocity below; otherwise the recovered
    // heading silently overwrites rotationAmplitude.
    const positionNoisyFrames = applyNoise && movementType !== "static"
      ? addMovementNoise(baseFrames, {
          ...noiseParams,
          rotationAmplitude: 0,
          grounded: isGroundedMovement,
        })
      : baseFrames;
    const minimumY = subject.dimensions.height / 2;

    let frames = positionNoisyFrames.map((frame) => ({
      position: new THREE.Vector3(
        frame.position.x,
        isGroundedMovement
          ? minimumY
          : Math.max(minimumY, frame.position.y),
        frame.position.z
      ),
      rotation: frame.rotation.clone(),
    }));
    // Ground paths represent vehicles/ bicycles and face along their travel
    // direction.  Specialized paths already author their own orientation:
    // e.g. a pendulum remains smoothly oriented through a turnaround and a
    // bounce carries pitch. Replacing those rotations with instantaneous
    // velocity yaw caused a π flip whenever velocity crossed zero.
    if (isVelocityOriented) {
      orientAlongVelocity(frames);
    }
    if (applyNoise && movementType !== "static") {
      frames = addMovementNoise(frames, {
        positionAmplitude: 0,
        rotationAmplitude: noiseParams.rotationAmplitude,
        frequency: noiseParams.frequency,
        grounded: isGroundedMovement,
      });
    }
    return isVelocityOriented
      ? sampleTurnAwareFrames(frames, outputFrameCount)
      : frames;
  });
  return ensureCollisionFreeSubjectFrames(paths, subjects, movements);
}
