import {
  CameraParameters,
  ConstraintsConfig,
  SetupConfig,
  ShotSize,
} from "../../instruction/types";
import { Subject, SubjectFrame } from "../../../subjects/types";
import { calculatePositionByAngles } from "./angles";
import { applyCameraDistance } from "./distance";
import { calculateReginOfInterest } from "./roi";
import { getLookAtAngle } from "../../utils";
import { DEFAULT_ASPECT_RATIO, DEFAULT_FOCAL_LENGTH } from "../../constants";

export const getCameraBySetup = (
  setup: SetupConfig,
  subject: Subject,
  frame: SubjectFrame
): CameraParameters => {
  const position = calculatePositionByAngles(setup, frame);

  const { scale = 1, reginOfInterest } = calculateReginOfInterest(
    setup.shotSize,
    subject,
    frame
  );
  const updatedPosition = applyCameraDistance(scale, reginOfInterest, position);

  return {
    position: updatedPosition,
    rotation: getLookAtAngle(updatedPosition, reginOfInterest.position),
    focalLength: DEFAULT_FOCAL_LENGTH,
    aspectRatio: DEFAULT_ASPECT_RATIO,
  };
};
