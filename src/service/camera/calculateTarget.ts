import { CameraAngle, ShotType, Subject } from "@/types/simulation";
import { Vector3 } from "three";
import { calculateRequiredDistance } from "./utils";

export function calculateTargetPosition(
  subject: Subject,
  cameraAngle: CameraAngle,
  shotType: ShotType,
  focalLength: number
): { position: Vector3; focalLength: number } {
  const subjectCenter = subject.position
    .clone()
    .add(subject.size.clone().multiplyScalar(0.5));
  const requiredDistance = calculateRequiredDistance(subject.size, focalLength);
  let targetPosition = new Vector3();
  let targetFocalLength = focalLength;

  switch (cameraAngle) {
    case CameraAngle.LowAngle:
      targetPosition.set(
        subjectCenter.x,
        subjectCenter.y - subject.size.y / 2,
        subjectCenter.z - requiredDistance * 0.8
      );
      break;
    case CameraAngle.HighAngle:
      targetPosition.set(
        subjectCenter.x,
        subjectCenter.y + subject.size.y / 2,
        subjectCenter.z - requiredDistance
      );
      break;
    case CameraAngle.DutchAngle:
      targetPosition.set(
        subjectCenter.x + subject.size.x / 4,
        subjectCenter.y,
        subjectCenter.z - requiredDistance * 0.9
      );
      break;
    case CameraAngle.BirdsEyeView:
      targetPosition.set(
        subjectCenter.x,
        subjectCenter.y + requiredDistance,
        subjectCenter.z
      );
      break;
    case CameraAngle.WormsEyeView:
      targetPosition.set(
        subjectCenter.x,
        subjectCenter.y - subject.size.y / 2,
        subjectCenter.z
      );
      break;
    case CameraAngle.OverTheShoulder:
      targetPosition.set(
        subjectCenter.x + subject.size.x / 4,
        subjectCenter.y + subject.size.y / 4,
        subjectCenter.z - subject.size.z / 4
      );
      break;
    case CameraAngle.PointOfView:
      targetPosition.set(
        subjectCenter.x,
        subjectCenter.y + subject.size.y * 0.4,
        subjectCenter.z + subject.size.z / 2
      );
      break;
  }

  switch (shotType) {
    case ShotType.ExtremeCloseUp:
      targetPosition.z += requiredDistance * 0.4;
      targetFocalLength = 100;
      break;
    case ShotType.CloseUp:
      targetPosition.z += requiredDistance * 0.8;
      targetFocalLength = 85;
      break;
    case ShotType.MediumCloseUp:
      targetPosition.z += requiredDistance * 1.2;
      targetFocalLength = 70;
      break;
    case ShotType.MediumShot:
      targetPosition.z += requiredDistance * 1.6;
      targetFocalLength = 50;
      break;
    case ShotType.MediumLongShot:
      targetPosition.z += requiredDistance * 2;
      targetFocalLength = 40;
      break;
    case ShotType.FullShot:
      targetPosition.z += requiredDistance * 2.4;
      targetFocalLength = 35;
      break;
    case ShotType.LongShot:
      targetPosition.z += requiredDistance * 3;
      targetFocalLength = 28;
      break;
    case ShotType.ExtremeLongShot:
      targetPosition.z += requiredDistance * 4;
      targetFocalLength = 20;
      break;
    case ShotType.TwoShot:
      targetPosition.z += requiredDistance * 2.4;
      targetPosition.x += subject.size.x / 2;
      targetFocalLength = 45;
      break;
    case ShotType.GroupShot:
      targetPosition.z += requiredDistance * 3;
      targetPosition.y += subject.size.y / 2;
      targetFocalLength = 35;
      break;
    case ShotType.InsertShot:
      targetPosition = subjectCenter
        .clone()
        .add(new Vector3(0, 0, -subject.size.z));
      targetFocalLength = 100;
      break;
    case ShotType.Cutaway:
      const cutawayDistance =
        calculateRequiredDistance(subject.position, 50) * 2;
      targetPosition = subject.position
        .clone()
        .add(subject.size.clone().multiplyScalar(0.5))
        .add(new Vector3(0, 0, -cutawayDistance));
      targetFocalLength = 50;
      break;
    case ShotType.EstablishingShot:
      targetPosition.set(
        subjectCenter.x,
        subjectCenter.y + subject.size.y * 2,
        subjectCenter.z - requiredDistance * 6
      );
      targetFocalLength = 24;
      break;
  }

  return { position: targetPosition, focalLength: targetFocalLength };
}
