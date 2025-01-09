import {
  CinematographyInstruction,
  CameraParameters,
} from "../instruction/types";
import { SubjectInfo } from "../../subjects/types";
import { getEasedTime } from "../instruction/helpers/movement-easing";
import { getCameraBySetup } from "./setup";
import { interpolateParameters } from "./interpolation";
import { applyVisibilityConstraints } from "./visibility";
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

  const endParams = instruction.endSetup
    ? getCameraBySetup(instruction.endSetup, subjectInfo.subject, endFrame)
    : startParams;

  for (let i = 0; i < instruction.frameCount; i++) {
    const easedT = getEasedTime(
      i / (instruction.frameCount - 1),
      instruction.movementEasing
    );

    frames.push(
      interpolateParameters(
        startParams,
        endParams,
        easedT,
        instruction.subjectAwareInterpolation,
        subjectInfo
      )
    );
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
