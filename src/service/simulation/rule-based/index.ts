import {
  CinematographyInstruction,
  CameraParameters,
} from "../instruction/types";
import { SubjectInfo } from "../../subjects/types";
import { getEasedTime } from "../instruction/helpers/movement-easing";
import { getCameraBySetup } from "./camera-setup";
import { interpolateParameters, applyMovement } from "./interpolation-movement";
import { applyVisibilityConstraints } from "./visibility";
import { generateMovement } from "./movement-generation";
import { applyDistanceConstraint } from "./distance-constraint";

export const initCameraParameters = (
  instruction: CinematographyInstruction,
  startCameraParameter: CameraParameters | undefined,
  subjectInfo: SubjectInfo | undefined
): CameraParameters[] => {
  let frames: CameraParameters[] = [];

  if (!subjectInfo?.frames?.length) {
    return frames;
  }

  const startFrame = subjectInfo.frames[0];
  const endFrame = subjectInfo.frames[subjectInfo.frames.length - 1];

  const startParams =
    startCameraParameter ||
    getCameraBySetup(instruction.initialSetup, subjectInfo.subject, startFrame);

  if (instruction.endSetup) {
    const endParams = getCameraBySetup(
      instruction.endSetup,
      subjectInfo.subject,
      endFrame
    );

    for (let i = 0; i < instruction.frameCount; i++) {
      const easedT = getEasedTime(
        i / (instruction.frameCount - 1),
        instruction.movementEasing
      );

      frames.push(interpolateParameters(startParams, endParams, easedT));
    }

    applyMovement(frames, instruction);
  } else {
    frames = generateMovement(startParams, instruction);
  }

  if (instruction.constraints?.distance) {
    frames = applyDistanceConstraint(
      frames,
      subjectInfo,
      instruction.constraints.distance,
      instruction.movementEasing
    );
  }

  if (instruction.constraints?.allFramesVisibility) {
    frames = applyVisibilityConstraints(frames, subjectInfo);
  }

  return frames;
};
