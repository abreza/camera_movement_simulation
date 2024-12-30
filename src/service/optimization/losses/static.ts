import * as THREE from "three";
import {
  CameraParameters,
  CameraVerticalAngle,
  ShotSize,
  SubjectInFrame,
  SubjectView,
} from "../../simulation/types";
import { SubjectInfo } from "../../subjects/types";

const getVerticalAngle = (
  camera: CameraParameters,
  subjectPosition: THREE.Vector3
): number => {
  const cameraToSubject = new THREE.Vector3().subVectors(
    subjectPosition,
    camera.position
  );
  const yAxis = new THREE.Vector3(0, 1, 0);
  return cameraToSubject.angleTo(yAxis);
};

const getDesiredVerticalAngle = (angle: CameraVerticalAngle): number => {
  switch (angle) {
    case CameraVerticalAngle.Low:
      return Math.PI * 0.7;
    case CameraVerticalAngle.Eye:
      return Math.PI * 0.5;
    case CameraVerticalAngle.High:
      return Math.PI * 0.3;
    case CameraVerticalAngle.Overhead:
      return Math.PI * 0.1;
    case CameraVerticalAngle.BirdsEye:
      return 0;
    default:
      return Math.PI * 0.5;
  }
};

const getDesiredDistance = (
  shotSize: ShotSize,
  subjectDimensions: { height: number }
): number => {
  const baseDistance = subjectDimensions.height * 2;
  switch (shotSize) {
    case ShotSize.CloseUp:
      return baseDistance * 0.5;
    case ShotSize.MediumShot:
      return baseDistance;
    case ShotSize.LongShot:
      return baseDistance * 2;
    default:
      return baseDistance;
  }
};

const getDesiredHorizontalAngle = (view: SubjectView): number => {
  switch (view) {
    case SubjectView.Front:
      return 0;
    case SubjectView.Back:
      return Math.PI;
    case SubjectView.Left:
      return -Math.PI * 0.5;
    case SubjectView.Right:
      return Math.PI * 0.5;
    case SubjectView.ThreeQuarterLeft:
      return -Math.PI * 0.25;
    case SubjectView.ThreeQuarterRight:
      return Math.PI * 0.25;
    default:
      return 0;
  }
};

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
  const subjectDirection = new THREE.Vector3(0, 0, 1).applyEuler(
    subjectFrame.rotation
  );
  const currentAngle = Math.atan2(cameraDirection.x, cameraDirection.z);
  const targetAngle = getDesiredHorizontalAngle(desiredView);
  return Math.pow(currentAngle - targetAngle, 2);
};

export const calculateSubjectInFrameLoss = (
  camera: CameraParameters,
  subjectPosition: THREE.Vector3,
  desiredPosition: SubjectInFrame
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

  let targetX = 0,
    targetY = 0;
  switch (desiredPosition) {
    case SubjectInFrame.InnerLeft:
      targetX = -0.33;
      break;
    case SubjectInFrame.InnerRight:
      targetX = 0.33;
      break;
    case SubjectInFrame.InnerTop:
      targetY = 0.33;
      break;
    case SubjectInFrame.InnerBottom:
      targetY = -0.33;
      break;
    case SubjectInFrame.InnerCenter:
      targetX = 0;
      targetY = 0;
      break;
    case SubjectInFrame.OuterLeft:
      targetX = -0.66;
      break;
    case SubjectInFrame.OuterRight:
      targetX = 0.66;
      break;
    case SubjectInFrame.OuterTop:
      targetY = 0.66;
      break;
    case SubjectInFrame.OuterBottom:
      targetY = -0.66;
      break;
  }

  return Math.pow(ndcX - targetX, 2) + Math.pow(ndcY - targetY, 2);
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

  if (cameraSpace.z <= 0) return 1000; // Large penalty for being behind camera

  const fov = 2 * Math.atan(24 / (2 * camera.focalLength));
  const aspectRatio = camera.aspectRatio;
  const ndcX =
    cameraSpace.x / (cameraSpace.z * Math.tan(fov / 2)) / aspectRatio;
  const ndcY = cameraSpace.y / (cameraSpace.z * Math.tan(fov / 2));

  const outsideView = Math.max(0, Math.abs(ndcX) - 1, Math.abs(ndcY) - 1);

  return outsideView * outsideView * 100; // Quadratic penalty for being outside view
};
