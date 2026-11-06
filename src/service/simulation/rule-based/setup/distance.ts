import * as THREE from "three";
import { getLookAtAngle, projectBoundingBox } from "../../utils";
import { RegionOfInterest } from "./roi";
import { DEFAULT_ASPECT_RATIO, DEFAULT_FOCAL_LENGTH } from "../../constants";
import { CameraParameters } from "../../instruction/types";

export const applyCameraDistance = (
  scale: number,
  roi: RegionOfInterest,
  initialPosition: THREE.Vector3,
  optics: Pick<CameraParameters, "focalLength" | "aspectRatio"> = {
    focalLength: DEFAULT_FOCAL_LENGTH,
    aspectRatio: DEFAULT_ASPECT_RATIO,
  }
): THREE.Vector3 => {
  const camera: CameraParameters = {
    position: initialPosition,
    rotation: getLookAtAngle(initialPosition, roi.position),
    ...optics,
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

  // A world-unit floor changes the requested shot size for miniature scenes.
  // This lower bound only avoids coincident camera/ROI coordinates and scales
  // with the precision available at the current scene coordinates.
  const coordinateScale = Math.max(
    Math.abs(roi.dimensions.width), Math.abs(roi.dimensions.height), Math.abs(roi.dimensions.depth),
    Math.abs(roi.position.x), Math.abs(roi.position.y), Math.abs(roi.position.z),
    Math.abs(initialPosition.x), Math.abs(initialPosition.y), Math.abs(initialPosition.z)
  );
  const minimumDistance = Math.max(Number.MIN_VALUE, 64 * Number.EPSILON * coordinateScale);
  let distance = Math.max(camera.position.distanceTo(roi.position), minimumDistance);
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
    distance = Math.max(minimumDistance, distance * ratio);
  }

  return roi.position.clone().add(direction.multiplyScalar(distance));
};
