import * as THREE from "three";
import { SubjectDimensions } from "../subjects/types";
import { CameraParameters } from "./instruction/types";
import { SENSOR_WIDTH, SENSOR_HEIGHT } from "./constants";

export const getLookAtAngle = (
  cameraPosition: THREE.Vector3,
  targetPosition: THREE.Vector3
): THREE.Euler => {
  const tempCamera = new THREE.PerspectiveCamera();
  tempCamera.position.copy(cameraPosition);
  tempCamera.lookAt(targetPosition);
  return tempCamera.rotation.clone();
};

export interface ProjectedBounds {
  width: number;
  height: number;
  center: THREE.Vector2;
}

export const projectPoint = (
  point: THREE.Vector3,
  cameraParams: CameraParameters
): THREE.Vector2 => {
  const tempCamera = new THREE.PerspectiveCamera();
  tempCamera.setFocalLength(cameraParams.focalLength);

  tempCamera.position.copy(cameraParams.position);
  tempCamera.rotation.copy(cameraParams.rotation);

  tempCamera.updateProjectionMatrix();

  const ndc = point.clone().project(tempCamera);

  return new THREE.Vector2(ndc.x, ndc.y);
};

export const projectBoundingBox = (
  dimensions: SubjectDimensions,
  position: THREE.Vector3,
  camera: CameraParameters
): ProjectedBounds => {
  const halfWidth = dimensions.width / 2;
  const halfHeight = dimensions.height / 2;
  const halfDepth = dimensions.depth / 2;

  const corners = [
    new THREE.Vector3(-halfWidth, -halfHeight, -halfDepth).add(position),
    new THREE.Vector3(halfWidth, -halfHeight, -halfDepth).add(position),
    new THREE.Vector3(-halfWidth, halfHeight, -halfDepth).add(position),
    new THREE.Vector3(halfWidth, halfHeight, -halfDepth).add(position),
    new THREE.Vector3(-halfWidth, -halfHeight, halfDepth).add(position),
    new THREE.Vector3(halfWidth, -halfHeight, halfDepth).add(position),
    new THREE.Vector3(-halfWidth, halfHeight, halfDepth).add(position),
    new THREE.Vector3(halfWidth, halfHeight, halfDepth).add(position),
  ];

  const projectedPoints = corners.map((corner) => projectPoint(corner, camera));

  const minX = Math.min(...projectedPoints.map((p) => p.x));
  const maxX = Math.max(...projectedPoints.map((p) => p.x));
  const minY = Math.min(...projectedPoints.map((p) => p.y));
  const maxY = Math.max(...projectedPoints.map((p) => p.y));

  return {
    width: maxX - minX,
    height: maxY - minY,
    center: new THREE.Vector2((minX + maxX) / 2, (minY + maxY) / 2),
  };
};

export const ndcToSensor = (ndc: THREE.Vector2): THREE.Vector2 => {
  return new THREE.Vector2(
    ((ndc.x + 1) * SENSOR_WIDTH) / 2,
    ((ndc.y + 1) * SENSOR_HEIGHT) / 2
  );
};

export const sensorToNdc = (sensor: THREE.Vector2): THREE.Vector2 => {
  return new THREE.Vector2(
    (sensor.x * 2) / SENSOR_WIDTH - 1,
    (sensor.y * 2) / SENSOR_HEIGHT - 1
  );
};
