import { CameraAngle, Subject } from "@/types/simulation";
import * as THREE from "three";

export function applyCameraAngle(
  cameraAngle: CameraAngle | undefined,
  subject: Subject,
  endPosition: THREE.Vector3,
  endLookAt: THREE.Vector3,
  endRotation: THREE.Euler
) {
  const subjectPosition = subject.position;
  const subjectSize = subject.size;

  switch (cameraAngle) {
    case CameraAngle.EyeLevel:
      endPosition.y = subjectPosition.y + subjectSize.y * 0.9;
      break;

    case CameraAngle.LowAngle:
      endPosition.y = subjectPosition.y + subjectSize.y * 0.3;
      endLookAt.y = subjectPosition.y + subjectSize.y;
      break;

    case CameraAngle.HighAngle:
      endPosition.y = subjectPosition.y + subjectSize.y * 1.5;
      endLookAt.y = subjectPosition.y;
      break;

    case CameraAngle.DutchAngle:
      endRotation.z = THREE.MathUtils.degToRad(15);
      break;

    case CameraAngle.BirdsEyeView:
      endPosition.y = subjectPosition.y + subjectSize.y * 3;
      endPosition.z = subjectPosition.z;
      endLookAt.copy(subjectPosition);
      break;

    case CameraAngle.WormsEyeView:
      endPosition.y = subjectPosition.y - subjectSize.y * 0.5;
      endPosition.z = subjectPosition.z + subjectSize.z * 0.5;
      endLookAt
        .copy(subjectPosition)
        .add(new THREE.Vector3(0, subjectSize.y, 0));
      break;

    case CameraAngle.OverTheShoulder:
      endPosition
        .copy(subjectPosition)
        .add(
          new THREE.Vector3(
            -subjectSize.x * 0.5,
            subjectSize.y * 0.8,
            -subjectSize.z * 0.5
          )
        );
      endLookAt
        .copy(subjectPosition)
        .add(new THREE.Vector3(subjectSize.x * 2, 0, 0));
      break;

    case CameraAngle.PointOfView:
      endPosition
        .copy(subjectPosition)
        .add(new THREE.Vector3(0, subjectSize.y * 0.9, 0));
      endLookAt
        .copy(subjectPosition)
        .add(new THREE.Vector3(subjectSize.x, 0, 0));
      break;
  }
}
