import * as THREE from "three";
import { getLookAtAngle, projectBoundingBox } from "../../utils";
import { ReginOfInterest } from "./roi";
import { DEFAULT_ASPECT_RATIO, DEFAULT_FOCAL_LENGTH } from "../../constants";
import { CameraParameters } from "../../instruction/types";

export const applyCameraDistance = (
  scale: number,
  roi: ReginOfInterest,
  initialPosition: THREE.Vector3
): THREE.Vector3 => {
  const camera: CameraParameters = {
    position: initialPosition,
    rotation: getLookAtAngle(initialPosition, roi.position),
    focalLength: DEFAULT_FOCAL_LENGTH,
    aspectRatio: DEFAULT_ASPECT_RATIO,
  };

  const projectedBounds = projectBoundingBox(
    roi.dimensions,
    roi.position,
    camera
  );

  const scaleToFit = Math.max(projectedBounds.width, projectedBounds.height);
  const totalScale = scaleToFit / scale;
  const cameraDistanceFromROI = camera.position.distanceTo(roi.position);

  const direction = new THREE.Vector3()
    .subVectors(initialPosition, roi.position)
    .normalize();

  return new THREE.Vector3().addVectors(
    roi.position,
    direction.multiplyScalar(cameraDistanceFromROI * totalScale)
  );
};
