import * as THREE from "three";
import { CameraParameters, MovementEasing } from "../instruction/types";
import { SubjectInfo } from "../../subjects/types";

const calculateDistanceToSubject = (
  cameraPosition: THREE.Vector3,
  subjectPosition: THREE.Vector3
): number => {
  return cameraPosition.distanceTo(subjectPosition);
};

const adjustCameraPosition = (
  camera: CameraParameters,
  subjectPosition: THREE.Vector3,
  targetDistance: number
): THREE.Vector3 => {
  const direction = new THREE.Vector3()
    .subVectors(camera.position, subjectPosition)
    .normalize();

  return subjectPosition.clone().add(direction.multiplyScalar(targetDistance));
};

export const applyStaticDistanceConstraint = (
  frames: CameraParameters[],
  subjectInfo: SubjectInfo
): CameraParameters[] => {
  if (!subjectInfo.frames?.length) {
    return frames;
  }

  const updatedFrames = frames.map((frame) => ({
    position: frame.position.clone(),
    rotation: frame.rotation.clone(),
    focalLength: frame.focalLength,
    aspectRatio: frame.aspectRatio,
  }));

  const initialDistance = calculateDistanceToSubject(
    frames[0].position,
    subjectInfo.frames[0].position
  );

  for (let i = 0; i < frames.length; i++) {
    const currentSubjectFrame =
      subjectInfo.frames[Math.min(i, subjectInfo.frames.length - 1)];

    updatedFrames[i].position = adjustCameraPosition(
      frames[i],
      currentSubjectFrame.position,
      initialDistance
    );
  }

  return updatedFrames;
};
