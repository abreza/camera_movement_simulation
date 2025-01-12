import * as THREE from "three";
import { CameraParameters } from "../instruction/types";
import { SubjectInfo, SubjectFrame } from "../../subjects/types";

const getFrontVector = (rotation: THREE.Euler): THREE.Vector3 => {
  const direction = new THREE.Vector3(0, 0, -1);
  const rotationMatrix = new THREE.Matrix4();
  rotationMatrix.makeRotationFromEuler(rotation);
  return direction.applyMatrix4(rotationMatrix).normalize();
};

const interpolateNormal = (
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

const interpolateSubjectAware = (
  start: CameraParameters,
  end: CameraParameters,
  startSubject: SubjectFrame,
  currentSubject: SubjectFrame,
  endSubject: SubjectFrame,
  t: number
): CameraParameters => {
  const startParams = getSubjectRelativeParameters(start, startSubject);
  const endParams = getSubjectRelativeParameters(end, endSubject);

  const interpolatedDistance =
    startParams.distance + (endParams.distance - startParams.distance) * t;
  const interpolatedAngle =
    startParams.relativeAngle +
    (endParams.relativeAngle - startParams.relativeAngle) * t;

  const subjectFrontVector = getFrontVector(currentSubject.rotation);
  const rightVector = new THREE.Vector3(1, 0, 0).applyEuler(
    currentSubject.rotation
  );

  const cameraOffset = new THREE.Vector3();
  cameraOffset
    .copy(subjectFrontVector)
    .multiplyScalar(Math.cos(interpolatedAngle))
    .add(rightVector.multiplyScalar(Math.sin(interpolatedAngle)));

  const interpolatedPosition = currentSubject.position
    .clone()
    .add(cameraOffset.multiplyScalar(interpolatedDistance));

  const lookAtMatrix = new THREE.Matrix4();
  lookAtMatrix.lookAt(
    interpolatedPosition,
    currentSubject.position,
    new THREE.Vector3(0, 1, 0)
  );
  const interpolatedRotation = new THREE.Euler().setFromRotationMatrix(
    lookAtMatrix
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

export const interpolateParameters = (
  start: CameraParameters,
  end: CameraParameters,
  t: number,
  subjectAwareInterpolation: boolean = false,
  subjectInfo?: SubjectInfo
): CameraParameters => {
  if (subjectAwareInterpolation && subjectInfo?.frames) {
    const frameIndex = Math.floor(t * (subjectInfo.frames.length - 1));
    return interpolateSubjectAware(
      start,
      end,
      subjectInfo.frames[0],
      subjectInfo.frames[frameIndex],
      subjectInfo.frames[subjectInfo.frames.length - 1],
      t
    );
  }

  return interpolateNormal(start, end, t);
};
