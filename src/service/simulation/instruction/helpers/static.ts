import * as THREE from "three";
import {
  CameraParameters,
  CameraVerticalAngle,
  ShotSize,
  SubjectView,
} from "../types";

export const getVerticalAngle = (
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

export const getDesiredVerticalAngle = (angle: CameraVerticalAngle): number => {
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

export const getDesiredDistance = (
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

export const getDesiredHorizontalAngle = (view: SubjectView): number => {
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
