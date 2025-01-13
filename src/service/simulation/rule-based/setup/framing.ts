import * as THREE from "three";

import {
  SubjectInFramePosition,
  CameraParameters,
  LockedMovement,
  LockedRotation,
} from "@/service/simulation/instruction/types";
import {
  ProjectedBounds,
  projectBoundingBox,
} from "@/service/simulation/utils";
import { SubjectFrame, SubjectDimensions } from "@/service/subjects/types";

function getDesiredScreenPosition(
  bounds: ProjectedBounds,
  position?: SubjectInFramePosition
): THREE.Vector2 {
  if (!position) {
    const halfWidth = bounds.width / 2;
    const halfHeight = bounds.height / 2;

    const x = Math.max(
      -1 + halfWidth,
      Math.min(1 - halfWidth, bounds.center.x)
    );
    const y = Math.max(
      -1 + halfHeight,
      Math.min(1 - halfHeight, bounds.center.y)
    );

    return new THREE.Vector2(x, y);
  }

  const x = (() => {
    switch (position) {
      case SubjectInFramePosition.Left:
      case SubjectInFramePosition.TopLeft:
      case SubjectInFramePosition.BottomLeft:
        return -0.5;
      case SubjectInFramePosition.Right:
      case SubjectInFramePosition.TopRight:
      case SubjectInFramePosition.BottomRight:
        return 0.5;
      case SubjectInFramePosition.OuterLeft:
        return -1.5;
      case SubjectInFramePosition.OuterRight:
        return 1.5;
      default:
        return 0;
    }
  })();

  const y = (() => {
    switch (position) {
      case SubjectInFramePosition.Top:
      case SubjectInFramePosition.TopLeft:
      case SubjectInFramePosition.TopRight:
        return 0.5;
      case SubjectInFramePosition.Bottom:
      case SubjectInFramePosition.BottomLeft:
      case SubjectInFramePosition.BottomRight:
        return -0.5;
      case SubjectInFramePosition.OuterTop:
        return 1.5;
      case SubjectInFramePosition.OuterBottom:
        return -1.5;
      default:
        return 0;
    }
  })();

  return new THREE.Vector2(x, y);
}

export function fixSubjectInView(
  cameraParams: CameraParameters,
  subjectPosition: THREE.Vector3,
  subjectRotation: THREE.Euler,
  subjectDimensions: SubjectDimensions = { width: 0, height: 0, depth: 0 },
  subjectInFramePosition?: SubjectInFramePosition,
  lockedMovement?: LockedMovement,
  lockedRotation?: LockedRotation
): void {
  const tempCamera = new THREE.PerspectiveCamera();
  tempCamera.position.copy(cameraParams.position);

  tempCamera.lookAt(subjectPosition);

  cameraParams.rotation.x = tempCamera.rotation.x;
  cameraParams.rotation.y = tempCamera.rotation.y;
  cameraParams.rotation.z = tempCamera.rotation.z;

  const bounds = projectBoundingBox(
    subjectDimensions,
    subjectPosition,
    cameraParams
  );

  // const targetScreenPos = getDesiredScreenPosition(
  //   bounds,
  //   subjectInFramePosition
  // );

  // const dx = targetScreenPos.x - bounds.center.x;
  // const dy = targetScreenPos.y - bounds.center.y;

  // const fovX = 2 * Math.atan(SENSOR_WIDTH / (2 * cameraParams.focalLength));
  // const fovY = 2 * Math.atan(SENSOR_HEIGHT / (2 * cameraParams.focalLength));

  // const rotX = -dy * (fovY / 2);
  // const rotY = dx * (fovX / 2);

  // cameraParams.rotation.x += rotX;
  // cameraParams.rotation.y += rotY;
}
