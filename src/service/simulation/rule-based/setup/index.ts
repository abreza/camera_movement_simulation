import { CameraParameters, SetupConfig } from "../../instruction/types";
import { Subject, SubjectFrame } from "../../../subjects/types";
import { calculatePositionByAngles } from "./angles";
import { applyCameraDistance } from "./distance";
import { calculateRegionOfInterest } from "./roi";
import { getLookAtAngle } from "../../utils";
import {
  DEFAULT_ASPECT_RATIO,
  DEFAULT_FOCAL_LENGTH,
  MIN_CAMERA_HEIGHT,
} from "../../constants";
import { fixSubjectInView } from "./framing";

export const getCameraBySetup = (
  setup: SetupConfig,
  subject: Subject,
  frame: SubjectFrame
): CameraParameters => {
  const optics = {
    focalLength: setup.focalLength ?? DEFAULT_FOCAL_LENGTH,
    aspectRatio: setup.aspectRatio ?? DEFAULT_ASPECT_RATIO,
  };
  for (const [name, value] of Object.entries(optics)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Camera ${name} must be a positive finite number`);
    }
  }
  const position = calculatePositionByAngles(setup, frame);

  const { scale = 1, regionOfInterest } = calculateRegionOfInterest(
    setup.shotSize,
    subject,
    frame
  );
  const updatedPosition = applyCameraDistance(
    scale,
    regionOfInterest,
    position,
    optics
  );
  updatedPosition.y = Math.max(MIN_CAMERA_HEIGHT, updatedPosition.y);

  const camera = {
    position: updatedPosition,
    rotation: getLookAtAngle(updatedPosition, regionOfInterest.position),
    ...optics,
  };

  return fixSubjectInView(
    camera,
    regionOfInterest.position,
    regionOfInterest.dimensions,
    setup.subjectFraming?.position,
    regionOfInterest.rotation
  );
};
