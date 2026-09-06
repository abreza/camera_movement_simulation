import {
  CameraMovementType,
  CameraVerticalAngle,
  CinematographyPrompt,
  MovementSpeed,
  ShotSize,
  SetupConfig,
  SubjectInFramePosition,
  SubjectView,
} from "@/service/simulation/instruction/types";

export const FINAL_SETUP_FIELDS: (keyof SetupConfig)[] = [
  "cameraAngle",
  "shotSize",
  "subjectView",
  "subjectFraming",
];

function hasMeaningfulSetup(
  setup: CinematographyPrompt["initial"]
): boolean {
  return FINAL_SETUP_FIELDS.some((field) => {
    const value: unknown = setup?.[field];
    return value !== undefined && value !== null && value !== "";
  });
}

type HighLevelInstructionRule = {
  simpleMovement?: boolean;
  disabledFinalSetup?: (keyof SetupConfig)[];
};

const SIMPLE_MOVEMENT_RULE: HighLevelInstructionRule = {
  simpleMovement: true,
  disabledFinalSetup: FINAL_SETUP_FIELDS,
};

const FULL_VISIBILITY_MOVEMENTS = new Set<CameraMovementType>([
  CameraMovementType.Follow,
  CameraMovementType.Track,
  CameraMovementType.ArcLeft,
  CameraMovementType.ArcRight,
]);

const CROPPED_SHOT_SIZES = new Set<ShotSize>([
  ShotSize.ExtremeCloseUp,
  ShotSize.CloseUp,
  ShotSize.MediumCloseUp,
  ShotSize.MediumShot,
]);

const VISIBLE_FRAMING: Partial<
  Record<SubjectInFramePosition, SubjectInFramePosition>
> = {
  [SubjectInFramePosition.OuterLeft]: SubjectInFramePosition.Left,
  [SubjectInFramePosition.OuterRight]: SubjectInFramePosition.Right,
  [SubjectInFramePosition.OuterTop]: SubjectInFramePosition.Top,
  [SubjectInFramePosition.OuterBottom]: SubjectInFramePosition.Bottom,
};

function getTrackingSide(view?: SubjectView): SubjectView {
  switch (view) {
    case SubjectView.Right:
    case SubjectView.ThreeQuarterFrontRight:
    case SubjectView.ThreeQuarterBackRight:
    case SubjectView.Back:
      return SubjectView.Right;
    case SubjectView.Left:
    case SubjectView.ThreeQuarterFrontLeft:
    case SubjectView.ThreeQuarterBackLeft:
    case SubjectView.Front:
    default:
      return SubjectView.Left;
  }
}

export const highLevelInstructionRules: Record<
  CameraMovementType,
  HighLevelInstructionRule
> = {
  static: {
    disabledFinalSetup: FINAL_SETUP_FIELDS,
  },
  follow: {
    // Follow is a single subject-relative camera relation.  A random final
    // setup used to turn it into a compound interpolation instead.
    disabledFinalSetup: FINAL_SETUP_FIELDS,
  },
  track: {
    // Tracking maintains a fixed subject distance, so a final shot size would
    // directly contradict its static-distance constraint.
    disabledFinalSetup: FINAL_SETUP_FIELDS,
  },
  panLeft: SIMPLE_MOVEMENT_RULE,
  panRight: SIMPLE_MOVEMENT_RULE,
  tiltUp: SIMPLE_MOVEMENT_RULE,
  tiltDown: SIMPLE_MOVEMENT_RULE,
  // These are generated as explicit camera-local translations.  A second
  // endpoint setup would be a competing instruction (and used to turn a
  // dolly/crane into an arbitrary interpolation).
  dollyIn: SIMPLE_MOVEMENT_RULE,
  dollyOut: SIMPLE_MOVEMENT_RULE,
  truckLeft: SIMPLE_MOVEMENT_RULE,
  truckRight: SIMPLE_MOVEMENT_RULE,
  pedestalUp: SIMPLE_MOVEMENT_RULE,
  pedestalDown: SIMPLE_MOVEMENT_RULE,
  arcLeft: SIMPLE_MOVEMENT_RULE,
  arcRight: SIMPLE_MOVEMENT_RULE,
  craneUp: SIMPLE_MOVEMENT_RULE,
  craneDown: SIMPLE_MOVEMENT_RULE,
  dutchLeft: SIMPLE_MOVEMENT_RULE,
  dutchRight: SIMPLE_MOVEMENT_RULE,
};

export function normalizeCinematographyPrompt(
  prompt: CinematographyPrompt
): CinematographyPrompt {
  const hasMeaningfulInitialSetup = hasMeaningfulSetup(prompt.initial);
  const { initial: _initial, ...promptWithoutInitial } = prompt;
  let promptWithNormalizedInitial: CinematographyPrompt =
    prompt.initial && !hasMeaningfulInitialSetup
      ? promptWithoutInitial
      : prompt;

  if (promptWithNormalizedInitial.movement.type === CameraMovementType.Static) {
    // A locked camera has zero velocity throughout the clip. Speed variation
    // cannot be observed, so keep one canonical label/easing for generation
    // and manually entered prompts alike.
    promptWithNormalizedInitial = {
      ...promptWithNormalizedInitial,
      movement: {
        ...promptWithNormalizedInitial.movement,
        speed: MovementSpeed.Constant,
      },
    };
  }

  if (promptWithNormalizedInitial.initial) {
    const movementType = promptWithNormalizedInitial.movement.type;
    if (
      movementType === CameraMovementType.Follow ||
      movementType === CameraMovementType.Track
    ) {
      const initial = promptWithNormalizedInitial.initial;
      promptWithNormalizedInitial = {
        ...promptWithNormalizedInitial,
        initial: {
          ...initial,
          // In this dataset a Follow is a rear chase, while a Track is a
          // parallel side-on move.  Without this canonical distinction both
          // labels generated the same subject-relative trajectory.
          subjectView:
            movementType === CameraMovementType.Follow
              ? SubjectView.Back
              : getTrackingSide(initial.subjectView),
          cameraAngle: CameraVerticalAngle.Eye,
        },
      };
    }
  }

  if (
    promptWithNormalizedInitial.initial &&
    FULL_VISIBILITY_MOVEMENTS.has(promptWithNormalizedInitial.movement.type)
  ) {
    const initial = promptWithNormalizedInitial.initial;
    promptWithNormalizedInitial = {
      ...promptWithNormalizedInitial,
      initial: {
        ...initial,
        ...(initial.shotSize && CROPPED_SHOT_SIZES.has(initial.shotSize)
          ? { shotSize: ShotSize.FullShot }
          : {}),
        ...(initial.subjectFraming && VISIBLE_FRAMING[initial.subjectFraming]
          ? { subjectFraming: VISIBLE_FRAMING[initial.subjectFraming] }
          : {}),
      },
    };
  }

  const normalizedMovementType = promptWithNormalizedInitial.movement.type;
  const normalizedInitialAngle =
    promptWithNormalizedInitial.initial?.cameraAngle;
  const craneUpNeedsHeadroom =
    normalizedMovementType === CameraMovementType.CraneUp &&
    (normalizedInitialAngle === CameraVerticalAngle.Overhead ||
      normalizedInitialAngle === CameraVerticalAngle.BirdsEye);
  const downMoveNeedsHeadroom =
    (normalizedMovementType === CameraMovementType.CraneDown ||
      normalizedMovementType === CameraMovementType.PedestalDown) &&
    (normalizedInitialAngle === CameraVerticalAngle.Low ||
      normalizedInitialAngle === CameraVerticalAngle.Eye);

  if (
    promptWithNormalizedInitial.initial &&
    (craneUpNeedsHeadroom || downMoveNeedsHeadroom)
  ) {
    promptWithNormalizedInitial = {
      ...promptWithNormalizedInitial,
      initial: {
        ...promptWithNormalizedInitial.initial,
        cameraAngle: CameraVerticalAngle.High,
      },
    };
  }

  if (!promptWithNormalizedInitial.final) {
    return promptWithNormalizedInitial;
  }

  const rule =
    highLevelInstructionRules[promptWithNormalizedInitial.movement.type];
  const disabledFields = new Set(
    hasMeaningfulInitialSetup ? rule.disabledFinalSetup ?? [] : []
  );
  const normalizedFinal: Record<string, unknown> = {};

  FINAL_SETUP_FIELDS.forEach((field) => {
    const value: unknown = promptWithNormalizedInitial.final?.[field];
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      !disabledFields.has(field)
    ) {
      normalizedFinal[field] = value;
    }
  });

  const { final: _final, ...promptWithoutFinal } =
    promptWithNormalizedInitial;

  if (Object.keys(normalizedFinal).length === 0) {
    return promptWithoutFinal;
  }

  return {
    ...promptWithoutFinal,
    final: normalizedFinal as NonNullable<CinematographyPrompt["final"]>,
  };
}
