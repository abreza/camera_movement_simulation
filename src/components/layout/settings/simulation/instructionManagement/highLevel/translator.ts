import {
  CinematographyPrompt,
  CameraMovementType,
  MovementSpeed,
  MovementEasing,
  SimulationInstruction,
  SetupConfig,
  ConstraintsConfig,
  CinematographySetup,
  CameraSubjectDistance,
  Scale,
  ShotSize,
  SubjectView,
} from "@/service/simulation/instruction/types";
import { getShotSizeIndex, SHOT_SIZE_ORDER } from "./constant";

function mapMovementSpeedToEasing(speed: MovementSpeed): MovementEasing {
  switch (speed) {
    case MovementSpeed.SlowToFast:
      return MovementEasing.EaseInQuad;
    case MovementSpeed.FastToSlow:
      return MovementEasing.EaseOutQuad;
    case MovementSpeed.StopAndGo:
      return MovementEasing.HandHeld;
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
    cameraAngle: setup.cameraAngle,
    shotSize: setup.shotSize,
    subjectView: setup.subjectView,
    subjectFraming: setup.subjectFraming
      ? { position: setup.subjectFraming }
      : undefined,
  };
}

function determineSubjectAwareInterpolation(
  movementType: CameraMovementType
): boolean {
  switch (movementType) {
    case CameraMovementType.ArcLeft:
    case CameraMovementType.ArcRight:
    case CameraMovementType.Follow:
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
    staticPosition: { x: false, y: false, z: false },
    staticRotation: { x: false, y: false, z: false },
    importance: 1,
  };

  switch (movementType) {
    case CameraMovementType.Static:
      return {
        ...baseConstraints,
        staticPosition: { x: true, y: true, z: true },
        staticRotation: { x: true, y: true, z: true },
      };

    case CameraMovementType.PanLeft:
    case CameraMovementType.PanRight:
      return {
        ...baseConstraints,
        staticPosition: { x: true, y: true, z: true },
        staticRotation: { x: true, y: false, z: true },
      };

    case CameraMovementType.TiltUp:
    case CameraMovementType.TiltDown:
      return {
        ...baseConstraints,
        staticPosition: { x: true, y: true, z: true },
        staticRotation: { x: false, y: true, z: true },
      };

    case CameraMovementType.DollyIn:
      return {
        ...baseConstraints,
        distance: {
          type: CameraSubjectDistance.DollyIn,
          scale: Scale.Small,
        },
      };

    case CameraMovementType.DollyOut:
      return {
        ...baseConstraints,
        distance: {
          type: CameraSubjectDistance.DollyOut,
          scale: Scale.Small,
        },
      };

    case CameraMovementType.TruckLeft:
    case CameraMovementType.TruckRight:
      return {
        ...baseConstraints,
        staticPosition: { x: false, y: true, z: true },
        staticRotation: { x: true, y: true, z: true },
      };

    case CameraMovementType.PedestalUp:
    case CameraMovementType.PedestalDown:
      return {
        ...baseConstraints,
        staticPosition: { x: true, y: false, z: true },
        staticRotation: { x: true, y: true, z: true },
      };

    case CameraMovementType.ArcLeft:
    case CameraMovementType.ArcRight:
      return {
        ...baseConstraints,
        allFramesVisibility: true,
      };

    case CameraMovementType.CraneUp:
    case CameraMovementType.CraneDown:
      return {
        ...baseConstraints,
      };

    case CameraMovementType.DollyOutZoomIn:
      return {
        ...baseConstraints,
        distance: {
          type: CameraSubjectDistance.DollyOut,
          scale: Scale.Small,
        },
      };

    case CameraMovementType.DollyInZoomOut:
      return {
        ...baseConstraints,
        distance: {
          type: CameraSubjectDistance.DollyIn,
          scale: Scale.Small,
        },
      };

    case CameraMovementType.DutchLeft:
    case CameraMovementType.DutchRight:
      return {
        ...baseConstraints,
      };

    case CameraMovementType.Follow:
      return {
        ...baseConstraints,
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
      endSetup.shotSize = getCloserShotSize(initial.shotSize);
      break;

    case CameraMovementType.DollyOut:
      endSetup.shotSize = getFartherShotSize(initial.shotSize);
      break;

    case CameraMovementType.ArcLeft:
    case CameraMovementType.ArcRight:
      endSetup.subjectView = getQuarterSideView(initial.subjectView);

      break;

    case CameraMovementType.DollyInZoomOut:
      endSetup.shotSize = getCloserShotSize(initial.shotSize);
      break;
    case CameraMovementType.DollyOutZoomIn:
      endSetup.shotSize = getFartherShotSize(initial.shotSize);
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

  let endSetup: SetupConfig = autoGenerateEndSetup(
    prompt.initial,
    prompt.movement.type
  );

  if (Object.keys(prompt.final).length) {
    endSetup = { ...endSetup, ...mapCinematographySetupToConfig(prompt.final) };
  }

  return {
    frameCount,
    subjectIndex,
    subjectAwareInterpolation,
    movementEasing,
    initialSetup: mapCinematographySetupToConfig(prompt.initial),
    endSetup,
    constraints,
  };
}
