import { SimulationInstruction, CameraParameters } from "../instruction/types";
import { SubjectInfo } from "../../subjects/types";
import { getEasedTime } from "../instruction/helpers/movement-easing";
import { getCameraBySetup } from "./setup";
import { interpolateParameters } from "./interpolation";
import { applyVisibilityConstraints } from "./visibility";
import { applyStaticDistanceConstraint } from "./distance-constraint";
import {
  applyPositionalConstraints,
  applyRotationalConstraints,
} from "./motion-constraint";

export const initCameraParameters = (
  instruction: SimulationInstruction,
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

  if (instruction.constraints?.staticDistance) {
    frames = applyStaticDistanceConstraint(frames, subjectInfo);
  }

  if (instruction.constraints?.allFramesVisibility) {
    frames = applyVisibilityConstraints(frames, subjectInfo);
  }

  const maxSpeed = instruction.constraints?.maxSpeed;
  const maxAcceleration = instruction.constraints?.maxAccelerate;
  if (maxSpeed !== undefined || maxAcceleration !== undefined) {
    const safeMaxSpeed = maxSpeed ?? Number.POSITIVE_INFINITY;
    const safeMaxAcceleration = maxAcceleration ?? Number.POSITIVE_INFINITY;
    frames = applyPositionalConstraints(
      frames,
      safeMaxSpeed,
      safeMaxAcceleration
    );
  }

  const maxRotationDegPerFrame = 1;
  const maxRotationRadPerFrame = (maxRotationDegPerFrame * Math.PI) / 180;

  frames = applyRotationalConstraints(frames, maxRotationRadPerFrame);

  return frames;
};
