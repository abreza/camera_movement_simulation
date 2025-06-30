import {
  CameraMovementType,
  SetupConfig,
} from "@/service/simulation/instruction/types";

export const highLevelInstructionRules: Record<
  CameraMovementType,
  { simpleMovement?: boolean; disabledFinalSetup?: (keyof SetupConfig)[] }
> = {
  static: {
    disabledFinalSetup: [
      "cameraAngle",
      "subjectView",
      "shotSize",
      "subjectFraming",
    ],
  },
  follow: {
    disabledFinalSetup: ["cameraAngle", "subjectView"],
  },
  track: {
    disabledFinalSetup: ["cameraAngle", "subjectView"],
  },
  panLeft: {
    simpleMovement: true,
  },
  panRight: {
    simpleMovement: true,
  },
  tiltUp: {
    simpleMovement: true,
  },
  tiltDown: {
    simpleMovement: true,
  },
  dollyIn: {
    disabledFinalSetup: ["cameraAngle", "subjectView"],
  },
  dollyOut: {
    disabledFinalSetup: ["cameraAngle", "subjectView"],
  },
  truckLeft: {
    simpleMovement: true,
  },
  truckRight: {
    simpleMovement: true,
  },
  pedestalUp: {
    simpleMovement: true,
  },
  pedestalDown: {
    simpleMovement: true,
  },
  arcLeft: {
    simpleMovement: true,
  },
  arcRight: {
    simpleMovement: true,
  },
  craneUp: {
    disabledFinalSetup: ["subjectView"],
  },
  craneDown: {
    disabledFinalSetup: ["subjectView"],
  },
  // dutchLeft: {
  //   disabledFinalSetup: [],
  // },
  // dutchRight: {
  //   disabledFinalSetup: [],
  // },
};
