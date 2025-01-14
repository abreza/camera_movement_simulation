import * as THREE from "three";
import {
  CameraParameters,
  ConstraintsConfig,
  InterpolationDynamic,
} from "../instruction/types";
import { SubjectFrame, SubjectDimensions } from "../../subjects/types";
import { applyConstraintsOnFrame } from "./setup/constraints";

const getFrontVector = (rotation: THREE.Euler): THREE.Vector3 => {
  const direction = new THREE.Vector3(0, 0, -1);
  const rotationMatrix = new THREE.Matrix4();
  rotationMatrix.makeRotationFromEuler(rotation);
  return direction.applyMatrix4(rotationMatrix).normalize();
};

export const normalInterpolate = (
  start: CameraParameters,
  end: CameraParameters,
  t: number
): CameraParameters => {
  const interpolatedPosition = start.position.clone().lerp(end.position, t);

  const startQuaternion = new THREE.Quaternion().setFromEuler(start.rotation);
  const endQuaternion = new THREE.Quaternion().setFromEuler(end.rotation);
  const interpolatedQuaternion = startQuaternion
    .clone()
    .slerp(endQuaternion, t);
  const interpolatedRotation = new THREE.Euler().setFromQuaternion(
    interpolatedQuaternion
  );

  const interpolatedFocalLength =
    start.focalLength + (end.focalLength - start.focalLength) * t;
  const interpolatedAspectRatio =
    start.aspectRatio + (end.aspectRatio - start.aspectRatio) * t;

  return {
    position: interpolatedPosition,
    rotation: interpolatedRotation,
    focalLength: interpolatedFocalLength,
    aspectRatio: interpolatedAspectRatio,
  };
};

const getSubjectRelativeParameters = (
  camera: CameraParameters,
  subject: SubjectFrame
): { distance: number; relativeAngle: number } => {
  const distance = camera.position.distanceTo(subject.position);

  const subjectFrontVector = getFrontVector(subject.rotation);

  const cameraToSubject = camera.position
    .clone()
    .sub(subject.position)
    .normalize();
  const relativeAngle = Math.acos(cameraToSubject.dot(subjectFrontVector));

  return { distance, relativeAngle };
};

export const subjectAwareInterpolate = (
  start: CameraParameters,
  end: CameraParameters,
  startSubject: SubjectFrame,
  currentSubject: SubjectFrame,
  endSubject: SubjectFrame,
  t: number,
  rotationInterpolation: boolean = true
): CameraParameters => {
  const startParams = getSubjectRelativeParameters(start, startSubject);
  const endParams = getSubjectRelativeParameters(end, endSubject);
  let interpolatedPosition: THREE.Vector3;
  let interpolatedRotation: THREE.Euler;

  const interpolatedDistance =
    startParams.distance + (endParams.distance - startParams.distance) * t;

  let directionToSubject: THREE.Vector3;

  if (!rotationInterpolation) {
    directionToSubject = new THREE.Vector3()
      .subVectors(currentSubject.position, start.position)
      .normalize();
  } else {
    const interpolatedAngle =
      startParams.relativeAngle +
      (endParams.relativeAngle - startParams.relativeAngle) * t;
    const rightVector = new THREE.Vector3(1, 0, 0).applyEuler(
      currentSubject.rotation
    );

    directionToSubject = getFrontVector(currentSubject.rotation)
      .multiplyScalar(Math.cos(interpolatedAngle))
      .add(rightVector.multiplyScalar(Math.sin(interpolatedAngle)));

    interpolatedPosition = currentSubject.position
      .clone()
      .add(directionToSubject.multiplyScalar(interpolatedDistance));
  }

  interpolatedPosition = currentSubject.position
    .clone()
    .sub(directionToSubject.multiplyScalar(interpolatedDistance));

  const lookAtMatrix = new THREE.Matrix4();
  lookAtMatrix.lookAt(
    interpolatedPosition,
    currentSubject.position,
    new THREE.Vector3(0, 1, 0)
  );
  interpolatedRotation = new THREE.Euler().setFromRotationMatrix(lookAtMatrix);

  const interpolatedFocalLength =
    start.focalLength + (end.focalLength - start.focalLength) * t;
  const interpolatedAspectRatio =
    start.aspectRatio + (end.aspectRatio - start.aspectRatio) * t;

  return {
    position: interpolatedPosition,
    rotation: interpolatedRotation,
    focalLength: interpolatedFocalLength,
    aspectRatio: interpolatedAspectRatio,
  };
};

export const interpolateCameraParameters = (
  startParams: CameraParameters,
  endParams: CameraParameters,
  instructionDynamic: InterpolationDynamic,
  subjectDimensions: SubjectDimensions,
  subjectFrames: SubjectFrame[],
  easedT: number[],
  rotationInterpolation: boolean = true,
  constraints?: ConstraintsConfig
): CameraParameters[] => {
  const frames: CameraParameters[] = [];
  const subjectAwareInterpolation =
    instructionDynamic.subjectAwareInterpolation;
  const startSubjectFrame = subjectFrames[0];
  const endSubjectFrame = subjectFrames[subjectFrames.length - 1];
  const fullEndParams: CameraParameters = { ...startParams, ...endParams };

  easedT.forEach((t, i) => {
    const currentSubjectFrame = subjectFrames[i];
    const frameParams = subjectAwareInterpolation
      ? subjectAwareInterpolate(
          startParams,
          endParams,
          startSubjectFrame,
          currentSubjectFrame,
          endSubjectFrame,
          t,
          rotationInterpolation
        )
      : normalInterpolate(startParams, fullEndParams, t);

    const prevCameraParams = i > 0 ? frames[i - 1] : startParams;
    const subjectFrameCurrent =
      subjectFrames[Math.min(i, subjectFrames.length - 1)];

    frames.push(
      applyConstraintsOnFrame(
        frameParams,
        prevCameraParams,
        constraints,
        subjectFrameCurrent,
        subjectDimensions
      )
    );
  });
  return frames;
};
