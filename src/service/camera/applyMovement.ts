import { Vector3, Euler, MathUtils } from "three";
import { CameraMovement, Subject } from "@/types/simulation";
import { lerpEuler } from "./utils";

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

  const subjectCenter = new Vector3().addVectors(
    subject.position,
    new Vector3(0, subject.size.y / 2, 0)
  );

  switch (movement) {
    case CameraMovement.Pan:
      newAngle.y = MathUtils.lerp(currentAngle.y, targetAngle.y, easedT);
      break;

    case CameraMovement.Tilt:
      newAngle.x = MathUtils.lerp(currentAngle.x, targetAngle.x, easedT);
      break;

    case CameraMovement.Dolly:
      newPosition.lerpVectors(currentPosition, targetPosition, easedT);
      break;

    case CameraMovement.Truck:
      newPosition.x = MathUtils.lerp(
        currentPosition.x,
        targetPosition.x,
        easedT
      );
      break;

    case CameraMovement.Pedestal:
      newPosition.y = MathUtils.lerp(
        currentPosition.y,
        targetPosition.y,
        easedT
      );
      break;

    case CameraMovement.CraneJib:
      newPosition.lerpVectors(currentPosition, targetPosition, easedT);
      newAngle = lerpEuler(currentAngle, targetAngle, easedT);
      break;

    case CameraMovement.Handheld:
      const shake = new Vector3(
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05
      );
      newPosition.add(shake);
      newAngle.x += (Math.random() - 0.5) * 0.02;
      newAngle.y += (Math.random() - 0.5) * 0.02;
      break;

    case CameraMovement.Steadicam:
      newPosition.lerpVectors(currentPosition, targetPosition, easedT * 0.1);
      newAngle = lerpEuler(currentAngle, targetAngle, easedT * 0.1);
      break;

    case CameraMovement.Zoom:
      newFocalLength = MathUtils.lerp(
        currentFocalLength,
        targetFocalLength,
        easedT
      );
      break;

    case CameraMovement.TrackingShot:
      newPosition.lerpVectors(currentPosition, targetPosition, easedT);
      newAngle = new Euler().setFromVector3(
        new Vector3().subVectors(subjectCenter, newPosition).normalize()
      );
      break;

    case CameraMovement.WhipPan:
      const whipEasedT =
        easedT < 0.5
          ? 16 * easedT * easedT * easedT * easedT * easedT
          : 1 - Math.pow(-2 * easedT + 2, 5) / 2;
      newAngle.y = MathUtils.lerp(currentAngle.y, targetAngle.y, whipEasedT);
      break;

    case CameraMovement.ArcShot:
      const radius = currentPosition.distanceTo(subjectCenter);
      const angle = MathUtils.lerp(0, Math.PI / 2, easedT);
      newPosition.x = subjectCenter.x + radius * Math.cos(angle);
      newPosition.z = subjectCenter.z + radius * Math.sin(angle);
      newAngle = new Euler().setFromVector3(
        new Vector3().subVectors(subjectCenter, newPosition).normalize()
      );
      break;

    case CameraMovement.DroneShot:
      newPosition.lerpVectors(currentPosition, targetPosition, easedT);
      const oscillation = Math.sin(easedT * Math.PI * 2) * 0.1;
      newPosition.y += oscillation;
      newAngle = new Euler().setFromVector3(
        new Vector3().subVectors(subjectCenter, newPosition).normalize()
      );
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
