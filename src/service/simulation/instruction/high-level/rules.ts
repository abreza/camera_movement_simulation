import {
  CameraMovementType,
  CinematographyPrompt,
  SetupConfig,
} from "@/service/simulation/instruction/types";

export const FINAL_SETUP_FIELDS: (keyof SetupConfig)[] = [
  "cameraAngle",
  "shotSize",
  "subjectView",
  "subjectFraming",
];

type HighLevelInstructionRule = {
  simpleMovement?: boolean;
  disabledFinalSetup?: (keyof SetupConfig)[];
};

const SIMPLE_MOVEMENT_RULE: HighLevelInstructionRule = {
  simpleMovement: true,
  disabledFinalSetup: FINAL_SETUP_FIELDS,
};

export const highLevelInstructionRules: Record<
  CameraMovementType,
  HighLevelInstructionRule
> = {
  static: {
    disabledFinalSetup: FINAL_SETUP_FIELDS,
  },
  follow: {
    disabledFinalSetup: ["cameraAngle", "subjectView"],
  },
  track: {
    disabledFinalSetup: ["cameraAngle", "subjectView"],
  },
  panLeft: SIMPLE_MOVEMENT_RULE,
  panRight: SIMPLE_MOVEMENT_RULE,
  tiltUp: SIMPLE_MOVEMENT_RULE,
  tiltDown: SIMPLE_MOVEMENT_RULE,
  dollyIn: {
    disabledFinalSetup: ["cameraAngle", "subjectView"],
  },
  dollyOut: {
    disabledFinalSetup: ["cameraAngle", "subjectView"],
  },
  truckLeft: SIMPLE_MOVEMENT_RULE,
  truckRight: SIMPLE_MOVEMENT_RULE,
  pedestalUp: SIMPLE_MOVEMENT_RULE,
  pedestalDown: SIMPLE_MOVEMENT_RULE,
  arcLeft: SIMPLE_MOVEMENT_RULE,
  arcRight: SIMPLE_MOVEMENT_RULE,
  craneUp: {
    disabledFinalSetup: ["subjectView"],
  },
  craneDown: {
    disabledFinalSetup: ["subjectView"],
  },
  dutchLeft: {},
  dutchRight: {},
};

export function normalizeCinematographyPrompt(
  prompt: CinematographyPrompt
): CinematographyPrompt {
  if (!prompt.final) {
    return prompt;
  }

  const rule = highLevelInstructionRules[prompt.movement.type];
  if (rule.simpleMovement && !prompt.initial) {
    return prompt;
  }

  const disabledFields = new Set(rule.disabledFinalSetup || []);
  const normalizedFinal: Record<string, unknown> = {};

  FINAL_SETUP_FIELDS.forEach((field) => {
    const value: unknown = prompt.final?.[field];
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      !disabledFields.has(field)
    ) {
      normalizedFinal[field] = value;
    }
  });

  const { final: _final, ...promptWithoutFinal } = prompt;

  if (Object.keys(normalizedFinal).length === 0) {
    return promptWithoutFinal;
  }

  return {
    ...promptWithoutFinal,
    final: normalizedFinal as NonNullable<CinematographyPrompt["final"]>,
  };
}
