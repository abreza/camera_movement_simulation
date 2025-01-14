import {
  SimulationInstruction,
  CameraParameters,
  DynamicMode,
} from "../instruction/types";
import { SubjectInfo } from "../../subjects/types";
import { getEasedTime } from "../instruction/helpers/movement-easing";
import { getCameraBySetup } from "./setup";
import { interpolateCameraParameters } from "./interpolation";
import { applySpeedConstraints } from "./motion-constraint";
import { moveByEasing } from "./simple-movement";

export const initCameraParameters = (
  instruction: SimulationInstruction,
  startCameraParameter: CameraParameters | undefined,
  subjectInfo: SubjectInfo | undefined
): CameraParameters[] => {
  let frames: CameraParameters[] = [];
  const subjectFrames = subjectInfo?.frames;

  if (!subjectInfo || !subjectFrames?.length) {
    return frames;
  }

  const startSubjectFrame = subjectFrames[0];

  const startParams =
    startCameraParameter ||
    getCameraBySetup(
      instruction.initialSetup,
      subjectInfo.subject,
      startSubjectFrame
    );

  const endSubjectFrame = subjectFrames[subjectFrames.length - 1];

  const easedT = Array.from(Array(instruction.frameCount), (_, i) =>
    getEasedTime(i / (instruction.frameCount - 1), instruction.dynamic.easing)
  );

  if (instruction.dynamic.type === DynamicMode.Interpolation) {
    let endParams = instruction.dynamic.endSetup
      ? getCameraBySetup(
          instruction.dynamic.endSetup,
          subjectInfo.subject,
          endSubjectFrame
        )
      : startParams;
    const rotationInterpolation =
      !!instruction.dynamic.endSetup.subjectView ||
      !!instruction.dynamic.endSetup.cameraAngle;
    frames = interpolateCameraParameters(
      startParams,
      endParams,
      instruction.dynamic,
      subjectInfo.subject.dimensions,
      subjectFrames,
      easedT,
      rotationInterpolation,
      instruction.constraints
    );
  } else {
    frames = moveByEasing(
      startParams,
      instruction.dynamic,
      easedT,
      subjectFrames,
      instruction.constraints?.allFramesVisibility
    );
  }

  const constrainedFrames = applySpeedConstraints(
    frames,
    instruction.constraints?.maxSpeed,
    instruction.constraints?.maxAccelerate
  );

  return constrainedFrames;
};
