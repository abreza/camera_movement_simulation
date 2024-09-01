import { Vector3, Euler, MathUtils } from "three";
import { CameraMovement, Subject } from "@/types/simulation";
import {
  lerpVector3,
  lerpEuler,
  getSubjectCenter,
  applyShake,
  calculateArcPosition,
  applyOscillation,
  getMovementFunction,
  lookAt,
} from "./utils";

export function applyCameraMovement(
  framePosition: Vector3,
  frameAngle: Euler,
  frameFocalLength: number,
  currentPosition: Vector3,
  targetPosition: Vector3,
  currentAngle: Euler,
  targetAngle: Euler,
  currentFocalLength: number,
  targetFocalLength: number,
  subject: Subject,
  movement: CameraMovement,
  easedT: number
): { position: Vector3; angle: Euler; focalLength: number } {
  let newPosition = framePosition.clone();
  let newAngle = frameAngle.clone();
  let newFocalLength = frameFocalLength;

  const subjectCenter = getSubjectCenter(subject);
  const movementFn = getMovementFunction(movement);

  switch (movement) {
    case CameraMovement.Pan:
    case CameraMovement.Tilt:
      newAngle[movement === CameraMovement.Pan ? "y" : "x"] = movementFn(
        currentAngle[movement === CameraMovement.Pan ? "y" : "x"],
        targetAngle[movement === CameraMovement.Pan ? "y" : "x"],
        easedT
      );
      break;

    case CameraMovement.Dolly:
    case CameraMovement.Truck:
    case CameraMovement.Pedestal:
      newPosition = lerpVector3(currentPosition, targetPosition, easedT);
      break;

    case CameraMovement.CraneJib:
      const result = movementFn(
        { position: currentPosition, angle: currentAngle },
        { position: targetPosition, angle: targetAngle },
        easedT
      );
      newPosition = result.position;
      newAngle = result.angle;
      break;

    case CameraMovement.Handheld:
      const shakeResult = applyShake(newPosition, newAngle);
      newPosition = shakeResult.position;
      newAngle = shakeResult.angle;
      break;

    case CameraMovement.Steadicam:
      newPosition = lerpVector3(currentPosition, targetPosition, easedT * 0.1);
      newAngle = lerpEuler(currentAngle, targetAngle, easedT * 0.1);
      break;

    case CameraMovement.Zoom:
      newFocalLength = movementFn(
        currentFocalLength,
        targetFocalLength,
        easedT
      );
      break;

    case CameraMovement.TrackingShot:
      newPosition = lerpVector3(currentPosition, targetPosition, easedT);
      newAngle = lookAt(newPosition, subjectCenter);
      break;

    case CameraMovement.WhipPan:
      newAngle.y = movementFn(currentAngle.y, targetAngle.y, easedT);
      break;

    case CameraMovement.ArcShot:
      const initialRadius = currentPosition.distanceTo(subjectCenter);
      const targetRadius = targetPosition.distanceTo(subjectCenter);
      const initialArcAngle = Math.atan2(
        currentPosition.z - subjectCenter.z,
        currentPosition.x - subjectCenter.x
      );
      const targetArcAngle = Math.atan2(
        targetPosition.z - subjectCenter.z,
        targetPosition.x - subjectCenter.x
      );

      const currentRadius = MathUtils.lerp(initialRadius, targetRadius, easedT);
      const currentArcAngle = MathUtils.lerp(
        initialArcAngle,
        targetArcAngle,
        easedT
      );
      const currentHeight = MathUtils.lerp(
        currentPosition.y,
        targetPosition.y,
        easedT
      );

      newPosition = calculateArcPosition(
        subjectCenter,
        currentRadius,
        currentArcAngle,
        currentHeight
      );
      newAngle = lookAt(newPosition, subjectCenter);
      break;

    case CameraMovement.DroneShot:
      newPosition = lerpVector3(currentPosition, targetPosition, easedT);
      const totalDistance = currentPosition.distanceTo(targetPosition);
      const oscillationDirection = new Vector3(1, 1, 1);
      newPosition = applyOscillation(
        newPosition,
        oscillationDirection,
        easedT,
        totalDistance
      );
      newAngle = lookAt(newPosition, subjectCenter);
      break;

    default:
      break;
  }

  return {
    position: newPosition,
    angle: newAngle,
    focalLength: newFocalLength,
  };
}
