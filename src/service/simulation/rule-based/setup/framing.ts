import * as THREE from "three";
import {
  CameraParameters,
  SubjectFraming,
  Scale,
} from "../../instruction/types";
import { RegionOfInterest } from "./roi";
import { SCALE_FACTORS } from "../../instruction/constants";
import { DEFAULT_FOCAL_LENGTH, DEFAULT_ASPECT_RATIO } from "../../constants";
import { getLookAtAngle, projectBoundingBox } from "../../utils";

export const applyFraming = (
  position: THREE.Vector3,
  roi: RegionOfInterest,
  framing?: SubjectFraming
): CameraParameters => {
  const camera = {
    position,
    rotation: getLookAtAngle(position, roi.position),
    focalLength: DEFAULT_FOCAL_LENGTH,
    aspectRatio: DEFAULT_ASPECT_RATIO,
  };
  return camera;

  // if (!framing) {
  //   return camera;
  // }

  // const projectedBounds = projectBoundingBox(
  //   roi.dimensions,
  //   roi.position,
  //   camera
  // );

  // const offset = calculatePositionOffset(
  //   projectedBounds,
  //   framing.position,
  //   position,
  //   roi.position
  // );

  // camera.position.add(offset);

  // camera.rotation = getLookAtAngle(camera.position, roi.position);
  // if (framing.dutchAngleScale) {
  //   camera.rotation.z += calculateDutchAngle(framing.dutchAngleScale);
  // }

  // return camera;
};

const calculatePositionOffset = (
  bounds: { width: number; height: number; center: THREE.Vector2 },
  position: string,
  cameraPosition: THREE.Vector3,
  targetPosition: THREE.Vector3
): THREE.Vector3 => {
  const forward = new THREE.Vector3()
    .subVectors(targetPosition, cameraPosition)
    .normalize();
  const right = new THREE.Vector3(0, 1, 0).cross(forward).normalize();
  const up = forward.clone().cross(right).normalize();

  let horizontalOffset = 0;
  let verticalOffset = 0;
  const margin = Math.max(bounds.width, bounds.height) * 0.2;

  switch (position) {
    case "left":
      horizontalOffset = -bounds.width / 4;
      break;
    case "right":
      horizontalOffset = bounds.width / 4;
      break;
    case "top":
      verticalOffset = bounds.height / 4;
      break;
    case "bottom":
      verticalOffset = -bounds.height / 4;
      break;
    case "topLeft":
      horizontalOffset = -bounds.width / 4;
      verticalOffset = bounds.height / 4;
      break;
    case "topRight":
      horizontalOffset = bounds.width / 4;
      verticalOffset = bounds.height / 4;
      break;
    case "bottomLeft":
      horizontalOffset = -bounds.width / 4;
      verticalOffset = -bounds.height / 4;
      break;
    case "bottomRight":
      horizontalOffset = bounds.width / 4;
      verticalOffset = -bounds.height / 4;
      break;
    case "outerLeft":
      horizontalOffset = -(bounds.width / 2 + margin);
      break;
    case "outerRight":
      horizontalOffset = bounds.width / 2 + margin;
      break;
    case "outerTop":
      verticalOffset = bounds.height / 2 + margin;
      break;
    case "outerBottom":
      verticalOffset = -(bounds.height / 2 + margin);
      break;
  }

  return right
    .multiplyScalar(horizontalOffset)
    .add(up.multiplyScalar(verticalOffset));
};

const calculateDutchAngle = (scale: Scale): number => {
  const MAX_DUTCH_ANGLE = Math.PI / 6;
  const scaleFactor = SCALE_FACTORS[scale];
  return MAX_DUTCH_ANGLE * scaleFactor;
};
