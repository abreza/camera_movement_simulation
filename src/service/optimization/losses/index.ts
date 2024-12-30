import {
  CameraParameters,
  CinematographyInstruction,
} from "../../simulation/types";
import { SubjectInfo } from "../../subjects/types";
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
  calculateSubjectInFrameLoss,
  calculateVisibilityLoss,
} from "./static";

export const calculateTotalLoss = (
  frames: CameraParameters[],
  instruction: CinematographyInstruction,
  subjectInfo?: SubjectInfo
): number => {
  if (!subjectInfo?.frames?.length) return 0;

  let totalLoss = 0;
  const frameCount = frames.length;

  frames.forEach((frame, index) => {
    const t = index / (frameCount - 1);
    const subjectFrame =
      subjectInfo.frames![Math.min(index, subjectInfo.frames!.length - 1)];

    if (instruction.initialSetup) {
      const weight = 1 - t;

      if (instruction.initialSetup.cameraAngle) {
        totalLoss +=
          calculateCameraAngleLoss(
            frame,
            subjectFrame.position,
            instruction.initialSetup.cameraAngle
          ) * weight;
      }

      if (instruction.initialSetup.shotSize) {
        totalLoss +=
          calculateShotSizeLoss(
            frame,
            subjectFrame.position,
            subjectInfo.subject,
            instruction.initialSetup.shotSize
          ) * weight;
      }

      if (instruction.initialSetup.subjectView) {
        totalLoss +=
          calculateSubjectViewLoss(
            frame,
            subjectFrame,
            instruction.initialSetup.subjectView
          ) * weight;
      }

      if (instruction.initialSetup.subjectInFrame) {
        totalLoss +=
          calculateSubjectInFrameLoss(
            frame,
            subjectFrame.position,
            instruction.initialSetup.subjectInFrame
          ) * weight;
      }
    }

    if (instruction.endSetup) {
      const weight = t;

      if (instruction.endSetup.cameraAngle) {
        totalLoss +=
          calculateCameraAngleLoss(
            frame,
            subjectFrame.position,
            instruction.endSetup.cameraAngle
          ) * weight;
      }

      if (instruction.endSetup.shotSize) {
        totalLoss +=
          calculateShotSizeLoss(
            frame,
            subjectFrame.position,
            subjectInfo.subject,
            instruction.endSetup.shotSize
          ) * weight;
      }

      if (instruction.endSetup.subjectView) {
        totalLoss +=
          calculateSubjectViewLoss(
            frame,
            subjectFrame,
            instruction.endSetup.subjectView
          ) * weight;
      }

      if (instruction.endSetup.subjectInFrame) {
        totalLoss +=
          calculateSubjectInFrameLoss(
            frame,
            subjectFrame.position,
            instruction.endSetup.subjectInFrame
          ) * weight;
      }
    }
  });

  if (instruction.movement) {
    if (instruction.movement.distance) {
      totalLoss += calculateCameraSubjectDistanceLoss(
        instruction.movement.distance,
        frames,
        subjectInfo
      );
    }

    if (instruction.movement.translation) {
      totalLoss += calculateTranslationMovementLoss(
        instruction.movement.translation,
        frames,
        instruction
      );
    }

    if (instruction.movement.rotation) {
      totalLoss += calculateRotationMovementLoss(
        instruction.movement.rotation,
        frames,
        instruction
      );
    }

    if (instruction.movement.zoom) {
      totalLoss += calculateZoomMovementLoss(
        instruction.movement.zoom,
        frames,
        instruction
      );
    }
  }

  if (instruction.constraints?.visibility) {
    frames.forEach((frame, index) => {
      const subjectFrame =
        subjectInfo.frames![Math.min(index, subjectInfo.frames!.length - 1)];
      totalLoss += calculateVisibilityLoss(frame, subjectFrame.position);
    });
  }

  return totalLoss / frameCount;
};
