import {
  CameraMovementType,
  ConstraintsConfig,
} from "@/service/simulation/instruction/types";

import {
  MovementSpeed,
  MovementEasing,
} from "@/service/simulation/instruction/types";

const SPEED_LIMITS: Record<
  MovementSpeed,
  Pick<ConstraintsConfig, "maxSpeed" | "maxAccelerate">
> = {
  [MovementSpeed.SlowToFast]: { maxSpeed: 4, maxAccelerate: 0.35 },
  [MovementSpeed.FastToSlow]: { maxSpeed: 4, maxAccelerate: 0.5 },
  [MovementSpeed.Constant]: { maxSpeed: 3.5, maxAccelerate: 1 },
  [MovementSpeed.SmoothStartStop]: { maxSpeed: 3, maxAccelerate: 0.3 },
};

// Camera paths that inherit the subject's world-space motion need enough
// headroom for that inherited velocity/acceleration.  Applying the generic
// low caps to those world-space paths made the camera lag behind the subject,
// reversing Dolly samples and breaking Follow/Track framing even though their
// subject-relative trajectories were valid.
const SUBJECT_RELATIVE_MOTION_LIMITS = {
  maxSpeed: 20,
  maxAccelerate: 20,
};

export function buildConstraintsForMovement(
  movementType: CameraMovementType,
  hasEndSetup: boolean = false,
  speed: MovementSpeed = MovementSpeed.Constant
): ConstraintsConfig {
  const baseConstraints: ConstraintsConfig = {
    allFramesVisibility: hasEndSetup,
    staticDistance: false,
    staticCameraSubjectRotation: false,
    ...SPEED_LIMITS[speed],
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
        maxSpeed: 0,
        maxAccelerate: 0,
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
        // A pedestal is defined on world Y.  Projecting its displacement onto
        // camera-local axes (whose up vector is pitched with the camera)
        // introduced an unwanted forward/backward component and could make a
        // bird's-eye pedestal almost entirely horizontal.  The simple motion
        // already emits only world-up/down displacement, so no directional
        // position lock is needed here.
        lockedRotation: {
          left: true,
          right: true,
          up: true,
          down: true,
          rollClockwise: true,
          rollNonClockwise: true,
        },
      };

    case CameraMovementType.DutchLeft:
    case CameraMovementType.DutchRight:
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
      };

    case CameraMovementType.DollyIn:
      return {
        ...baseConstraints,
        ...SUBJECT_RELATIVE_MOTION_LIMITS,
        // A close/inward dolly can intentionally crop the subject.  Requiring
        // the complete bounding box here would push the camera back out and
        // negate (or even reverse) the labelled movement.
        allFramesVisibility: false,
      };

    case CameraMovementType.DollyOut:
      return {
        ...baseConstraints,
        ...SUBJECT_RELATIVE_MOTION_LIMITS,
        allFramesVisibility: false,
      };

    case CameraMovementType.ArcLeft:
    case CameraMovementType.ArcRight:
      return {
        ...baseConstraints,
        ...SUBJECT_RELATIVE_MOTION_LIMITS,
        allFramesVisibility: true,
      };

    case CameraMovementType.Follow:
      return {
        ...baseConstraints,
        ...SUBJECT_RELATIVE_MOTION_LIMITS,
        allFramesVisibility: true,
      };

    case CameraMovementType.CraneUp:
    case CameraMovementType.CraneDown:
      return {
        ...baseConstraints,
        ...SUBJECT_RELATIVE_MOTION_LIMITS,
      };

    case CameraMovementType.Track:
      return {
        ...baseConstraints,
        // Tracking inherits the subject's world motion.  These still cap
        // pathological jumps while leaving ordinary subject-relative motion
        // untouched, which is required for a truly constant distance.
        ...SUBJECT_RELATIVE_MOTION_LIMITS,
        staticDistance: true,
        allFramesVisibility: true,
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
    case CameraMovementType.DollyOut:
      return true;
    default:
      return false;
  }
}

export function mapMovementSpeedToEasing(speed: MovementSpeed): MovementEasing {
  switch (speed) {
    case MovementSpeed.SlowToFast: // select random from easeIn...
      return MovementEasing.EaseInQuad;
    case MovementSpeed.FastToSlow: // select random from easeOut...
      return MovementEasing.EaseOutQuad;
    case MovementSpeed.SmoothStartStop: // select random from easeInOut...
      return MovementEasing.Smooth;
    case MovementSpeed.Constant:
    default:
      return MovementEasing.Linear;
  }
}
