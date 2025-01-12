import {
  CinematographyPrompt,
  CameraMovementType,
  MovementSpeed,
  MovementEasing,
  SimulationInstruction,
  SetupConfig,
  ConstraintsConfig,
  CinematographySetup,
  ShotSize,
  SubjectView,
  Scale,
  CameraVerticalAngle,
} from "@/service/simulation/instruction/types";
import { getShotSizeIndex, SHOT_SIZE_ORDER } from "./constant";

function mapMovementSpeedToEasing(speed: MovementSpeed): MovementEasing {
  switch (speed) {
    case MovementSpeed.SlowToFast:
      return MovementEasing.EaseInQuad;
    case MovementSpeed.FastToSlow:
      return MovementEasing.EaseOutQuad;
    case MovementSpeed.DeliberateStartStop:
      return MovementEasing.Smooth;
    case MovementSpeed.Constant:
    default:
      return MovementEasing.Linear;
  }
}

function mapCinematographySetupToConfig(
  setup: Partial<CinematographySetup>
): SetupConfig {
  return {
    ...(setup.cameraAngle && { cameraAngle: setup.cameraAngle }),
    ...(setup.shotSize && { shotSize: setup.shotSize }),
    ...(setup.subjectView && { subjectView: setup.subjectView }),
    ...(setup.subjectFraming && {
      subjectFraming: { position: setup.subjectFraming },
    }),
  };
}

function determineSubjectAwareInterpolation(
  movementType: CameraMovementType
): boolean {
  switch (movementType) {
    case CameraMovementType.ArcLeft:
    case CameraMovementType.ArcRight:
    case CameraMovementType.Follow:
    case CameraMovementType.DollyIn:
    case CameraMovementType.DollyInZoomOut:
    case CameraMovementType.DollyOut:
    case CameraMovementType.DollyOutZoomIn:
      return true;
    default:
      return false;
  }
}

function buildConstraintsForMovement(
  movementType: CameraMovementType
): ConstraintsConfig {
  const baseConstraints: ConstraintsConfig = {
    allFramesVisibility: true,
    staticPosition: {
      left: false,
      right: false,
      up: false,
      down: false,
      forward: false,
      backward: false,
    },
    staticRotation: {
      left: false,
      right: false,
      up: false,
      down: false,
      rollClockwise: false,
      rollNonClockwise: false,
    },
    importance: 1,
  };

  switch (movementType) {
    case CameraMovementType.Static:
      return {
        ...baseConstraints,
        staticPosition: {
          left: true,
          right: true,
          up: true,
          down: true,
          forward: true,
          backward: true,
        },
        staticRotation: {
          left: true,
          right: true,
          up: true,
          down: true,
          rollClockwise: true,
          rollNonClockwise: true,
        },
      };

    case CameraMovementType.PanLeft:
    case CameraMovementType.PanRight:
      return {
        ...baseConstraints,
        staticPosition: {
          left: true,
          right: true,
          up: true,
          down: true,
          forward: true,
          backward: true,
        },
        staticRotation: {
          left: movementType === CameraMovementType.PanRight,
          right: movementType === CameraMovementType.PanLeft,
          up: true,
          down: true,
          rollClockwise: true,
          rollNonClockwise: true,
        },
      };

    case CameraMovementType.TiltUp:
    case CameraMovementType.TiltDown:
      return {
        ...baseConstraints,
        staticPosition: {
          left: true,
          right: true,
          up: true,
          down: true,
          forward: true,
          backward: true,
        },
        staticRotation: {
          left: true,
          right: true,
          up: movementType === CameraMovementType.TiltDown,
          down: movementType === CameraMovementType.TiltUp,
          rollClockwise: true,
          rollNonClockwise: true,
        },
      };

    case CameraMovementType.TruckLeft:
    case CameraMovementType.TruckRight:
      return {
        ...baseConstraints,
        staticPosition: {
          left: movementType === CameraMovementType.TruckRight,
          right: movementType === CameraMovementType.TruckLeft,
          up: true,
          down: true,
          forward: true,
          backward: true,
        },
        staticRotation: {
          left: true,
          right: true,
          up: true,
          down: true,
          rollClockwise: true,
          rollNonClockwise: true,
        },
      };

    case CameraMovementType.PedestalUp:
    case CameraMovementType.PedestalDown:
      return {
        ...baseConstraints,
        staticPosition: {
          left: true,
          right: true,
          up: movementType === CameraMovementType.PedestalDown,
          down: movementType === CameraMovementType.PedestalUp,
          forward: true,
          backward: true,
        },
        staticRotation: {
          left: true,
          right: true,
          up: true,
          down: true,
          rollClockwise: true,
          rollNonClockwise: true,
        },
      };

    case CameraMovementType.CraneUp:
    case CameraMovementType.CraneDown:
      return {
        ...baseConstraints,
        staticPosition: {
          left: false,
          right: false,
          up: false,
          down: false,
          forward: false,
          backward: false,
        },
        staticRotation: {
          left: false,
          right: false,
          up: false,
          down: false,
          rollClockwise: true,
          rollNonClockwise: true,
        },
      };

    case CameraMovementType.DollyIn:
    case CameraMovementType.DollyOut:
      return {
        ...baseConstraints,
        staticPosition: {
          left: true,
          right: true,
          up: true,
          down: true,
          forward: movementType === CameraMovementType.DollyOut,
          backward: movementType === CameraMovementType.DollyIn,
        },
        staticRotation: {
          left: true,
          right: true,
          up: true,
          down: true,
          rollClockwise: true,
          rollNonClockwise: true,
        },
      };

    case CameraMovementType.DollyInZoomOut:
    case CameraMovementType.DollyOutZoomIn:
      return {
        ...baseConstraints,
        staticPosition: {
          left: true,
          right: true,
          up: true,
          down: true,
          forward: movementType === CameraMovementType.DollyOutZoomIn,
          backward: movementType === CameraMovementType.DollyInZoomOut,
        },
        staticRotation: {
          left: true,
          right: true,
          up: true,
          down: true,
          rollClockwise: true,
          rollNonClockwise: true,
        },
      };

    case CameraMovementType.ArcLeft:
    case CameraMovementType.ArcRight:
      return {
        ...baseConstraints,
        allFramesVisibility: true,
      };

    case CameraMovementType.DutchLeft:
    case CameraMovementType.DutchRight:
      return {
        ...baseConstraints,
        staticPosition: {
          left: true,
          right: true,
          up: true,
          down: true,
          forward: true,
          backward: true,
        },
        staticRotation: {
          left: true,
          right: true,
          up: true,
          down: true,
          rollClockwise: movementType === CameraMovementType.DutchLeft,
          rollNonClockwise: movementType === CameraMovementType.DutchRight,
        },
      };

    case CameraMovementType.Follow:
      return {
        ...baseConstraints,
        staticPosition: {
          left: false,
          right: false,
          up: false,
          down: false,
          forward: false,
          backward: false,
        },
        staticRotation: {
          left: false,
          right: false,
          up: false,
          down: false,
          rollClockwise: false,
          rollNonClockwise: false,
        },
        staticDistance: true,
      };

    default:
      return baseConstraints;
  }
}

function getCloserShotSize(currentShot: ShotSize): ShotSize {
  const index = getShotSizeIndex(currentShot);
  if (index <= 0) return currentShot;
  return SHOT_SIZE_ORDER[index - 1];
}

function getFartherShotSize(currentShot: ShotSize): ShotSize {
  const index = getShotSizeIndex(currentShot);
  if (index < 0 || index >= SHOT_SIZE_ORDER.length - 1) return currentShot;
  return SHOT_SIZE_ORDER[index + 1];
}

function getQuarterSideView(currentView: SubjectView): SubjectView {
  switch (currentView) {
    case SubjectView.Front:
      return SubjectView.ThreeQuarterFrontLeft;
    case SubjectView.Left:
      return SubjectView.ThreeQuarterFrontLeft;
    case SubjectView.Right:
      return SubjectView.ThreeQuarterFrontRight;
    case SubjectView.Back:
      return SubjectView.ThreeQuarterBackRight;
    default:
      return SubjectView.ThreeQuarterFrontLeft;
  }
}

function autoGenerateEndSetup(
  initial: CinematographySetup,
  movementType: CameraMovementType
): SetupConfig {
  const endSetup: SetupConfig = {
    cameraAngle: initial.cameraAngle,
    shotSize: initial.shotSize,
    subjectView: initial.subjectView,
    subjectFraming: { position: initial.subjectFraming },
  };

  switch (movementType) {
    case CameraMovementType.DollyIn:
    case CameraMovementType.DollyInZoomOut:
      endSetup.shotSize = getCloserShotSize(initial.shotSize);
      break;

    case CameraMovementType.DollyOut:
    case CameraMovementType.DollyOutZoomIn:
      endSetup.shotSize = getFartherShotSize(initial.shotSize);
      break;

    case CameraMovementType.ArcLeft:
    case CameraMovementType.ArcRight:
      endSetup.subjectView = getQuarterSideView(initial.subjectView);
      break;

    case CameraMovementType.DutchLeft:
    case CameraMovementType.DutchRight:
      endSetup.subjectFraming = {
        ...endSetup.subjectFraming,
        dutchAngleScale: Scale.Medium,
      };
      break;

    case CameraMovementType.CraneUp:
    case CameraMovementType.CraneDown:
      if (
        movementType === CameraMovementType.CraneUp &&
        initial.cameraAngle === "eye"
      ) {
        endSetup.cameraAngle = CameraVerticalAngle.High;
      } else if (
        movementType === CameraMovementType.CraneDown &&
        initial.cameraAngle === "eye"
      ) {
        endSetup.cameraAngle = CameraVerticalAngle.Low;
      }
      break;

    default:
      break;
  }

  return endSetup;
}

export function translatePromptToSimulationInstruction(
  prompt: CinematographyPrompt,
  options?: {
    frameCount?: number;
    subjectIndex?: number;
  }
): SimulationInstruction {
  const { frameCount = 120, subjectIndex = 0 } = options || {};

  const movementEasing = mapMovementSpeedToEasing(prompt.movement.speed);

  const subjectAwareInterpolation = determineSubjectAwareInterpolation(
    prompt.movement.type
  );

  const constraints = buildConstraintsForMovement(prompt.movement.type);

  return {
    frameCount,
    subjectIndex,
    subjectAwareInterpolation,
    movementEasing,
    initialSetup: mapCinematographySetupToConfig(prompt.initial),
    endSetup: {
      ...autoGenerateEndSetup(prompt.initial, prompt.movement.type),
      ...mapCinematographySetupToConfig(prompt.final),
    },
    constraints,
  };
}
