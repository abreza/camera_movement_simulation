import * as THREE from "three";
import {
  CameraParameters,
  CameraSubjectDistance,
  DistanceConstraint,
  MovementEasing,
  Scale,
} from "../instruction/types";
import { SCALE_FACTORS } from "../instruction/constants";
import { getEasedTime } from "../instruction/helpers/movement-easing";
import { SubjectInfo } from "../../subjects/types";

const calculateDistanceToSubject = (
  cameraPosition: THREE.Vector3,
  subjectPosition: THREE.Vector3
): number => {
  return cameraPosition.distanceTo(subjectPosition);
};

const getTargetDistance = (
  initialDistance: number,
  constraint: DistanceConstraint
): number => {
  const { type, scale = Scale.Full } = constraint;
  const movementScale = SCALE_FACTORS[scale];

  switch (type) {
    case CameraSubjectDistance.DollyIn:
      return initialDistance * (1 - movementScale * 0.5);
    case CameraSubjectDistance.DollyOut:
      return initialDistance * (1 + movementScale);
    case CameraSubjectDistance.Static:
    default:
      return initialDistance;
  }
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

export const applyDistanceConstraint = (
  frames: CameraParameters[],
  subjectInfo: SubjectInfo,
  constraint: DistanceConstraint,
  movementEasing: MovementEasing
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

  const targetDistance = getTargetDistance(initialDistance, constraint);

  for (let i = 0; i < frames.length; i++) {
    const t = i / (frames.length - 1);
    const easedT = getEasedTime(t, movementEasing);

    const currentSubjectFrame =
      subjectInfo.frames[Math.min(i, subjectInfo.frames.length - 1)];

    const currentDistance =
      initialDistance + (targetDistance - initialDistance) * easedT;

    updatedFrames[i].position = adjustCameraPosition(
      frames[i],
      currentSubjectFrame.position,
      currentDistance
    );
  }

  return updatedFrames;
};
