import * as THREE from "three";
import { getLookAtAngle, projectBoundingBox } from "../../utils";
import { RegionOfInterest } from "./roi";
import { DEFAULT_ASPECT_RATIO, DEFAULT_FOCAL_LENGTH } from "../../constants";
import { CameraParameters } from "../../instruction/types";

export const applyCameraDistance = (
  scale: number,
  roi: RegionOfInterest,
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
    camera,
    roi.rotation
  );

  const direction = new THREE.Vector3()
    .subVectors(initialPosition, roi.position)
    .normalize();
  if (direction.lengthSq() === 0) direction.set(0, 0, 1);

  let distance = Math.max(camera.position.distanceTo(roi.position), 0.1);
  if (scale <= 0 || !Number.isFinite(scale)) return initialPosition.clone();

  // Perspective size is almost inverse-linear in distance.  Iterating also
  // accounts for the near/far faces of a rotated 3-D bounding box.
  for (let iteration = 0; iteration < 8; iteration++) {
    camera.position
      .copy(roi.position)
      .add(direction.clone().multiplyScalar(distance));
    camera.rotation.copy(getLookAtAngle(camera.position, roi.position));
    const bounds = projectBoundingBox(
      roi.dimensions,
      roi.position,
      camera,
      roi.rotation
    );
    const occupancy = Math.max(bounds.width, bounds.height);
    if (!Number.isFinite(occupancy) || occupancy <= 1e-8) break;
    const ratio = occupancy / scale;
    if (Math.abs(ratio - 1) < 1e-4) break;
    distance = Math.max(0.1, distance * ratio);
  }

  return roi.position.clone().add(direction.multiplyScalar(distance));
};
