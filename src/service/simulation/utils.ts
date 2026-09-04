import * as THREE from "three";
import { SubjectDimensions } from "../subjects/types";
import { CameraParameters } from "./instruction/types";
import { SENSOR_WIDTH, SENSOR_HEIGHT } from "./constants";
import { randomValue } from "@/utils/randomUtils";

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
  min: THREE.Vector2;
  max: THREE.Vector2;
  allInFront: boolean;
}

const projectPointUsingThreeJsCamera = (
  point: THREE.Vector3,
  camera: THREE.PerspectiveCamera
): THREE.Vector2 => {
  const ndc = point.clone().project(camera);
  return new THREE.Vector2(ndc.x, ndc.y);
};

export const makeThreeJsCamera = (
  cameraParams: CameraParameters
): THREE.PerspectiveCamera => {
  const tempCamera = new THREE.PerspectiveCamera(
    50,
    cameraParams.aspectRatio
  );

  tempCamera.position.copy(cameraParams.position);
  tempCamera.rotation.copy(cameraParams.rotation);
  tempCamera.filmGauge = SENSOR_WIDTH;
  tempCamera.setFocalLength(cameraParams.focalLength);

  tempCamera.updateProjectionMatrix();
  tempCamera.updateMatrixWorld(true);
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
  cameraParams: CameraParameters,
  rotation: THREE.Euler = new THREE.Euler()
): ProjectedBounds => {
  const tempCamera = makeThreeJsCamera(cameraParams);

  const halfWidth = dimensions.width / 2;
  const halfHeight = dimensions.height / 2;
  const halfDepth = dimensions.depth / 2;

  const subjectQuaternion = new THREE.Quaternion().setFromEuler(rotation);
  const corners = [
    new THREE.Vector3(-halfWidth, -halfHeight, -halfDepth),
    new THREE.Vector3(halfWidth, -halfHeight, -halfDepth),
    new THREE.Vector3(-halfWidth, halfHeight, -halfDepth),
    new THREE.Vector3(halfWidth, halfHeight, -halfDepth),
    new THREE.Vector3(-halfWidth, -halfHeight, halfDepth),
    new THREE.Vector3(halfWidth, -halfHeight, halfDepth),
    new THREE.Vector3(-halfWidth, halfHeight, halfDepth),
    new THREE.Vector3(halfWidth, halfHeight, halfDepth),
  ].map((corner) => corner.applyQuaternion(subjectQuaternion).add(position));

  const cameraSpacePoints = corners.map((corner) =>
    corner.clone().applyMatrix4(tempCamera.matrixWorldInverse)
  );

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
    min: new THREE.Vector2(minX, minY),
    max: new THREE.Vector2(maxX, maxY),
    allInFront: cameraSpacePoints.every(
      (point) => point.z < -tempCamera.near
    ),
  };
};

export const getCameraFieldOfView = (
  cameraParams: CameraParameters
): { horizontal: number; vertical: number } => {
  // Match PerspectiveCamera.getFilmWidth/getFilmHeight exactly.  Three.js
  // treats filmGauge as the long edge of the sensor, so portrait cameras use
  // a narrower film width instead of an artificially taller sensor.
  const sensorWidth =
    SENSOR_WIDTH * Math.min(cameraParams.aspectRatio, 1);
  const sensorHeight =
    SENSOR_WIDTH / Math.max(cameraParams.aspectRatio, 1);
  return {
    horizontal: 2 * Math.atan(sensorWidth / (2 * cameraParams.focalLength)),
    vertical: 2 * Math.atan(sensorHeight / (2 * cameraParams.focalLength)),
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

export function sampleGaussian(mean: number, stdDev: number): number {
  let u = 0,
    v = 0,
    s = 0;

  do {
    u = randomValue() * 2 - 1;
    v = randomValue() * 2 - 1;
    s = u * u + v * v;
  } while (s >= 1 || s === 0);

  const mul = Math.sqrt((-2.0 * Math.log(s)) / s);
  return mean + u * mul * stdDev;
}
