import { CameraParameters, SetupConfig } from "../../instruction/types";
import { Subject, SubjectFrame } from "../../../subjects/types";
import { calculatePositionByAngles } from "./angles";
import { applyCameraDistance } from "./distance";
import { applyFraming } from "./framing";
import { calculateReginOfInterest } from "./roi";

export const getCameraBySetup = (
  setup: SetupConfig,
  subject: Subject,
  frame: SubjectFrame
): CameraParameters => {
  const position = calculatePositionByAngles(setup, frame);

  const { scale = 1, reginOfInterest } = calculateReginOfInterest(
    setup,
    subject,
    frame
  );

  const updatedPosition = applyCameraDistance(scale, reginOfInterest, position);

  return applyFraming(updatedPosition, reginOfInterest, setup?.subjectFraming);
};
