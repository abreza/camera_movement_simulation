import * as THREE from "three";
import { SubjectDimensions } from "../subjects/types";
import { CameraParameters } from "./instruction/types";
import { SENSOR_WIDTH, SENSOR_HEIGHT } from "./constants";
import { randomValue } from "@/utils/randomUtils";

// These helpers are synchronous and return independent values. Reuse the
// internal Three.js objects instead of constructing cameras for every frame.
const lookAtCamera = new THREE.PerspectiveCamera();
const boundsCamera = new THREE.PerspectiveCamera();
const boundsCorner = new THREE.Vector3();
const boundsSubjectQuaternion = new THREE.Quaternion();
let boundsFocalLength: number | undefined;
let boundsAspectRatio: number | undefined;

export const getLookAtAngle = (
  cameraPosition: THREE.Vector3,
  targetPosition: THREE.Vector3
): THREE.Euler => {
  lookAtCamera.position.copy(cameraPosition);
  lookAtCamera.lookAt(targetPosition);
  return lookAtCamera.rotation.clone();
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
  boundsCamera.position.copy(cameraParams.position);
  boundsCamera.rotation.copy(cameraParams.rotation);
  if (
    boundsFocalLength !== cameraParams.focalLength ||
    boundsAspectRatio !== cameraParams.aspectRatio
  ) {
    boundsCamera.aspect = cameraParams.aspectRatio;
    boundsCamera.filmGauge = SENSOR_WIDTH;
    boundsCamera.setFocalLength(cameraParams.focalLength);
    boundsFocalLength = cameraParams.focalLength;
    boundsAspectRatio = cameraParams.aspectRatio;
  }
  boundsCamera.updateMatrixWorld(true);

  const halfWidth = dimensions.width / 2;
  const halfHeight = dimensions.height / 2;
  const halfDepth = dimensions.depth / 2;

  boundsSubjectQuaternion.setFromEuler(rotation);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let allInFront = true;

  for (let index = 0; index < 8; index++) {
    boundsCorner
      .set(
        index & 1 ? halfWidth : -halfWidth,
        index & 2 ? halfHeight : -halfHeight,
        index & 4 ? halfDepth : -halfDepth
      )
      .applyQuaternion(boundsSubjectQuaternion)
      .add(position)
      .applyMatrix4(boundsCamera.matrixWorldInverse);
    allInFront = allInFront && boundsCorner.z < -boundsCamera.near;
    boundsCorner.applyMatrix4(boundsCamera.projectionMatrix);
    minX = Math.min(minX, boundsCorner.x);
    maxX = Math.max(maxX, boundsCorner.x);
    minY = Math.min(minY, boundsCorner.y);
    maxY = Math.max(maxY, boundsCorner.y);
  }

  return {
    width: maxX - minX,
    height: maxY - minY,
    center: new THREE.Vector2((minX + maxX) / 2, (minY + maxY) / 2),
    min: new THREE.Vector2(minX, minY),
    max: new THREE.Vector2(maxX, maxY),
    allInFront,
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
