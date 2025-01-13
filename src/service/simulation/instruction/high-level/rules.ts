import {
  CameraMovementType,
  SetupConfig,
} from "@/service/simulation/instruction/types";

export const highLevelInstructionRules: Record<
  CameraMovementType,
  { cameraAware?: boolean; disabledFinalSetup?: (keyof SetupConfig)[] }
> = {
  static: {
    cameraAware: true,
  },
  follow: {
    disabledFinalSetup: ["cameraAngle", "subjectView"],
  },
  track: {
    disabledFinalSetup: ["cameraAngle", "subjectView"],
  },
  panLeft: {
    cameraAware: true,
  },
  panRight: {
    cameraAware: true,
  },
  tiltUp: {
    cameraAware: true,
  },
  tiltDown: {
    cameraAware: true,
  },
  dollyIn: {
    disabledFinalSetup: ["cameraAngle", "subjectView"],
  },
  dollyOut: {
    disabledFinalSetup: ["cameraAngle", "subjectView"],
  },
  truckFollow: {
    cameraAware: true,
  },
  pedestalFollow: {
    cameraAware: true,
  },
  truckLeft: {
    cameraAware: true,
  },
  truckRight: {
    cameraAware: true,
  },
  pedestalUp: {
    cameraAware: true,
  },
  pedestalDown: {
    cameraAware: true,
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
