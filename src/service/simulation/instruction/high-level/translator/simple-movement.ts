import {
  MovementMode,
  Direction,
  CameraMovementType,
} from "@/service/simulation/instruction/types";

export function getSimpleMovementDirection(
  movementType: CameraMovementType
): Direction {
  switch (movementType) {
    case CameraMovementType.PanLeft:
    case CameraMovementType.TruckLeft:
    case CameraMovementType.ArcLeft:
    case CameraMovementType.DutchLeft:
      return Direction.Left;
    case CameraMovementType.PanRight:
    case CameraMovementType.TruckRight:
    case CameraMovementType.ArcRight:
    case CameraMovementType.DutchRight:
      return Direction.Right;
    case CameraMovementType.TiltUp:
    case CameraMovementType.PedestalUp:
      return Direction.Up;
    case CameraMovementType.TiltDown:
    case CameraMovementType.PedestalDown:
      return Direction.Down;
    default:
      throw new Error(`Movement type ${movementType} is not a simple movement`);
  }
}

export function getSimpleMovementMode(
  movementType: CameraMovementType
): MovementMode {
  switch (movementType) {
    case CameraMovementType.PanLeft:
    case CameraMovementType.PanRight:
    case CameraMovementType.TiltUp:
    case CameraMovementType.TiltDown:
      return MovementMode.Rotation;
    case CameraMovementType.TruckLeft:
    case CameraMovementType.TruckRight:
    case CameraMovementType.PedestalUp:
    case CameraMovementType.PedestalDown:
      return MovementMode.Transition;
    case CameraMovementType.ArcLeft:
    case CameraMovementType.ArcRight:
      return MovementMode.Arc;
    case CameraMovementType.DutchLeft:
    case CameraMovementType.DutchRight:
      return MovementMode.Roll;
    default:
      throw new Error(`Movement type ${movementType} is not a simple movement`);
  }
}
