import { CameraAngle, Subject } from "@/types/simulation";
import * as THREE from "three";

export function applyCameraAngle(
  cameraAngle: CameraAngle | undefined,
  subject: Subject,
  endPosition: THREE.Vector3,
  endAngle: THREE.Euler
) {
  const subjectPosition = subject.position;
  const subjectSize = subject.size;

  switch (cameraAngle) {
    case CameraAngle.EyeLevel:
      endPosition.y = subjectPosition.y + subjectSize.y * 0.9;
      break;

    case CameraAngle.LowAngle:
      endPosition.y = subjectPosition.y + subjectSize.y * 0.3;
      endAngle.x = Math.PI / 6; // Tilt up
      break;

    case CameraAngle.HighAngle:
      endPosition.y = subjectPosition.y + subjectSize.y * 1.5;
      endAngle.x = -Math.PI / 6; // Tilt down
      break;

    case CameraAngle.DutchAngle:
      endAngle.z = THREE.MathUtils.degToRad(15);
      break;

    case CameraAngle.BirdsEyeView:
      endPosition.y = subjectPosition.y + subjectSize.y * 3;
      endPosition.z = subjectPosition.z;
      endAngle.x = -Math.PI / 2; // Look straight down
      break;

    case CameraAngle.WormsEyeView:
      endPosition.y = subjectPosition.y - subjectSize.y * 0.5;
      endPosition.z = subjectPosition.z + subjectSize.z * 0.5;
      endAngle.x = Math.PI / 2; // Look straight up
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
      endAngle.y = Math.PI / 6; // Rotate slightly towards the subject
      break;

    case CameraAngle.PointOfView:
      endPosition
        .copy(subjectPosition)
        .add(new THREE.Vector3(0, subjectSize.y * 0.9, 0));
      // No need to change endAngle for POV, as it should match the subject's view
      break;
  }

  // After applying specific angle changes, ensure the camera is looking at the subject
  const directionToSubject = new THREE.Vector3().subVectors(
    subjectPosition,
    endPosition
  );
  endAngle.setFromRotationMatrix(
    new THREE.Matrix4().lookAt(
      endPosition,
      subjectPosition,
      new THREE.Vector3(0, 1, 0)
    )
  );
}
