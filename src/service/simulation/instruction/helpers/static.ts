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
  let meanAngle: number;
  switch (angle) {
    case CameraVerticalAngle.Low:
      meanAngle = Math.PI * 0.7;
      break;
    case CameraVerticalAngle.Eye:
      meanAngle = Math.PI * 0.5;
      break;
    case CameraVerticalAngle.High:
      meanAngle = Math.PI * 0.3;
      break;
    case CameraVerticalAngle.Overhead:
      meanAngle = Math.PI * 0.1;
      break;
    case CameraVerticalAngle.BirdsEye:
      // An exactly vertical look direction is collinear with the camera's
      // world-up vector, making lookAt orientation (and framing) singular.
      meanAngle = Math.PI / 60;
      break;
    default:
      meanAngle = Math.PI * 0.5;
  }

  return meanAngle;
};

const SHOT_SIZE_DISTANCE_FACTORS = {
  [ShotSize.ExtremeCloseUp]: 1.5,
  [ShotSize.CloseUp]: 2.5,
  [ShotSize.MediumCloseUp]: 3.5,
  [ShotSize.MediumShot]: 5,
  [ShotSize.FullShot]: 7,
  [ShotSize.LongShot]: 10,
  [ShotSize.VeryLongShot]: 15,
  [ShotSize.ExtremeLongShot]: 20,
};

export const getDesiredDistance = (
  shotSize: ShotSize,
  subjectDimensions: { height: number }
): number => {
  const meanDistance =
    subjectDimensions.height * (SHOT_SIZE_DISTANCE_FACTORS[shotSize] || 5);

  return Math.max(0.1, meanDistance);
};

export const getDesiredHorizontalAngle = (view: SubjectView): number => {
  let meanAngle: number;
  switch (view) {
    case SubjectView.Front:
      meanAngle = 0;
      break;
    case SubjectView.Back:
      meanAngle = Math.PI;
      break;
    case SubjectView.Left:
      meanAngle = -Math.PI * 0.5;
      break;
    case SubjectView.Right:
      meanAngle = Math.PI * 0.5;
      break;
    case SubjectView.ThreeQuarterFrontLeft:
      meanAngle = -Math.PI * 0.25;
      break;
    case SubjectView.ThreeQuarterFrontRight:
      meanAngle = Math.PI * 0.25;
      break;
    case SubjectView.ThreeQuarterBackLeft:
      meanAngle = -Math.PI * 0.75;
      break;
    case SubjectView.ThreeQuarterBackRight:
      meanAngle = Math.PI * 0.75;
      break;
    default:
      meanAngle = 0;
  }
  return meanAngle;
};
