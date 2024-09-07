import { Subject, CameraAngle, ShotType } from "@/types/simulation";
import * as THREE from "three";

export function getInitialCameraPositionAndAngle(
  subject: Subject,
  cameraAngle: CameraAngle,
  shotType: ShotType
): { position: THREE.Vector3; angle: THREE.Euler } {
  const subjectPosition = subject.position.clone();
  const subjectSize = subject.size.clone();

  let distance = 0;
  switch (shotType) {
    case ShotType.CloseUp:
      distance = subjectSize.length() * 1.5;
      break;
    case ShotType.MediumShot:
      distance = subjectSize.length() * 3;
      break;
    case ShotType.LongShot:
      distance = subjectSize.length() * 6;
      break;
  }

  let position = new THREE.Vector3();
  let angle = new THREE.Euler();

  switch (cameraAngle) {
    case CameraAngle.LowAngle:
      position.set(0, 0, distance);
      angle.set(Math.PI / 6, 0, 0);
      break;
    case CameraAngle.MediumAngle:
      position.set(0, subjectSize.y / 2, distance);
      angle.set(0, 0, 0);
      break;
    case CameraAngle.HighAngle:
      position.set(0, subjectSize.y, distance);
      angle.set(-Math.PI / 6, 0, 0);
      break;
    case CameraAngle.BirdsEyeView:
      position.set(0, distance * 2, distance / 2);
      angle.set(-Math.PI / 2, 0, 0);
      break;
  }

  position.applyEuler(subject.rotation);
  position.add(subjectPosition);

  angle.setFromQuaternion(
    new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(
        position,
        subjectPosition,
        new THREE.Vector3(0, 1, 0)
      )
    )
  );

  return { position, angle };
}
