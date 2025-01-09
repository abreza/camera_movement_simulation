import {
  CameraMovementType,
  SetupConfig,
} from "@/service/simulation/instruction/types";

export const highLevelInstructionRules: Record<
  CameraMovementType,
  { disabledFinalSetup: (keyof SetupConfig)[] }
> = {
  static: {
    disabledFinalSetup: [
      "cameraAngle",
      "shotSize",
      "subjectView",
      "subjectFraming",
    ],
  },
  panLeft: {
    disabledFinalSetup: ["cameraAngle", "shotSize", "subjectView"],
  },
  panRight: {
    disabledFinalSetup: ["cameraAngle", "shotSize", "subjectView"],
  },
  tiltUp: {
    disabledFinalSetup: ["cameraAngle", "shotSize", "subjectView"],
  },
  tiltDown: {
    disabledFinalSetup: ["cameraAngle", "shotSize", "subjectView"],
  },
  dollyIn: {
    disabledFinalSetup: ["cameraAngle", "subjectView"],
  },
  dollyOut: {
    disabledFinalSetup: ["cameraAngle", "subjectView"],
  },
  truckLeft: {
    disabledFinalSetup: ["cameraAngle", "shotSize"],
  },
  truckRight: {
    disabledFinalSetup: ["cameraAngle", "shotSize"],
  },
  pedestalUp: {
    disabledFinalSetup: ["shotSize", "subjectView"],
  },
  pedestalDown: {
    disabledFinalSetup: ["shotSize", "subjectView"],
  },
  arcLeft: {
    disabledFinalSetup: ["subjectView"],
  },
  arcRight: {
    disabledFinalSetup: ["subjectView"],
  },
  craneUp: {
    disabledFinalSetup: ["subjectView"],
  },
  craneDown: {
    disabledFinalSetup: ["subjectView"],
  },
  dollyOutZoomIn: {
    disabledFinalSetup: ["cameraAngle", "shotSize", "subjectView"],
  },
  dollyInZoomOut: {
    disabledFinalSetup: ["cameraAngle", "shotSize", "subjectView"],
  },
  follow: {
    disabledFinalSetup: [],
  },
};
