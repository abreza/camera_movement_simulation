import * as THREE from "three";
import {
  CameraSubjectDistanceMovement,
  MovementScale,
  CameraParameters,
  CameraRotationMovement,
  CameraTranslationMovement,
  CameraZoomMovement,
  CinematographyInstruction,
} from "@/service/simulation/types";
import { SubjectInfo } from "@/service/subjects/types";
import { MOVEMENT_SCALE_FACTORS } from "../constants";
import { getEasedTime } from "../movementEasing";

export const calculateCameraSubjectDistanceLoss = (
  distance: { type: CameraSubjectDistanceMovement; scale?: MovementScale },
  allCameraParameters: CameraParameters[],
  subjectInfo: SubjectInfo
): number => {
  if (!subjectInfo.frames?.length) {
    return 0;
  }

  const scale = MOVEMENT_SCALE_FACTORS[distance.scale || MovementScale.Full];
  const frameCount = allCameraParameters.length;
  let totalLoss = 0;

  const initialDistance = allCameraParameters[0].position.distanceTo(
    subjectInfo.frames[0].position
  );
  const targetFinalDistance =
    distance.type === CameraSubjectDistanceMovement.Static
      ? initialDistance
      : distance.type === CameraSubjectDistanceMovement.DollyIn
      ? initialDistance * (1 - scale)
      : initialDistance * (1 + scale);

  for (let i = 0; i < frameCount; i++) {
    const t = i / (frameCount - 1);
    const subjectFrame =
      subjectInfo.frames[Math.min(i, subjectInfo.frames.length - 1)];
    const currentDistance = allCameraParameters[i].position.distanceTo(
      subjectFrame.position
    );

    const desiredDistance =
      initialDistance + (targetFinalDistance - initialDistance) * t;

    totalLoss += Math.pow(currentDistance - desiredDistance, 2);
  }

  return totalLoss / frameCount;
};

export const calculateTranslationMovementLoss = (
  movement: { type: CameraTranslationMovement; scale?: MovementScale },
  allCameraParameters: CameraParameters[],
  instruction: CinematographyInstruction
): number => {
  const frameCount = allCameraParameters.length;
  const scale = MOVEMENT_SCALE_FACTORS[movement.scale || MovementScale.Full];
  let totalLoss = 0;

  const initialPosition = allCameraParameters[0].position.clone();
  const targetMovement = new THREE.Vector3();

  switch (movement.type) {
    case CameraTranslationMovement.TruckLeft:
      targetMovement.x = -scale * 5;
      break;
    case CameraTranslationMovement.TruckRight:
      targetMovement.x = scale * 5;
      break;
    case CameraTranslationMovement.PedestalUp:
      targetMovement.y = scale * 3;
      break;
    case CameraTranslationMovement.PedestalDown:
      targetMovement.y = -scale * 3;
      break;
  }

  for (let i = 0; i < frameCount; i++) {
    const t = i / (frameCount - 1);
    const easedT = getEasedTime(t, instruction.movementEasing);

    const expectedPosition = initialPosition
      .clone()
      .add(targetMovement.clone().multiplyScalar(easedT));

    const currentPosition = allCameraParameters[i].position;
    totalLoss += expectedPosition.distanceToSquared(currentPosition);
  }

  return totalLoss / frameCount;
};

export const calculateRotationMovementLoss = (
  movement: { type: CameraRotationMovement; scale?: MovementScale },
  allCameraParameters: CameraParameters[],
  instruction: CinematographyInstruction
): number => {
  const frameCount = allCameraParameters.length;
  const scale = MOVEMENT_SCALE_FACTORS[movement.scale || MovementScale.Full];
  let totalLoss = 0;

  const initialRotation = allCameraParameters[0].rotation.clone();
  const targetRotation = new THREE.Euler();

  switch (movement.type) {
    case CameraRotationMovement.PanLeft:
      targetRotation.y = scale * Math.PI;
      break;
    case CameraRotationMovement.PanRight:
      targetRotation.y = -scale * Math.PI;
      break;
    case CameraRotationMovement.TiltUp:
      targetRotation.x = scale * Math.PI * 0.5;
      break;
    case CameraRotationMovement.TiltDown:
      targetRotation.x = -scale * Math.PI * 0.5;
      break;
  }

  for (let i = 0; i < frameCount; i++) {
    const t = i / (frameCount - 1);
    const easedT = getEasedTime(t, instruction.movementEasing);

    const expectedRotation = new THREE.Euler(
      initialRotation.x + targetRotation.x * easedT,
      initialRotation.y + targetRotation.y * easedT,
      initialRotation.z + targetRotation.z * easedT
    );

    const currentRotation = allCameraParameters[i].rotation;
    totalLoss +=
      Math.pow(expectedRotation.x - currentRotation.x, 2) +
      Math.pow(expectedRotation.y - currentRotation.y, 2) +
      Math.pow(expectedRotation.z - currentRotation.z, 2);
  }

  return totalLoss / frameCount;
};

export const calculateZoomMovementLoss = (
  movement: { type: CameraZoomMovement; scale?: MovementScale },
  allCameraParameters: CameraParameters[],
  instruction: CinematographyInstruction
): number => {
  const frameCount = allCameraParameters.length;
  const scale = MOVEMENT_SCALE_FACTORS[movement.scale || MovementScale.Full];
  let totalLoss = 0;

  const initialFocalLength = allCameraParameters[0].focalLength;
  let targetFocalLength = initialFocalLength;

  switch (movement.type) {
    case CameraZoomMovement.ZoomIn:
      targetFocalLength = initialFocalLength * (1 + scale);
      break;
    case CameraZoomMovement.ZoomOut:
      targetFocalLength = initialFocalLength * (1 - scale * 0.5);
      break;
  }

  for (let i = 0; i < frameCount; i++) {
    const t = i / (frameCount - 1);
    const easedT = getEasedTime(t, instruction.movementEasing);

    const expectedFocalLength =
      initialFocalLength + (targetFocalLength - initialFocalLength) * easedT;

    const currentFocalLength = allCameraParameters[i].focalLength;
    totalLoss += Math.pow(expectedFocalLength - currentFocalLength, 2);
  }

  return totalLoss / frameCount;
};
