import {
  CameraMovementType,
  ConstraintsConfig,
} from "@/service/simulation/instruction/types";

import {
  MovementSpeed,
  MovementEasing,
} from "@/service/simulation/instruction/types";

export function buildConstraintsForMovement(
  movementType: CameraMovementType,
  hasEndSetup: boolean = false
): ConstraintsConfig {
  const baseConstraints: ConstraintsConfig = {
    allFramesVisibility: hasEndSetup,
    lockedMovement: {
      left: false,
      right: false,
      up: false,
      down: false,
      forward: false,
      backward: false,
    },
    lockedRotation: {
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
        allFramesVisibility: false,
        lockedMovement: {
          left: true,
          right: true,
          up: true,
          down: true,
          forward: true,
          backward: true,
        },
        lockedRotation: {
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
        allFramesVisibility: false,
        lockedMovement: {
          left: true,
          right: true,
          up: true,
          down: true,
          forward: true,
          backward: true,
        },
        lockedRotation: {
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
        allFramesVisibility: false,
        lockedMovement: {
          left: true,
          right: true,
          up: true,
          down: true,
          forward: true,
          backward: true,
        },
        lockedRotation: {
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
        lockedMovement: {
          left: movementType === CameraMovementType.TruckRight,
          right: movementType === CameraMovementType.TruckLeft,
          up: true,
          down: true,
          forward: true,
          backward: true,
        },
        lockedRotation: {
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
        lockedMovement: {
          left: true,
          right: true,
          up: movementType === CameraMovementType.PedestalDown,
          down: movementType === CameraMovementType.PedestalUp,
          forward: true,
          backward: true,
        },
        lockedRotation: {
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

    case CameraMovementType.DollyIn:
    case CameraMovementType.DollyOut:

    case CameraMovementType.DollyInZoomOut:
    case CameraMovementType.DollyOutZoomIn:

    case CameraMovementType.ArcLeft:
    case CameraMovementType.ArcRight:

    // case CameraMovementType.DutchLeft:
    // case CameraMovementType.DutchRight:
      return {
        ...baseConstraints,
        allFramesVisibility: true,
      };

    case CameraMovementType.Follow:
      return {
        ...baseConstraints,
        lockedMovement: {
          left: true,
          right: true,
          up: true,
          down: true,
          forward: true,
          backward: true,
        },
      };

    case CameraMovementType.Track:
      return {
        ...baseConstraints,
        lockedRotation: {
          left: true,
          right: true,
          up: true,
          down: true,
          rollClockwise: true,
          rollNonClockwise: true,
        },
        staticDistance: true,
      };

    default:
      return baseConstraints;
  }
}

export function determineSubjectAwareInterpolation(
  movementType: CameraMovementType
): boolean {
  switch (movementType) {
    case CameraMovementType.ArcLeft:
    case CameraMovementType.ArcRight:
    case CameraMovementType.Follow:
    case CameraMovementType.Track:
    case CameraMovementType.DollyIn:
    case CameraMovementType.DollyInZoomOut:
    case CameraMovementType.DollyOut:
    case CameraMovementType.DollyOutZoomIn:
      return true;
    default:
      return false;
  }
}

export function mapMovementSpeedToEasing(speed: MovementSpeed): MovementEasing {
  switch (speed) {
    case MovementSpeed.SlowToFast:
      return MovementEasing.EaseInQuad;
    case MovementSpeed.FastToSlow:
      return MovementEasing.EaseOutQuad;
    case MovementSpeed.SmoothStartStop:
      return MovementEasing.Smooth;
    case MovementSpeed.Constant:
    default:
      return MovementEasing.Linear;
  }
}
