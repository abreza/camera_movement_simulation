import * as THREE from "three";
import {
  CameraParameters,
  CinematographyInstruction,
  Scale,
  CameraTranslationMovement,
  CameraRotationMovement,
  CameraZoomMovement,
} from "../instruction/types";
import { SCALE_FACTORS } from "../instruction/constants";
import { getEasedTime } from "../instruction/helpers/movement-easing";

export const interpolateParameters = (
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

export const applyMovement = (
  frames: CameraParameters[],
  instruction: CinematographyInstruction,
  endSetupBlend: number = 0
): CameraParameters[] => {
  if (!instruction.movement || frames.length === 0) {
    return frames;
  }

  const frameCount = frames.length;
  const updatedFrames = frames.map((frame) => ({
    position: frame.position.clone(),
    rotation: frame.rotation.clone(),
    focalLength: frame.focalLength,
    aspectRatio: frame.aspectRatio,
  }));

  if (instruction.movement.translation) {
    const { type, scale = Scale.Full } = instruction.movement.translation;
    const movementScale = SCALE_FACTORS[scale];
    const translationVector = new THREE.Vector3();

    switch (type) {
      case CameraTranslationMovement.TruckLeft:
        translationVector.x = -5 * movementScale;
        break;
      case CameraTranslationMovement.TruckRight:
        translationVector.x = 5 * movementScale;
        break;
      case CameraTranslationMovement.PedestalUp:
        translationVector.y = 3 * movementScale;
        break;
      case CameraTranslationMovement.PedestalDown:
        translationVector.y = -3 * movementScale;
        break;
    }

    for (let i = 0; i < frameCount; i++) {
      const t = i / (frameCount - 1);
      const easedT = getEasedTime(t, instruction.movementEasing);
      const movement = translationVector
        .clone()
        .multiplyScalar(easedT * (1 - endSetupBlend));
      updatedFrames[i].position.add(movement);
    }
  }

  if (instruction.movement.rotation) {
    const { type, scale = Scale.Full } = instruction.movement.rotation;
    const movementScale = SCALE_FACTORS[scale];
    const rotationEuler = new THREE.Euler();

    switch (type) {
      case CameraRotationMovement.PanLeft:
        rotationEuler.y = Math.PI * movementScale;
        break;
      case CameraRotationMovement.PanRight:
        rotationEuler.y = -Math.PI * movementScale;
        break;
      case CameraRotationMovement.TiltUp:
        rotationEuler.x = Math.PI * 0.5 * movementScale;
        break;
      case CameraRotationMovement.TiltDown:
        rotationEuler.x = -Math.PI * 0.5 * movementScale;
        break;
    }

    for (let i = 0; i < frameCount; i++) {
      const t = i / (frameCount - 1);
      const easedT = getEasedTime(t, instruction.movementEasing);
      const rotationAmount = easedT * (1 - endSetupBlend);
      updatedFrames[i].rotation.x += rotationEuler.x * rotationAmount;
      updatedFrames[i].rotation.y += rotationEuler.y * rotationAmount;
      updatedFrames[i].rotation.z += rotationEuler.z * rotationAmount;
    }
  }

  if (instruction.movement.zoom) {
    const { type, scale = Scale.Full } = instruction.movement.zoom;
    const movementScale = SCALE_FACTORS[scale];
    const initialFocalLength = frames[0].focalLength;
    let targetFocalLength = initialFocalLength;

    switch (type) {
      case CameraZoomMovement.ZoomIn:
        targetFocalLength = initialFocalLength * (1 + movementScale);
        break;
      case CameraZoomMovement.ZoomOut:
        targetFocalLength = initialFocalLength * (1 - movementScale * 0.5);
        break;
    }

    for (let i = 0; i < frameCount; i++) {
      const t = i / (frameCount - 1);
      const easedT = getEasedTime(t, instruction.movementEasing);
      const zoomAmount = easedT * (1 - endSetupBlend);
      updatedFrames[i].focalLength =
        initialFocalLength +
        (targetFocalLength - initialFocalLength) * zoomAmount;
    }
  }

  return updatedFrames;
};
