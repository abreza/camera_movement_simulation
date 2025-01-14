import {
  CameraMovementType,
  SetupConfig,
} from "@/service/simulation/instruction/types";

export const highLevelInstructionRules: Record<
  CameraMovementType,
  { simpleMovement?: boolean; disabledFinalSetup?: (keyof SetupConfig)[] }
> = {
  static: {
    simpleMovement: true,
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
    disabledFinalSetup: ["cameraAngle", "subjectView"],
  },
  dollyInZoomOut: {
    disabledFinalSetup: ["cameraAngle", "subjectView"],
  },
  dutchLeft: {
    disabledFinalSetup: [],
  },
  dutchRight: {
    disabledFinalSetup: [],
  },
};
