import * as THREE from "three";
import {
  SubjectInFramePosition,
  CameraParameters,
} from "@/service/simulation/instruction/types";
import {
  projectBoundingBox,
  ProjectedBounds,
} from "@/service/simulation/utils";
import { SubjectDimensions } from "@/service/subjects/types";
import { DEFAULT_ASPECT_RATIO, SENSOR_HEIGHT } from "../../constants";

export function calculateMinOffsetToCenterSection(
  bounds: ProjectedBounds
): THREE.Vector2 {
  const centerSectionWidth = 2 / 3;
  const centerSectionHeight = 2 / 3;

  const minX = -centerSectionWidth / 2;
  const maxX = centerSectionWidth / 2;
  const minY = -centerSectionHeight / 2;
  const maxY = centerSectionHeight / 2;

  const offsetX =
    bounds.center.x < minX
      ? minX - bounds.center.x
      : bounds.center.x > maxX
      ? maxX - bounds.center.x
      : 0;

  const offsetY =
    bounds.center.y < minY
      ? minY - bounds.center.y
      : bounds.center.y > maxY
      ? maxY - bounds.center.y
      : 0;

  return new THREE.Vector2(offsetX, offsetY);
}

export function calculateRequiredOffset(
  bounds: ProjectedBounds,
  position: SubjectInFramePosition
): THREE.Vector2 {
  const sectionWidth = 2 / 3;
  const sectionHeight = 2 / 3;

  const positions: Record<SubjectInFramePosition, THREE.Vector2> = {
    [SubjectInFramePosition.Center]: new THREE.Vector2(0, 0),
    [SubjectInFramePosition.Left]: new THREE.Vector2(-sectionWidth / 2, 0),
    [SubjectInFramePosition.Right]: new THREE.Vector2(sectionWidth / 2, 0),
    [SubjectInFramePosition.Top]: new THREE.Vector2(0, sectionHeight / 2),
    [SubjectInFramePosition.Bottom]: new THREE.Vector2(0, -sectionHeight / 2),
    [SubjectInFramePosition.TopLeft]: new THREE.Vector2(
      -sectionWidth / 2,
      sectionHeight / 2
    ),
    [SubjectInFramePosition.TopRight]: new THREE.Vector2(
      sectionWidth / 2,
      sectionHeight / 2
    ),
    [SubjectInFramePosition.BottomLeft]: new THREE.Vector2(
      -sectionWidth / 2,
      -sectionHeight / 2
    ),
    [SubjectInFramePosition.BottomRight]: new THREE.Vector2(
      sectionWidth / 2,
      -sectionHeight / 2
    ),

    [SubjectInFramePosition.OuterLeft]: new THREE.Vector2(
      -1 - bounds.width / 2,
      0
    ),
    [SubjectInFramePosition.OuterRight]: new THREE.Vector2(
      1 + bounds.width / 2,
      0
    ),
    [SubjectInFramePosition.OuterTop]: new THREE.Vector2(
      0,
      1 + bounds.height / 2
    ),
    [SubjectInFramePosition.OuterBottom]: new THREE.Vector2(
      0,
      -1 - bounds.height / 2
    ),
  };

  const targetPosition = positions[position];

  return new THREE.Vector2(
    targetPosition.x - bounds.center.x,
    targetPosition.y - bounds.center.y
  );
}

export function fixSubjectInView(
  cameraParams: CameraParameters,
  subjectPosition: THREE.Vector3,
  subjectDimensions: SubjectDimensions = { width: 0, height: 0, depth: 0 },
  subjectInFramePosition?: SubjectInFramePosition
): CameraParameters {
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

  const offset = subjectInFramePosition
    ? calculateRequiredOffset(bounds, subjectInFramePosition)
    : calculateMinOffsetToCenterSection(bounds);
  const fovY = 2 * Math.atan(SENSOR_HEIGHT / (2 * cameraParams.focalLength));
  const fovX = 2 * Math.atan(DEFAULT_ASPECT_RATIO * Math.tan(fovY / 2));

  const rotX = -offset.y * (fovY / 2);
  const rotY = -offset.x * (fovX / 2);

  const originalMatrix = new THREE.Matrix4().makeRotationFromEuler(
    cameraParams.rotation
  );

  const adjustMatrix = new THREE.Matrix4()
    .makeRotationX(rotX)
    .multiply(new THREE.Matrix4().makeRotationY(rotY));

  const finalMatrix = originalMatrix.multiply(adjustMatrix);

  cameraParams.rotation.setFromRotationMatrix(finalMatrix);

  return cameraParams;
}
