import * as THREE from "three";

import {
  CameraParameters,
  CameraRotationMovement,
  CameraSubjectDistanceMovement,
  CameraTranslationMovement,
  CameraVerticalAngle,
  CameraZoomMovement,
  CinematographyInstruction,
  MovementScale,
  ShotSize,
  SubjectFrame,
  SubjectInfo,
  SubjectView,
  VisibilityConstraint,
} from "@/types/simulation";
import { getEasedTime } from "./movementEasing";
import { getLookAtAngle } from "./utils";

export const calculateFramesForInstruction = (
  instruction: CinematographyInstruction,
  startParams?: CameraParameters,
  subjectInfo?: SubjectInfo
): CameraParameters[] => {
  const frames: CameraParameters[] = [];

  const initialParams =
    startParams || calculateInitialCameraParams(instruction, subjectInfo);

  if (Object.values(instruction.movement).every((m) => m === undefined)) {
    return Array(instruction.frameCount).fill(initialParams);
  }

  for (let frame = 0; frame < instruction.frameCount; frame++) {
    const t = getEasedTime(
      frame / (instruction.frameCount - 1),
      instruction.movementEasing
    );

    const frameParams = calculateFrameParams(
      instruction,
      initialParams,
      t,
      subjectInfo?.frames?.[frame]
    );

    frames.push(frameParams);
  }

  return frames;
};

const calculateInitialCameraParams = (
  instruction: CinematographyInstruction,
  subjectInfo?: SubjectInfo
): CameraParameters => {
  const subjectFrame = subjectInfo?.frames?.[0];
  const subjectPosition = subjectFrame?.position || new THREE.Vector3();
  const subject = subjectInfo?.subject;

  let cameraPosition = new THREE.Vector3();
  const distance = instruction.initialSetup.distance || 5;

  switch (instruction.initialSetup.subjectView) {
    case SubjectView.Front:
      cameraPosition.set(0, 0, distance);
      break;
    case SubjectView.Back:
      cameraPosition.set(0, 0, -distance);
      break;
    case SubjectView.Left:
      cameraPosition.set(-distance, 0, 0);
      break;
    case SubjectView.Right:
      cameraPosition.set(distance, 0, 0);
      break;
    case SubjectView.ThreeQuarterLeft:
      cameraPosition.set(
        -distance * Math.cos(Math.PI / 4),
        0,
        distance * Math.sin(Math.PI / 4)
      );
      break;
    case SubjectView.ThreeQuarterRight:
      cameraPosition.set(
        distance * Math.cos(Math.PI / 4),
        0,
        distance * Math.sin(Math.PI / 4)
      );
      break;
    default:
      cameraPosition.set(0, 0, distance);
  }

  let verticalOffset = 0;
  switch (instruction.initialSetup.cameraAngle) {
    case CameraVerticalAngle.Low:
      verticalOffset = -distance * 0.3;
      break;
    case CameraVerticalAngle.Eye:
      verticalOffset = 0;
      break;
    case CameraVerticalAngle.High:
      verticalOffset = distance * 0.3;
      break;
    case CameraVerticalAngle.Overhead:
      verticalOffset = distance * 0.7;
      break;
    case CameraVerticalAngle.BirdsEye:
      verticalOffset = distance;
      break;
  }
  cameraPosition.y += verticalOffset;

  if (subject && instruction.initialSetup.shotSize) {
    const subjectHeight = subject.dimensions.height;
    let distanceMultiplier = 1;
    switch (instruction.initialSetup.shotSize) {
      case ShotSize.CloseUp:
        distanceMultiplier = 0.5;
        break;
      case ShotSize.MediumShot:
        distanceMultiplier = 1;
        break;
      case ShotSize.LongShot:
        distanceMultiplier = 2;
        break;
    }
    cameraPosition.multiplyScalar(distanceMultiplier * (subjectHeight / 2));
  }

  cameraPosition.add(subjectPosition);

  let lookAtPoint = new THREE.Vector3();
  if (instruction.initialSetup.focusPoint) {
    lookAtPoint = instruction.initialSetup.focusPoint;
  } else if (
    instruction.constraints?.visibility ===
      VisibilityConstraint.VisibleAtAllTimes ||
    instruction.constraints?.visibility ===
      VisibilityConstraint.VisibleAtStart ||
    instruction.movement.distance?.type ===
      CameraSubjectDistanceMovement.DollyIn ||
    instruction.movement.distance?.type ===
      CameraSubjectDistanceMovement.DollyOut ||
    instruction.movement.rotation?.type === CameraRotationMovement.ArcLeft ||
    instruction.movement.rotation?.type === CameraRotationMovement.ArcRight
  ) {
    lookAtPoint = subjectPosition;
  }

  const rotation = getLookAtAngle(cameraPosition, lookAtPoint);

  return {
    position: cameraPosition,
    rotation,
    focalLength: 50,
    aspectRatio: 16 / 9,
  };
};

const calculateFrameParams = (
  instruction: CinematographyInstruction,
  initialParams: CameraParameters,
  t: number,
  currentSubjectFrame?: SubjectFrame
): CameraParameters => {
  let position = initialParams.position.clone();
  let rotation = initialParams.rotation.clone();
  let focalLength = initialParams.focalLength;

  const subjectPosition = currentSubjectFrame?.position || new THREE.Vector3();

  if (instruction.movement.translation) {
    const scale = getMovementScale(instruction.movement.translation.scale);
    const translationDistance = 2 * scale;

    switch (instruction.movement.translation.type) {
      case CameraTranslationMovement.TruckLeft:
        position.x -= translationDistance * t;
        break;
      case CameraTranslationMovement.TruckRight:
        position.x += translationDistance * t;
        break;
      case CameraTranslationMovement.PedestalUp:
        position.y += translationDistance * t;
        break;
      case CameraTranslationMovement.PedestalDown:
        position.y -= translationDistance * t;
        break;
    }
  }

  if (instruction.movement.distance) {
    const scale = getMovementScale(instruction.movement.distance.scale);
    const dollyDistance = 3 * scale;
    const direction = new THREE.Vector3()
      .subVectors(position, subjectPosition)
      .normalize();

    switch (instruction.movement.distance.type) {
      case CameraSubjectDistanceMovement.DollyIn:
        position.sub(direction.multiplyScalar(dollyDistance * t));
        break;
      case CameraSubjectDistanceMovement.DollyOut:
        position.add(direction.multiplyScalar(dollyDistance * t));
        break;
    }
  }

  if (instruction.movement.rotation) {
    const scale = getMovementScale(instruction.movement.rotation.scale);
    const rotationAngle = Math.PI * 0.5 * scale;

    switch (instruction.movement.rotation.type) {
      case CameraRotationMovement.PanLeft:
        rotation.y += rotationAngle * t;
        break;
      case CameraRotationMovement.PanRight:
        rotation.y -= rotationAngle * t;
        break;
      case CameraRotationMovement.TiltUp:
        rotation.x += rotationAngle * t;
        break;
      case CameraRotationMovement.TiltDown:
        rotation.x -= rotationAngle * t;
        break;
      case CameraRotationMovement.ArcLeft:
      case CameraRotationMovement.ArcRight: {
        const radius = position.distanceTo(subjectPosition);
        const startAngle = Math.atan2(
          position.z - subjectPosition.z,
          position.x - subjectPosition.x
        );
        const arcAngle =
          (instruction.movement.rotation.type === CameraRotationMovement.ArcLeft
            ? 1
            : -1) * rotationAngle;
        const newAngle = startAngle + arcAngle * t;

        position.x = subjectPosition.x + radius * Math.cos(newAngle);
        position.z = subjectPosition.z + radius * Math.sin(newAngle);
        rotation = getLookAtAngle(position, subjectPosition);
        break;
      }
    }
  }

  if (instruction.movement.zoom) {
    const scale = getMovementScale(instruction.movement.zoom.scale);
    const zoomRange = 35 * scale;

    switch (instruction.movement.zoom.type) {
      case CameraZoomMovement.ZoomIn:
        focalLength += zoomRange * t;
        break;
      case CameraZoomMovement.ZoomOut:
        focalLength = Math.max(12, focalLength - zoomRange * t);
        break;
    }
  }

  if (instruction.constraints) {
    if (instruction.constraints.distance) {
      const distanceToSubject = position.distanceTo(subjectPosition);
      if (distanceToSubject < instruction.constraints.distance.minDistance) {
        const direction = new THREE.Vector3()
          .subVectors(position, subjectPosition)
          .normalize();
        position
          .copy(subjectPosition)
          .add(
            direction.multiplyScalar(
              instruction.constraints.distance.minDistance
            )
          );
      } else if (
        distanceToSubject > instruction.constraints.distance.maxDistance
      ) {
        const direction = new THREE.Vector3()
          .subVectors(position, subjectPosition)
          .normalize();
        position
          .copy(subjectPosition)
          .add(
            direction.multiplyScalar(
              instruction.constraints.distance.maxDistance
            )
          );
      }
    }
  }

  return {
    position,
    rotation,
    focalLength,
    aspectRatio: initialParams.aspectRatio,
  };
};

const getMovementScale = (scale?: MovementScale): number => {
  switch (scale) {
    case MovementScale.Short:
      return 0.3;
    case MovementScale.Medium:
      return 0.6;
    case MovementScale.Full:
      return 1.0;
    default:
      return 0.6;
  }
};
