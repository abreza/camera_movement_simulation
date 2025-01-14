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

const projectPointUsingThreeJsCamera = (
  point: THREE.Vector3,
  camera: THREE.PerspectiveCamera
): THREE.Vector2 => {
  debugger;
  const ndc = point.clone().project(camera);

  return new THREE.Vector2(ndc.x, ndc.y);
};

export const makeThreeJsCamera = (
  cameraParams: CameraParameters
): THREE.PerspectiveCamera => {
  const tempCamera = new THREE.PerspectiveCamera();

  tempCamera.position.copy(cameraParams.position);
  tempCamera.rotation.copy(cameraParams.rotation);
  tempCamera.setFocalLength(cameraParams.focalLength);

  tempCamera.updateMatrixWorld();
  return tempCamera;
};

export const projectPoint = (
  point: THREE.Vector3,
  cameraParams: CameraParameters
): THREE.Vector2 => {
  const tempCamera = makeThreeJsCamera(cameraParams);
  return projectPointUsingThreeJsCamera(point, tempCamera);
};

export const projectBoundingBox = (
  dimensions: SubjectDimensions,
  position: THREE.Vector3,
  cameraParams: CameraParameters
): ProjectedBounds => {
  const tempCamera = makeThreeJsCamera(cameraParams);

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

  const projectedPoints = corners.map((corner) =>
    projectPointUsingThreeJsCamera(corner, tempCamera)
  );

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
