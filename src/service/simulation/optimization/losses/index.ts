import {
  CameraParameters,
  CinematographyInstruction,
  ShotSize,
  SubjectFraming,
} from "../../instruction/types";
import { SubjectInfo } from "../../../subjects/types";
import * as THREE from "three";
import {
  getVerticalAngle,
  getDesiredVerticalAngle,
  getDesiredDistance,
  getDesiredHorizontalAngle,
} from "../../instruction/helpers/static";

const LOSS_SCALE_FACTORS = {
  cameraAngle: 1,
  shotSize: 0.01,
  subjectView: 0.2,
  subjectFraming: 0.3,
  constraints: {
    distance: 0.01,
    visibility: 0.0001,
  },
  movement: {
    translation: 0.05,
    rotation: 0.2,
    zoom: 0.5,
  },
};

const calculateCameraAngleLoss = (
  cameraPos: THREE.Vector3,
  subjectPos: THREE.Vector3,
  desiredAngle: number
): number => {
  const currentAngle = getVerticalAngle(
    { position: cameraPos } as CameraParameters,
    subjectPos
  );
  return Math.pow(currentAngle - desiredAngle, 2);
};

const calculateShotSizeLoss = (
  cameraPos: THREE.Vector3,
  subjectPos: THREE.Vector3,
  desiredDistance: number
): number => {
  const currentDistance = cameraPos.distanceTo(subjectPos);
  return Math.pow(currentDistance - desiredDistance, 2);
};

const calculateSubjectViewLoss = (
  cameraPos: THREE.Vector3,
  subjectPos: THREE.Vector3,
  desiredAngle: number
): number => {
  const direction = new THREE.Vector3().subVectors(cameraPos, subjectPos);
  const currentAngle = Math.atan2(direction.x, direction.z);
  return Math.pow(currentAngle - desiredAngle, 2);
};

const calculateFramingLoss = (
  frame: CameraParameters,
  subjectPos: THREE.Vector3,
  framing: SubjectFraming
): number => {
  // Project subject position onto camera's view plane
  const cameraToSubject = new THREE.Vector3().subVectors(
    subjectPos,
    frame.position
  );
  const viewMatrix = new THREE.Matrix4().makeRotationFromEuler(frame.rotation);
  cameraToSubject.applyMatrix4(viewMatrix);

  // Calculate normalized screen coordinates
  const fov = 2 * Math.atan(24 / (2 * frame.focalLength));
  const screenX =
    (cameraToSubject.x / (cameraToSubject.z * Math.tan(fov / 2))) * 0.5 + 0.5;
  const screenY =
    (cameraToSubject.y /
      ((cameraToSubject.z * Math.tan(fov / 2)) / frame.aspectRatio)) *
      0.5 +
    0.5;

  // Define target positions based on framing
  let targetX = 0.5,
    targetY = 0.5;
  switch (framing.position) {
    case "left":
      targetX = 0.33;
      break;
    case "right":
      targetX = 0.67;
      break;
    case "top":
      targetY = 0.67;
      break;
    case "bottom":
      targetY = 0.33;
      break;
    case "topLeft":
      targetX = 0.33;
      targetY = 0.67;
      break;
    case "topRight":
      targetX = 0.67;
      targetY = 0.67;
      break;
    case "bottomLeft":
      targetX = 0.33;
      targetY = 0.33;
      break;
    case "bottomRight":
      targetX = 0.67;
      targetY = 0.33;
      break;
  }

  return Math.pow(screenX - targetX, 2) + Math.pow(screenY - targetY, 2);
};

const calculateMovementLoss = (
  frames: CameraParameters[],
  instruction: CinematographyInstruction
): Record<string, number> => {
  const losses = {
    translation: 0,
    rotation: 0,
    zoom: 0,
  };

  if (!instruction.movement) return losses;

  const frameCount = frames.length;
  for (let i = 1; i < frameCount; i++) {
    const prevFrame = frames[i - 1];
    const currentFrame = frames[i];

    // Translation movement consistency
    if (instruction.movement.translation) {
      const translation = new THREE.Vector3().subVectors(
        currentFrame.position,
        prevFrame.position
      );
      const expectedDirection = new THREE.Vector3();
      switch (instruction.movement.translation.type) {
        case "truckLeft":
          expectedDirection.set(-1, 0, 0);
          break;
        case "truckRight":
          expectedDirection.set(1, 0, 0);
          break;
        case "pedestalUp":
          expectedDirection.set(0, 1, 0);
          break;
        case "pedestalDown":
          expectedDirection.set(0, -1, 0);
          break;
      }
      losses.translation +=
        1 - Math.abs(translation.normalize().dot(expectedDirection));
    }

    // Rotation movement consistency
    if (instruction.movement.rotation) {
      const rotationDiff = new THREE.Euler(
        currentFrame.rotation.x - prevFrame.rotation.x,
        currentFrame.rotation.y - prevFrame.rotation.y,
        currentFrame.rotation.z - prevFrame.rotation.z
      );
      const expectedRotation = new THREE.Euler();
      switch (instruction.movement.rotation.type) {
        case "panLeft":
          expectedRotation.y = 1;
          break;
        case "panRight":
          expectedRotation.y = -1;
          break;
        case "tiltUp":
          expectedRotation.x = 1;
          break;
        case "tiltDown":
          expectedRotation.x = -1;
          break;
      }
      losses.rotation +=
        1 -
        Math.abs(
          new THREE.Vector3(rotationDiff.x, rotationDiff.y, rotationDiff.z)
            .normalize()
            .dot(
              new THREE.Vector3(
                expectedRotation.x,
                expectedRotation.y,
                expectedRotation.z
              )
            )
        );
    }

    // Zoom movement consistency
    if (instruction.movement.zoom) {
      const zoomRatio = currentFrame.focalLength / prevFrame.focalLength;
      const expectedRatio =
        instruction.movement.zoom.type === "zoomIn" ? 1.1 : 0.9;
      losses.zoom += Math.pow(zoomRatio - expectedRatio, 2);
    }
  }

  return losses;
};

export const calculateTotalLoss = (
  frames: CameraParameters[],
  instruction: CinematographyInstruction,
  subjectInfo?: SubjectInfo
): number => {
  if (!subjectInfo?.frames?.length) return 0;

  let totalLoss = 0;
  const losses: Record<string, number> = {};

  // Initial setup losses
  if (instruction.initialSetup) {
    const firstFrame = frames[0];
    const firstSubjectFrame = subjectInfo.frames[0];

    if (instruction.initialSetup.cameraAngle) {
      losses.initialCameraAngle =
        calculateCameraAngleLoss(
          firstFrame.position,
          firstSubjectFrame.position,
          getDesiredVerticalAngle(instruction.initialSetup.cameraAngle)
        ) * LOSS_SCALE_FACTORS.cameraAngle;
      totalLoss += losses.initialCameraAngle;
    }

    if (instruction.initialSetup.shotSize) {
      losses.initialShotSize =
        calculateShotSizeLoss(
          firstFrame.position,
          firstSubjectFrame.position,
          getDesiredDistance(
            instruction.initialSetup.shotSize,
            subjectInfo.subject.dimensions
          )
        ) * LOSS_SCALE_FACTORS.shotSize;
      totalLoss += losses.initialShotSize;
    }

    if (instruction.initialSetup.subjectView) {
      losses.initialSubjectView =
        calculateSubjectViewLoss(
          firstFrame.position,
          firstSubjectFrame.position,
          getDesiredHorizontalAngle(instruction.initialSetup.subjectView)
        ) * LOSS_SCALE_FACTORS.subjectView;
      totalLoss += losses.initialSubjectView;
    }

    if (instruction.initialSetup.subjectFraming) {
      losses.initialFraming =
        calculateFramingLoss(
          firstFrame,
          firstSubjectFrame.position,
          instruction.initialSetup.subjectFraming
        ) * LOSS_SCALE_FACTORS.subjectFraming;
      totalLoss += losses.initialFraming;
    }
  }

  // End setup losses
  if (instruction.endSetup) {
    const lastFrame = frames[frames.length - 1];
    const lastSubjectFrame = subjectInfo.frames[subjectInfo.frames.length - 1];

    if (instruction.endSetup.cameraAngle) {
      losses.endCameraAngle =
        calculateCameraAngleLoss(
          lastFrame.position,
          lastSubjectFrame.position,
          getDesiredVerticalAngle(instruction.endSetup.cameraAngle)
        ) * LOSS_SCALE_FACTORS.cameraAngle;
      totalLoss += losses.endCameraAngle;
    }

    if (instruction.endSetup.shotSize) {
      losses.endShotSize =
        calculateShotSizeLoss(
          lastFrame.position,
          lastSubjectFrame.position,
          getDesiredDistance(
            instruction.endSetup.shotSize,
            subjectInfo.subject.dimensions
          )
        ) * LOSS_SCALE_FACTORS.shotSize;
      totalLoss += losses.endShotSize;
    }

    if (instruction.endSetup.subjectView) {
      losses.endSubjectView =
        calculateSubjectViewLoss(
          lastFrame.position,
          lastSubjectFrame.position,
          getDesiredHorizontalAngle(instruction.endSetup.subjectView)
        ) * LOSS_SCALE_FACTORS.subjectView;
      totalLoss += losses.endSubjectView;
    }

    if (instruction.endSetup.subjectFraming) {
      losses.endFraming =
        calculateFramingLoss(
          lastFrame,
          lastSubjectFrame.position,
          instruction.endSetup.subjectFraming
        ) * LOSS_SCALE_FACTORS.subjectFraming;
      totalLoss += losses.endFraming;
    }
  }

  // Movement losses
  if (instruction.movement) {
    const movementLosses = calculateMovementLoss(frames, instruction);
    Object.entries(movementLosses).forEach(([key, loss]) => {
      losses[`movement_${key}`] =
        loss *
        LOSS_SCALE_FACTORS.movement[key as "translation" | "rotation" | "zoom"];
      totalLoss += losses[`movement_${key}`];
    });
  }

  // Constraint losses
  if (instruction.constraints) {
    if (instruction.constraints.distance) {
      let distanceLoss = 0;
      for (let i = 0; i < frames.length; i++) {
        const currentDistance = frames[i].position.distanceTo(
          subjectInfo.frames[Math.min(i, subjectInfo.frames.length - 1)]
            .position
        );
        const desiredDistance = getDesiredDistance(
          instruction.initialSetup?.shotSize || ShotSize.MediumShot,
          subjectInfo.subject.dimensions
        );
        distanceLoss += Math.pow(currentDistance - desiredDistance, 2);
      }
      losses.distanceConstraint =
        distanceLoss * LOSS_SCALE_FACTORS.constraints.distance;
      totalLoss += losses.distanceConstraint;
    }

    if (instruction.constraints.allFramesVisibility) {
      let visibilityLoss = 0;
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const subjectFrame =
          subjectInfo.frames[Math.min(i, subjectInfo.frames.length - 1)];
        const direction = new THREE.Vector3()
          .subVectors(subjectFrame.position, frame.position)
          .normalize();
        const cameraForward = new THREE.Vector3(0, 0, -1).applyEuler(
          frame.rotation
        );
        visibilityLoss += 1 - direction.dot(cameraForward);
      }
      losses.visibilityConstraint =
        visibilityLoss * LOSS_SCALE_FACTORS.constraints.visibility;
      totalLoss += losses.visibilityConstraint;
    }
  }

  console.log("===== Loss Components =====");
  Object.entries(losses).forEach(([component, loss]) => {
    console.log(`${component}: ${loss.toFixed(4)}`);
  });
  console.log("Total Loss:", totalLoss.toFixed(4));
  console.log("========================");

  return totalLoss;
};
