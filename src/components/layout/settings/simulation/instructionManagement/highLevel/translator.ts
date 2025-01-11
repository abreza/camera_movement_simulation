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
} from "@/service/simulation/instruction/types";

function mapMovementSpeedToEasing(speed: MovementSpeed): MovementEasing {
  switch (speed) {
    case MovementSpeed.SlowToFast:
      return MovementEasing.EaseInQuad;
    case MovementSpeed.FastToSlow:
      return MovementEasing.EaseOutQuad;
    case MovementSpeed.Constant:
      return MovementEasing.Linear;
    case MovementSpeed.StopAndGo:
      return MovementEasing.HandHeld;
    case MovementSpeed.DeliberateStartStop:
      return MovementEasing.Smooth;
    default:
      return MovementEasing.Linear;
  }
}

function mapMovementTypeAndSpeedToEasing(
  movementType: CameraMovementType,
  speed: MovementSpeed
): MovementEasing {
  if (
    movementType === CameraMovementType.ArcLeft ||
    movementType === CameraMovementType.ArcRight
  ) {
    return MovementEasing.EaseInOutQuad;
  }

  return mapMovementSpeedToEasing(speed);
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
  const constraints: ConstraintsConfig = {
    allFramesVisibility: true,
    staticPosition: { x: false, y: false, z: false },
    staticRotation: { x: false, y: false, z: false },
    importance: 1,
  };

  if (movementType === CameraMovementType.DollyIn) {
    constraints.distance = {
      type: CameraSubjectDistance.DollyIn,
      scale: Scale.Small,
    };
  }

  if (movementType === CameraMovementType.DollyOut) {
    constraints.distance = {
      type: CameraSubjectDistance.DollyIn,
      scale: Scale.Small,
    };
  }

  return constraints;
}

export function translatePromptToSimulationInstruction(
  prompt: CinematographyPrompt,
  options?: {
    frameCount?: number;
    subjectIndex?: number;
  }
): SimulationInstruction {
  const { frameCount = 120, subjectIndex = 0 } = options || {};

  const movementEasing = mapMovementTypeAndSpeedToEasing(
    prompt.movement.type,
    prompt.movement.speed
  );

  let subjectAwareInterpolation = determineSubjectAwareInterpolation(
    prompt.movement.type
  );

  const constraints = buildConstraintsForMovement(prompt.movement.type);

  return {
    frameCount,
    subjectIndex,
    subjectAwareInterpolation,
    movementEasing,

    initialSetup: mapCinematographySetupToConfig(prompt.initial),

    endSetup:
      Object.keys(prompt.final).length > 0
        ? mapCinematographySetupToConfig(prompt.final)
        : undefined,

    constraints,
  };
}
