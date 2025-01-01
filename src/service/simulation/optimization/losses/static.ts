import * as THREE from "three";
import {
  CameraParameters,
  CameraVerticalAngle,
  ShotSize,
  SubjectFraming,
  SubjectView,
} from "../../instruction/types";
import { SubjectInfo } from "../../../subjects/types";
import {
  getDesiredDistance,
  getDesiredHorizontalAngle,
  getDesiredVerticalAngle,
  getVerticalAngle,
} from "../../instruction/helpers/static";
import { SCALE_FACTORS } from "../../instruction/constants";

export const calculateCameraAngleLoss = (
  camera: CameraParameters,
  subjectPosition: THREE.Vector3,
  desiredAngle: CameraVerticalAngle
): number => {
  const currentAngle = getVerticalAngle(camera, subjectPosition);
  const targetAngle = getDesiredVerticalAngle(desiredAngle);
  return Math.pow(currentAngle - targetAngle, 2);
};

export const calculateShotSizeLoss = (
  camera: CameraParameters,
  subjectPosition: THREE.Vector3,
  subject: SubjectInfo["subject"],
  desiredSize: ShotSize
): number => {
  const currentDistance = camera.position.distanceTo(subjectPosition);
  const targetDistance = getDesiredDistance(desiredSize, subject.dimensions);
  return Math.pow(currentDistance - targetDistance, 2);
};

export const calculateSubjectViewLoss = (
  camera: CameraParameters,
  subjectFrame: { position: THREE.Vector3; rotation: THREE.Euler },
  desiredView: SubjectView
): number => {
  const cameraDirection = new THREE.Vector3(0, 0, -1).applyEuler(
    camera.rotation
  );
  const currentAngle = Math.atan2(cameraDirection.x, cameraDirection.z);
  const targetAngle = getDesiredHorizontalAngle(desiredView);
  return Math.pow(currentAngle - targetAngle, 2);
};

const getTargetPosition = (
  framing: SubjectFraming
): { x: number; y: number } => {
  const zoneScale = framing.zone === "inner" ? 0.33 : 0.66;
  const sizeScale = SCALE_FACTORS[framing.scale];
  const baseScale = zoneScale * sizeScale;

  let targetX = 0;
  let targetY = 0;

  switch (framing.position) {
    case "left":
      targetX = -baseScale;
      break;
    case "right":
      targetX = baseScale;
      break;
    case "top":
      targetY = baseScale;
      break;
    case "bottom":
      targetY = -baseScale;
      break;
    case "center":
      break;
  }

  return { x: targetX, y: targetY };
};

export const calculateSubjectFramingLoss = (
  camera: CameraParameters,
  subjectPosition: THREE.Vector3,
  desiredFraming: SubjectFraming
): number => {
  const cameraMatrix = new THREE.Matrix4().makeRotationFromEuler(
    camera.rotation
  );
  const cameraSpace = subjectPosition
    .clone()
    .sub(camera.position)
    .applyMatrix4(cameraMatrix);

  const fov = 2 * Math.atan(24 / (2 * camera.focalLength));
  const aspectRatio = camera.aspectRatio;
  const ndcX =
    cameraSpace.x / (cameraSpace.z * Math.tan(fov / 2)) / aspectRatio;
  const ndcY = cameraSpace.y / (cameraSpace.z * Math.tan(fov / 2));

  const { x: targetX, y: targetY } = getTargetPosition(desiredFraming);

  const positionLoss =
    Math.pow(ndcX - targetX, 2) + Math.pow(ndcY - targetY, 2);

  const frameBoundary = 0.95;
  const outsideFrame = Math.max(
    0,
    Math.abs(ndcX) - frameBoundary,
    Math.abs(ndcY) - frameBoundary
  );

  return positionLoss + Math.pow(outsideFrame * 2, 2);
};

export const calculateVisibilityLoss = (
  camera: CameraParameters,
  subjectPosition: THREE.Vector3
): number => {
  const cameraMatrix = new THREE.Matrix4().makeRotationFromEuler(
    camera.rotation
  );
  const cameraSpace = subjectPosition
    .clone()
    .sub(camera.position)
    .applyMatrix4(cameraMatrix);

  if (cameraSpace.z <= 0) return 1000;

  const fov = 2 * Math.atan(24 / (2 * camera.focalLength));
  const aspectRatio = camera.aspectRatio;
  const ndcX =
    cameraSpace.x / (cameraSpace.z * Math.tan(fov / 2)) / aspectRatio;
  const ndcY = cameraSpace.y / (cameraSpace.z * Math.tan(fov / 2));

  const outsideView = Math.max(0, Math.abs(ndcX) - 1, Math.abs(ndcY) - 1);

  return Math.pow(outsideView, 2) * 100;
};
