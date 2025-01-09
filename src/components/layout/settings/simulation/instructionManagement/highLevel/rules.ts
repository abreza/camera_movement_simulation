export const highLevelInstructionRules = {
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
  follow: {
    disabledFinalSetup: [],
  },
};
