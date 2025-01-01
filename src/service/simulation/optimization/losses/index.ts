import {
  CameraParameters,
  CinematographyInstruction,
} from "../../instruction/types";
import { SubjectInfo } from "../../../subjects/types";
import {
  calculateCameraSubjectDistanceLoss,
  calculateRotationMovementLoss,
  calculateTranslationMovementLoss,
  calculateZoomMovementLoss,
} from "./movement";
import {
  calculateCameraAngleLoss,
  calculateShotSizeLoss,
  calculateSubjectViewLoss,
  calculateVisibilityLoss,
  calculateSubjectFramingLoss,
} from "./static";

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

export const calculateTotalLoss = (
  frames: CameraParameters[],
  instruction: CinematographyInstruction,
  subjectInfo?: SubjectInfo
): number => {
  if (!subjectInfo?.frames?.length) return 0;

  let totalLoss = 0;
  const frameCount = frames.length;
  const losses: Record<string, number> = {};

  if (instruction.initialSetup) {
    if (instruction.initialSetup.cameraAngle) {
      const loss =
        calculateCameraAngleLoss(
          frames[0],
          subjectInfo.frames[0].position,
          instruction.initialSetup.cameraAngle
        ) * LOSS_SCALE_FACTORS.cameraAngle;
      losses["initialCameraAngle"] = loss;
      totalLoss += loss;
    }

    if (instruction.initialSetup.shotSize) {
      const loss =
        calculateShotSizeLoss(
          frames[0],
          subjectInfo.frames[0].position,
          subjectInfo.subject,
          instruction.initialSetup.shotSize
        ) * LOSS_SCALE_FACTORS.shotSize;
      losses["initialShotSize"] = loss;
      totalLoss += loss;
    }

    if (instruction.initialSetup.subjectView) {
      const loss =
        calculateSubjectViewLoss(
          frames[0],
          subjectInfo.frames[0],
          instruction.initialSetup.subjectView
        ) * LOSS_SCALE_FACTORS.subjectView;
      losses["initialSubjectView"] = loss;
      totalLoss += loss;
    }

    if (instruction.initialSetup.subjectFraming) {
      const loss =
        calculateSubjectFramingLoss(
          frames[0],
          subjectInfo.frames[0].position,
          instruction.initialSetup.subjectFraming
        ) * LOSS_SCALE_FACTORS.subjectFraming;
      losses["initialSubjectFraming"] = loss;
      totalLoss += loss;
    }
  }

  if (instruction.endSetup) {
    if (instruction.endSetup.cameraAngle) {
      const loss =
        calculateCameraAngleLoss(
          frames[frameCount - 1],
          subjectInfo.frames[
            Math.min(frameCount - 1, subjectInfo.frames.length - 1)
          ].position,
          instruction.endSetup.cameraAngle
        ) * LOSS_SCALE_FACTORS.cameraAngle;
      losses["endCameraAngle"] = loss;
      totalLoss += loss;
    }

    if (instruction.endSetup.shotSize) {
      const loss =
        calculateShotSizeLoss(
          frames[frameCount - 1],
          subjectInfo.frames[
            Math.min(frameCount - 1, subjectInfo.frames.length - 1)
          ].position,
          subjectInfo.subject,
          instruction.endSetup.shotSize
        ) * LOSS_SCALE_FACTORS.shotSize;
      losses["endShotSize"] = loss;
      totalLoss += loss;
    }

    if (instruction.endSetup.subjectView) {
      const loss =
        calculateSubjectViewLoss(
          frames[frameCount - 1],
          subjectInfo.frames[
            Math.min(frameCount - 1, subjectInfo.frames.length - 1)
          ],
          instruction.endSetup.subjectView
        ) * LOSS_SCALE_FACTORS.subjectView;
      losses["endSubjectView"] = loss;
      totalLoss += loss;
    }

    if (instruction.endSetup.subjectFraming) {
      const loss =
        calculateSubjectFramingLoss(
          frames[frameCount - 1],
          subjectInfo.frames[
            Math.min(frameCount - 1, subjectInfo.frames.length - 1)
          ].position,
          instruction.endSetup.subjectFraming
        ) * LOSS_SCALE_FACTORS.subjectFraming;
      losses["endSubjectFraming"] = loss;
      totalLoss += loss;
    }
  }

  if (instruction.movement) {
    if (instruction.movement.translation) {
      const loss =
        calculateTranslationMovementLoss(
          instruction.movement.translation,
          frames,
          instruction
        ) * LOSS_SCALE_FACTORS.movement.translation;
      losses["translationMovement"] = loss;
      totalLoss += loss;
    }

    if (instruction.movement.rotation) {
      const loss =
        calculateRotationMovementLoss(
          instruction.movement.rotation,
          frames,
          instruction
        ) * LOSS_SCALE_FACTORS.movement.rotation;
      losses["rotationMovement"] = loss;
      totalLoss += loss;
    }

    if (instruction.movement.zoom) {
      const loss =
        calculateZoomMovementLoss(
          instruction.movement.zoom,
          frames,
          instruction
        ) * LOSS_SCALE_FACTORS.movement.zoom;
      losses["zoomMovement"] = loss;
      totalLoss += loss;
    }
  }

  let visibilityLossTotal = 0;
  if (instruction.constraints) {
    if (instruction.constraints.distance) {
      const loss =
        calculateCameraSubjectDistanceLoss(
          instruction.constraints.distance,
          frames,
          subjectInfo
        ) * LOSS_SCALE_FACTORS.constraints.distance;
      losses["distanceMovement"] = loss;
      totalLoss += loss;
    }
    if (instruction.constraints.allFramesVisibility) {
      frames.forEach((frame, index) => {
        const subjectFrame =
          subjectInfo.frames![Math.min(index, subjectInfo.frames!.length - 1)];
        const loss = calculateVisibilityLoss(frame, subjectFrame.position);
        visibilityLossTotal += loss;
      });
      const scaledVisibilityLoss =
        (visibilityLossTotal / frameCount) *
        LOSS_SCALE_FACTORS.constraints.visibility;
      losses["visibility"] = scaledVisibilityLoss;
      totalLoss += scaledVisibilityLoss;
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
