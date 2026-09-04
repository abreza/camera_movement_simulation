import * as THREE from "three";
import {
  CameraParameters,
  InterpolationDynamic,
} from "../instruction/types";
import { SubjectFrame } from "../../subjects/types";

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

const getSubjectLocalOffset = (
  camera: CameraParameters,
  subject: SubjectFrame
): THREE.Vector3 => {
  const inverseSubjectRotation = new THREE.Quaternion()
    .setFromEuler(subject.rotation)
    .invert();
  return camera.position
    .clone()
    .sub(subject.position)
    .applyQuaternion(inverseSubjectRotation);
};

const getSubjectLocalCameraRotation = (
  camera: CameraParameters,
  subject: SubjectFrame
): THREE.Quaternion => {
  return new THREE.Quaternion()
    .setFromEuler(subject.rotation)
    .invert()
    .multiply(new THREE.Quaternion().setFromEuler(camera.rotation));
};

const slerpDirection = (
  start: THREE.Vector3,
  end: THREE.Vector3,
  t: number
): THREE.Vector3 => {
  const startDirection = start.clone().normalize();
  const endDirection = end.clone().normalize();
  if (startDirection.distanceToSquared(endDirection) < 1e-12) {
    return startDirection;
  }
  const directionDelta = new THREE.Quaternion().setFromUnitVectors(
    startDirection,
    endDirection
  );
  const interpolatedDelta = new THREE.Quaternion().slerp(
    directionDelta,
    t
  );
  return startDirection.applyQuaternion(interpolatedDelta).normalize();
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
  const startLocalOffset = getSubjectLocalOffset(start, startSubject);
  const endLocalOffset = getSubjectLocalOffset(end, endSubject);
  const startDistance = startLocalOffset.length();
  const endDistance = endLocalOffset.length();
  const interpolatedDistance =
    startDistance + (endDistance - startDistance) * t;
  const localDirection = rotationInterpolation
    ? slerpDirection(startLocalOffset, endLocalOffset, t)
    : startLocalOffset.clone().normalize();
  const currentSubjectQuaternion = new THREE.Quaternion().setFromEuler(
    currentSubject.rotation
  );
  const interpolatedPosition = currentSubject.position
    .clone()
    .add(
      localDirection
        .multiplyScalar(interpolatedDistance)
        .applyQuaternion(currentSubjectQuaternion)
    );

  const startLocalCameraRotation = getSubjectLocalCameraRotation(
    start,
    startSubject
  );
  const endLocalCameraRotation = getSubjectLocalCameraRotation(end, endSubject);
  const interpolatedLocalCameraRotation = rotationInterpolation
    ? startLocalCameraRotation.clone().slerp(endLocalCameraRotation, t)
    : startLocalCameraRotation;
  const interpolatedRotation = new THREE.Euler().setFromQuaternion(
    currentSubjectQuaternion
      .clone()
      .multiply(interpolatedLocalCameraRotation)
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

export const interpolateCameraParameters = (
  startParams: CameraParameters,
  endParams: CameraParameters,
  instructionDynamic: InterpolationDynamic,
  subjectFrames: SubjectFrame[],
  easedT: number[],
  rotationInterpolation: boolean = true
): CameraParameters[] => {
  const frames: CameraParameters[] = [];
  const subjectAwareInterpolation =
    instructionDynamic.subjectAwareInterpolation;
  const startSubjectFrame = subjectFrames[0];
  const endSubjectFrame = subjectFrames[subjectFrames.length - 1];
  const fullEndParams: CameraParameters = { ...startParams, ...endParams };

  easedT.forEach((t, i) => {
    const currentSubjectFrame =
      subjectFrames[Math.min(i, subjectFrames.length - 1)];
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

    frames.push(frameParams);
  });
  return frames;
};
