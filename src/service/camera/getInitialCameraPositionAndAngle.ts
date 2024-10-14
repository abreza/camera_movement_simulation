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

  const angels = {
    [CameraAngle.LowAngle]: -Math.PI / 6,
    [CameraAngle.MediumAngle]: 0,
    [CameraAngle.HighAngle]: Math.PI / 6,
    [CameraAngle.BirdsEyeView]: Math.PI / 3,
  };

  position.set(
    0,
    Math.max(
      0,
      Math.sin(angels[cameraAngle]) * distance + subjectSize.y * 0.75
    ),
    Math.cos(angels[cameraAngle]) * distance
  );
  position.add(subjectPosition);

  const angle = new THREE.Euler();

  angle.setFromQuaternion(
    new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(
        position,
        subjectPosition.add(new THREE.Vector3(0, subjectSize.y * 0.5, 0)),
        new THREE.Vector3(0, 1, 0)
      )
    )
  );

  return { position, angle };
}
