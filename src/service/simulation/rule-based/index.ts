import {
  SimulationInstruction,
  CameraParameters,
  DynamicMode,
} from "../instruction/types";
import { SubjectInfo } from "../../subjects/types";
import { getEasedTime } from "../instruction/helpers/movement-easing";
import { getCameraBySetup, getCameraBySetupConstrained } from "./setup";
import { interpolateParameters } from "./interpolation";
import { applySpeedConstraints } from "./motion-constraint";
import { applyConstraintsOnFrame } from "./setup/constraints";

export const initCameraParameters = (
  instruction: SimulationInstruction,
  startCameraParameter: CameraParameters | undefined,
  subjectInfo: SubjectInfo | undefined
): CameraParameters[] => {
  const frames: CameraParameters[] = [];

  if (!subjectInfo?.frames?.length) {
    return frames;
  }

  const startSubjectFrame = subjectInfo.frames[0];

  const startParams =
    startCameraParameter ||
    getCameraBySetup(
      instruction.initialSetup,
      subjectInfo.subject,
      startSubjectFrame
    );

  const endSubjectFrame = subjectInfo.frames[subjectInfo.frames.length - 1];

  if (instruction.dynamic.type === DynamicMode.Interpolation) {
    let endParams = instruction.dynamic.endSetup
      ? getCameraBySetupConstrained(
          instruction.dynamic.endSetup,
          subjectInfo.subject,
          endSubjectFrame,
          startParams,
          instruction.constraints
        )
      : startParams;

    for (let i = 0; i < instruction.frameCount; i++) {
      const easedT = getEasedTime(
        i / (instruction.frameCount - 1),
        instruction.dynamic.easing
      );

      let frameParams = interpolateParameters(
        startParams,
        endParams,
        easedT,
        instruction.dynamic.subjectAwareInterpolation,
        subjectInfo
      );

      const prevCameraParams = i > 0 ? frames[i - 1] : startParams;
      const subjectFrameCurrent =
        subjectInfo.frames[Math.min(i, subjectInfo.frames.length - 1)];

      frameParams = applyConstraintsOnFrame(
        frameParams,
        prevCameraParams,
        instruction.constraints,
        subjectFrameCurrent,
        subjectInfo.subject.dimensions
      );

      frames.push(frameParams);
    }
  }

  const constrainedFrames = applySpeedConstraints(
    frames,
    instruction.constraints?.maxSpeed,
    instruction.constraints?.maxAccelerate
  );

  return constrainedFrames;
};
