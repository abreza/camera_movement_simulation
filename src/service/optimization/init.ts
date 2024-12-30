import * as THREE from "three";

import {
  CinematographyInstruction,
  CameraParameters,
  MovementScale,
  CameraTranslationMovement,
  CameraRotationMovement,
} from "../simulation/types";
import { SubjectInfo } from "../subjects/types";
import { getEasedTime } from "./movementEasing";
import {
  MOVEMENT_SCALE_FACTORS,
  DEFAULT_FOCAL_LENGTH,
  DEFAULT_ASPECT_RATIO,
} from "./constants";

export const initCameraParameters = (
  instruction: CinematographyInstruction,
  startCameraParameter: CameraParameters | undefined,
  subjectInfo: SubjectInfo | undefined
): CameraParameters[] => {
  const frameCount = instruction.maxFrameCount;
  const frames: CameraParameters[] = [];

  if (!subjectInfo?.frames?.length) {
    return frames;
  }

  let initialPosition: THREE.Vector3;
  let initialRotation: THREE.Euler;

  if (startCameraParameter) {
    initialPosition = startCameraParameter.position.clone();
    initialRotation = startCameraParameter.rotation.clone();
  } else {
    initialPosition = new THREE.Vector3(0, 2, -5);
    initialRotation = new THREE.Euler(0, 0, 0);
  }

  for (let i = 0; i < frameCount; i++) {
    const t = i / (frameCount - 1);
    const easedT = getEasedTime(t, instruction.movementEasing);

    const position = initialPosition.clone();
    const rotation = initialRotation.clone();

    if (instruction.movement.translation) {
      const scale =
        MOVEMENT_SCALE_FACTORS[
          instruction.movement.translation.scale || MovementScale.Full
        ];
      switch (instruction.movement.translation.type) {
        case CameraTranslationMovement.TruckLeft:
          position.x -= scale * easedT;
          break;
        case CameraTranslationMovement.TruckRight:
          position.x += scale * easedT;
          break;
        case CameraTranslationMovement.PedestalUp:
          position.y += scale * easedT;
          break;
        case CameraTranslationMovement.PedestalDown:
          position.y -= scale * easedT;
          break;
      }
    }

    if (instruction.movement.rotation) {
      const scale =
        MOVEMENT_SCALE_FACTORS[
          instruction.movement.rotation.scale || MovementScale.Full
        ];
      switch (instruction.movement.rotation.type) {
        case CameraRotationMovement.PanLeft:
          rotation.y += scale * Math.PI * easedT;
          break;
        case CameraRotationMovement.PanRight:
          rotation.y -= scale * Math.PI * easedT;
          break;
        case CameraRotationMovement.TiltUp:
          rotation.x += scale * Math.PI * 0.5 * easedT;
          break;
        case CameraRotationMovement.TiltDown:
          rotation.x -= scale * Math.PI * 0.5 * easedT;
          break;
      }
    }

    frames.push({
      position: position,
      rotation: rotation,
      focalLength: DEFAULT_FOCAL_LENGTH,
      aspectRatio: DEFAULT_ASPECT_RATIO,
    });
  }

  return frames;
};
