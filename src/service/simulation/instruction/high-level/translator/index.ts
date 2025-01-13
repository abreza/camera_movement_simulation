import {
  CinematographyPrompt,
  DynamicMode,
  SimulationInstruction,
} from "@/service/simulation/instruction/types";
import {
  buildConstraintsForMovement,
  determineSubjectAwareInterpolation,
  mapMovementSpeedToEasing,
} from "./movement";
import { mapCinematographySetupToConfig, autoGenerateEndSetup } from "./setup";

export function translatePromptToSimulationInstruction(
  prompt: CinematographyPrompt,
  options?: {
    frameCount?: number;
    subjectIndex?: number;
  }
): SimulationInstruction {
  const { frameCount = 120, subjectIndex = 0 } = options || {};

  const movementEasing = mapMovementSpeedToEasing(prompt.movement.speed);

  const subjectAwareInterpolation = determineSubjectAwareInterpolation(
    prompt.movement.type
  );

  const constraints = buildConstraintsForMovement(prompt.movement.type);

  const initialSetup = mapCinematographySetupToConfig(prompt.initial);

  const endSetup = {
    ...autoGenerateEndSetup(prompt.initial, prompt.movement.type),
    ...mapCinematographySetupToConfig(prompt.final),
  };

  return {
    frameCount,
    subjectIndex,
    initialSetup,
    dynamic: {
      type: DynamicMode.Interpolation,
      easing: movementEasing,
      endSetup,
      subjectAwareInterpolation,
    },
    constraints,
  };
}
