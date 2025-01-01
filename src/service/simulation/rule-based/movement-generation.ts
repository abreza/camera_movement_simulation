import * as THREE from "three";
import {
  CameraParameters,
  CinematographyInstruction,
  Scale,
  CameraTranslationMovement,
  CameraRotationMovement,
  CameraZoomMovement,
} from "../instruction/types";
import { getEasedTime } from "../instruction/helpers/movement-easing";
import { SCALE_FACTORS } from "../instruction/constants";

export const generateMovement = (
  start: CameraParameters,
  instruction: CinematographyInstruction
): CameraParameters[] => {
  const frames: CameraParameters[] = [];
  if (!instruction.movement || !instruction.frameCount) {
    return [start];
  }

  for (let i = 0; i < instruction.frameCount; i++) {
    frames.push({
      position: start.position.clone(),
      rotation: start.rotation.clone(),
      focalLength: start.focalLength,
      aspectRatio: start.aspectRatio,
    });
  }

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

    for (let i = 0; i < instruction.frameCount; i++) {
      const t = i / (instruction.frameCount - 1);
      const easedT = getEasedTime(t, instruction.movementEasing);
      frames[i].position.add(translationVector.clone().multiplyScalar(easedT));
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

    for (let i = 0; i < instruction.frameCount; i++) {
      const t = i / (instruction.frameCount - 1);
      const easedT = getEasedTime(t, instruction.movementEasing);
      frames[i].rotation.x += rotationEuler.x * easedT;
      frames[i].rotation.y += rotationEuler.y * easedT;
      frames[i].rotation.z += rotationEuler.z * easedT;
    }
  }

  if (instruction.movement.zoom) {
    const { type, scale = Scale.Full } = instruction.movement.zoom;
    const movementScale = SCALE_FACTORS[scale];
    const initialFocalLength = start.focalLength;
    let targetFocalLength = initialFocalLength;

    switch (type) {
      case CameraZoomMovement.ZoomIn:
        targetFocalLength = initialFocalLength * (1 + movementScale);
        break;
      case CameraZoomMovement.ZoomOut:
        targetFocalLength = initialFocalLength * (1 - movementScale * 0.5);
        break;
    }

    for (let i = 0; i < instruction.frameCount; i++) {
      const t = i / (instruction.frameCount - 1);
      const easedT = getEasedTime(t, instruction.movementEasing);
      frames[i].focalLength =
        initialFocalLength + (targetFocalLength - initialFocalLength) * easedT;
    }
  }

  return frames;
};
