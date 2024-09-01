import { ShotType, Subject } from "@/types/simulation";
import * as THREE from "three";

export function applyShotType(
  shotType: ShotType | undefined,
  subject: Subject,
  endPosition: THREE.Vector3,
  endLookAt: THREE.Vector3,
  endFocalLength: number
) {
  const subjectPosition = subject.position;
  const subjectSize = subject.size;

  switch (shotType) {
    case ShotType.ExtremeCloseUp:
      endPosition.lerpVectors(endPosition, subjectPosition, 0.9);
      endFocalLength = 100;
      break;

    case ShotType.CloseUp:
      endPosition.lerpVectors(endPosition, subjectPosition, 0.8);
      endFocalLength = 85;
      break;

    case ShotType.MediumCloseUp:
      endPosition.lerpVectors(endPosition, subjectPosition, 0.7);
      endFocalLength = 70;
      break;

    case ShotType.MediumShot:
      endPosition.lerpVectors(endPosition, subjectPosition, 0.6);
      endFocalLength = 50;
      break;

    case ShotType.MediumLongShot:
      endPosition.lerpVectors(endPosition, subjectPosition, 0.5);
      endFocalLength = 40;
      break;

    case ShotType.LongShot:
      endPosition.lerpVectors(endPosition, subjectPosition, 0.3);
      endFocalLength = 35;
      break;

    case ShotType.ExtremeLongShot:
      endPosition.lerpVectors(endPosition, subjectPosition, 0.1);
      endFocalLength = 24;
      break;

    case ShotType.TwoShot:
      endPosition
        .copy(subjectPosition)
        .add(new THREE.Vector3(subjectSize.x * 1.5, 0, subjectSize.z * 2));
      endLookAt
        .copy(subjectPosition)
        .add(new THREE.Vector3(subjectSize.x * 0.5, 0, 0));
      endFocalLength = 50;
      break;

    case ShotType.GroupShot:
      endPosition
        .copy(subjectPosition)
        .add(new THREE.Vector3(0, subjectSize.y * 0.5, subjectSize.z * 3));
      endLookAt.copy(subjectPosition);
      endFocalLength = 35;
      break;

    case ShotType.InsertShot:
      endPosition.lerpVectors(endPosition, subjectPosition, 0.95);
      endFocalLength = 100;
      break;

    case ShotType.Cutaway:
      endPosition.add(
        new THREE.Vector3(subjectSize.x * 2, subjectSize.y, subjectSize.z)
      );
      endLookAt.copy(subjectPosition);
      endFocalLength = 50;
      break;

    case ShotType.EstablishingShot:
      endPosition.lerpVectors(endPosition, subjectPosition, 0.05);
      endLookAt.copy(subjectPosition);
      endFocalLength = 24;
      break;
  }
}
