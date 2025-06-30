import {
  SimulationInstruction,
  CameraParameters,
  DynamicMode,
  SetupConfig,
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
  const endSubjectFrame = subjectFrames[subjectFrames.length - 1];

  const easedT = Array.from({ length: instruction.frameCount }, (_, i) =>
    getEasedTime(i / (instruction.frameCount - 1), instruction.dynamic.easing)
  );

  if (instruction.dynamic.type === DynamicMode.Interpolation) {
    let startSetup: SetupConfig;
    let endSetup: SetupConfig;

    if (instruction.setup.kind === "init") {
      startSetup = instruction.setup.config;
      endSetup = instruction.dynamic.complementSetup;
    } else {
      startSetup = instruction.dynamic.complementSetup;
      endSetup = instruction.setup.config;
    }

    const startParams =
      startCameraParameter ||
      getCameraBySetup(startSetup, subjectInfo.subject, startSubjectFrame);

    const endParams = getCameraBySetup(
      endSetup,
      subjectInfo.subject,
      endSubjectFrame
    );

    const rotationInterpolation =
      !!endSetup?.subjectView || !!endSetup?.cameraAngle;

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
    const startParams =
      startCameraParameter ||
      getCameraBySetup(
        instruction.setup.config,
        subjectInfo.subject,
        instruction.setup.kind === "init" ? startSubjectFrame : endSubjectFrame
      );

    frames = moveByEasing(
      startParams,
      instruction.dynamic,
      easedT,
      subjectFrames,
      instruction.constraints?.allFramesVisibility,
      instruction.setup.kind
    );
  }

  const constrainedFrames = applySpeedConstraints(
    frames,
    instruction.constraints?.maxSpeed,
    instruction.constraints?.maxAccelerate
  );

  return constrainedFrames;
};
