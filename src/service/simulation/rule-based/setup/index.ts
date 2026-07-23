import { CameraParameters, SetupConfig } from "../../instruction/types";
import { Subject, SubjectFrame } from "../../../subjects/types";
import { calculatePositionByAngles } from "./angles";
import { applyCameraDistance } from "./distance";
import { calculateRegionOfInterest } from "./roi";
import { getLookAtAngle } from "../../utils";
import { DEFAULT_ASPECT_RATIO, DEFAULT_FOCAL_LENGTH } from "../../constants";
import { fixSubjectInView } from "./framing";

export const getCameraBySetup = (
  setup: SetupConfig,
  subject: Subject,
  frame: SubjectFrame
): CameraParameters => {
  const position = calculatePositionByAngles(setup, frame);

  const { scale = 1, regionOfInterest } = calculateRegionOfInterest(
    setup.shotSize,
    subject,
    frame
  );
  const updatedPosition = applyCameraDistance(scale, regionOfInterest, position);

  const camera = {
    position: updatedPosition,
    rotation: getLookAtAngle(updatedPosition, regionOfInterest.position),
    focalLength: DEFAULT_FOCAL_LENGTH,
    aspectRatio: DEFAULT_ASPECT_RATIO,
  };

  return fixSubjectInView(
    camera,
    frame.position,
    subject.dimensions,
    setup.subjectFraming?.position
  );
};
