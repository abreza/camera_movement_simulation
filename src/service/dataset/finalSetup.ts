import * as THREE from "three";
import {
  CameraParameters,
  CameraVerticalAngle,
  CinematographyPrompt,
  CinematographySetup,
  DynamicMode,
  SetupConfig,
  ShotSize,
  SimulationInstruction,
  SubjectInFramePosition,
  SubjectView,
} from "@/service/simulation/instruction/types";
import {
  getDesiredHorizontalAngle,
  getDesiredVerticalAngle,
} from "@/service/simulation/instruction/helpers/static";
import { calculateRegionOfInterest } from "@/service/simulation/rule-based/setup/roi";
import {
  ProjectedBounds,
  projectBoundingBox,
} from "@/service/simulation/utils";
import { Subject, SubjectFrame } from "@/service/subjects/types";

const EPSILON = 1e-8;
const THIRD_CENTER = 2 / 3;

const CAMERA_ANGLES = Object.values(CameraVerticalAngle);
const SUBJECT_VIEWS = Object.values(SubjectView);
const SHOT_SIZES = Object.values(ShotSize);
const FRAME_POSITIONS = Object.values(SubjectInFramePosition);

// These are the target NDC occupancies used by calculateRegionOfInterest.
// Keeping the inverse classifier next to the dataset contract makes it clear
// that this is label recovery, rather than another camera-placement routine.
const SHOT_TARGET_SCALE: Record<ShotSize, number> = {
  [ShotSize.ExtremeCloseUp]: 2,
  [ShotSize.CloseUp]: 1,
  [ShotSize.MediumCloseUp]: 1,
  [ShotSize.MediumShot]: 1,
  [ShotSize.FullShot]: 1,
  [ShotSize.LongShot]: 0.75,
  [ShotSize.VeryLongShot]: 0.5,
  [ShotSize.ExtremeLongShot]: 0.3,
};

function circularDistance(first: number, second: number): number {
  return Math.abs(
    THREE.MathUtils.euclideanModulo(first - second + Math.PI, Math.PI * 2) -
      Math.PI
  );
}

function nearestValue<T>(
  values: readonly T[],
  score: (value: T) => number
): T {
  if (values.length === 0) {
    throw new Error("Cannot classify a setup against an empty value set.");
  }

  let bestValue = values[0];
  let bestScore = score(bestValue);
  for (let index = 1; index < values.length; index++) {
    const candidate = values[index];
    const candidateScore = score(candidate);
    if (candidateScore < bestScore) {
      bestValue = candidate;
      bestScore = candidateScore;
    }
  }
  return bestValue;
}

function isUsableProjection(bounds: ProjectedBounds): boolean {
  return (
    bounds.allInFront &&
    Number.isFinite(bounds.width) &&
    Number.isFinite(bounds.height) &&
    Number.isFinite(bounds.center.x) &&
    Number.isFinite(bounds.center.y) &&
    bounds.width > EPSILON &&
    bounds.height > EPSILON
  );
}

function getFramingTarget(
  bounds: ProjectedBounds,
  position: SubjectInFramePosition
): THREE.Vector2 {
  const targets: Record<SubjectInFramePosition, THREE.Vector2> = {
    [SubjectInFramePosition.Center]: new THREE.Vector2(0, 0),
    [SubjectInFramePosition.Left]: new THREE.Vector2(-THIRD_CENTER, 0),
    [SubjectInFramePosition.Right]: new THREE.Vector2(THIRD_CENTER, 0),
    [SubjectInFramePosition.Top]: new THREE.Vector2(0, THIRD_CENTER),
    [SubjectInFramePosition.Bottom]: new THREE.Vector2(0, -THIRD_CENTER),
    [SubjectInFramePosition.TopLeft]: new THREE.Vector2(
      -THIRD_CENTER,
      THIRD_CENTER
    ),
    [SubjectInFramePosition.TopRight]: new THREE.Vector2(
      THIRD_CENTER,
      THIRD_CENTER
    ),
    [SubjectInFramePosition.BottomLeft]: new THREE.Vector2(
      -THIRD_CENTER,
      -THIRD_CENTER
    ),
    [SubjectInFramePosition.BottomRight]: new THREE.Vector2(
      THIRD_CENTER,
      -THIRD_CENTER
    ),
    [SubjectInFramePosition.OuterLeft]: new THREE.Vector2(
      -1 - bounds.width / 4,
      0
    ),
    [SubjectInFramePosition.OuterRight]: new THREE.Vector2(
      1 + bounds.width / 4,
      0
    ),
    [SubjectInFramePosition.OuterTop]: new THREE.Vector2(
      0,
      1 + bounds.height / 4
    ),
    [SubjectInFramePosition.OuterBottom]: new THREE.Vector2(
      0,
      -1 - bounds.height / 4
    ),
  };
  return targets[position];
}

/**
 * Recovers the closest vocabulary setup from an already generated camera and
 * subject pose. The final label is therefore observational: it cannot ask the
 * model to reach a random endpoint that the exported trajectory never visits.
 */
export function deriveCinematographySetupFromPose(
  camera: CameraParameters,
  subject: Subject,
  subjectFrame: SubjectFrame
): CinematographySetup {
  const relativeCameraPosition = camera.position
    .clone()
    .sub(subjectFrame.position)
    .applyQuaternion(
      new THREE.Quaternion().setFromEuler(subjectFrame.rotation).invert()
    );
  const distance = relativeCameraPosition.length();
  if (!Number.isFinite(distance) || distance <= EPSILON) {
    throw new Error(
      "Cannot derive a cinematography setup when camera and subject coincide."
    );
  }

  const verticalAngle = Math.acos(
    THREE.MathUtils.clamp(relativeCameraPosition.y / distance, -1, 1)
  );
  const horizontalAngle = Math.atan2(
    relativeCameraPosition.x,
    -relativeCameraPosition.z
  );
  const cameraAngle = nearestValue(CAMERA_ANGLES, (candidate) =>
    Math.abs(verticalAngle - getDesiredVerticalAngle(candidate))
  );
  const subjectView = nearestValue(SUBJECT_VIEWS, (candidate) =>
    circularDistance(horizontalAngle, getDesiredHorizontalAngle(candidate))
  );

  const shotCandidates = SHOT_SIZES.map((shotSize) => {
    const { regionOfInterest } = calculateRegionOfInterest(
      shotSize,
      subject,
      subjectFrame
    );
    const bounds = projectBoundingBox(
      regionOfInterest.dimensions,
      regionOfInterest.position,
      camera,
      regionOfInterest.rotation
    );
    if (!isUsableProjection(bounds)) {
      return { shotSize, bounds, score: Number.POSITIVE_INFINITY };
    }
    const occupancy = Math.max(bounds.width, bounds.height);
    return {
      shotSize,
      bounds,
      score: Math.abs(Math.log(occupancy / SHOT_TARGET_SCALE[shotSize])),
    };
  });
  const selectedShot = nearestValue(shotCandidates, ({ score }) => score);
  if (!Number.isFinite(selectedShot.score)) {
    throw new Error(
      "Cannot derive a final setup because the subject is behind the camera."
    );
  }

  const subjectFraming = nearestValue(FRAME_POSITIONS, (position) =>
    selectedShot.bounds.center.distanceToSquared(
      getFramingTarget(selectedShot.bounds, position)
    )
  );

  return {
    cameraAngle,
    shotSize: selectedShot.shotSize,
    subjectView,
    subjectFraming,
  };
}

/**
 * Emits only endpoint fields whose observed categories changed over the clip.
 * Unchanged fields add no conditioning signal and are intentionally omitted.
 */
export function deriveMeaningfulFinalSetup(
  cameraFrames: readonly CameraParameters[],
  subject: Subject,
  subjectFrames: readonly SubjectFrame[]
): CinematographyPrompt["final"] {
  if (
    cameraFrames.length === 0 ||
    subjectFrames.length === 0 ||
    cameraFrames.length !== subjectFrames.length
  ) {
    throw new Error(
      `Cannot derive final setup from ${cameraFrames.length} camera frames and ${subjectFrames.length} subject frames.`
    );
  }

  const finalIndex = cameraFrames.length - 1;
  const observedInitial = deriveCinematographySetupFromPose(
    cameraFrames[0],
    subject,
    subjectFrames[0]
  );
  const observedFinal = deriveCinematographySetupFromPose(
    cameraFrames[finalIndex],
    subject,
    subjectFrames[finalIndex]
  );
  return deriveMeaningfulFinalSetupFromSetups(
    observedInitial,
    observedFinal
  );
}

export function deriveMeaningfulFinalSetupFromSetups(
  observedInitial: CinematographySetup,
  observedFinal: CinematographySetup
): CinematographyPrompt["final"] {
  const final: Partial<CinematographySetup> = {};
  (Object.keys(observedFinal) as (keyof CinematographySetup)[]).forEach(
    (field) => {
      if (observedFinal[field] !== observedInitial[field]) {
        (final as Record<string, string>)[field] = observedFinal[field];
      }
    }
  );
  return Object.keys(final).length > 0 ? final : undefined;
}

export function createTrajectoryPrompt(
  requestedPrompt: CinematographyPrompt,
  observedInitial: CinematographySetup,
  observedFinal: CinematographySetup
): CinematographyPrompt {
  const {
    initial: _requestedInitial,
    final: _requestedFinal,
    ...movementPrompt
  } = requestedPrompt;
  const final = deriveMeaningfulFinalSetupFromSetups(
    observedInitial,
    observedFinal
  );
  return {
    ...movementPrompt,
    initial: observedInitial,
    ...(final ? { final } : {}),
  };
}

function replaceCategoricalSetup(
  setup: SetupConfig,
  observed: CinematographySetup
): SetupConfig {
  return {
    ...setup,
    cameraAngle: observed.cameraAngle,
    shotSize: observed.shotSize,
    subjectView: observed.subjectView,
    subjectFraming: {
      ...setup.subjectFraming,
      position: observed.subjectFraming,
    },
  };
}

/**
 * Re-labels only categorical setup tokens on the serialized instruction.
 * Motion, easing, constraints and numeric limits remain the exact instruction
 * used to generate the path. The input instruction itself is never mutated.
 */
export function alignInstructionSetupsWithTrajectory(
  instruction: SimulationInstruction,
  observedInitial: CinematographySetup,
  observedFinal: CinematographySetup
): SimulationInstruction {
  const setupObservation =
    instruction.setup.kind === "init" ? observedInitial : observedFinal;
  const complementObservation =
    instruction.setup.kind === "init" ? observedFinal : observedInitial;
  const alignedBase = {
    ...instruction,
    setup: {
      ...instruction.setup,
      config: replaceCategoricalSetup(
        instruction.setup.config,
        setupObservation
      ),
    },
  };

  if (instruction.dynamic.type !== DynamicMode.Interpolation) {
    return {
      ...alignedBase,
      dynamic: { ...instruction.dynamic },
    };
  }

  return {
    ...alignedBase,
    dynamic: {
      ...instruction.dynamic,
      complementSetup: replaceCategoricalSetup(
        instruction.dynamic.complementSetup,
        complementObservation
      ),
    },
  };
}
