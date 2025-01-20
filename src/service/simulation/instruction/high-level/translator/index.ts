import {
  CinematographyPrompt,
  DynamicMode,
  Scale,
  SimulationInstruction,
} from "@/service/simulation/instruction/types";
import {
  buildConstraintsForMovement,
  determineSubjectAwareInterpolation,
  mapMovementSpeedToEasing,
} from "./movement";
import { mapCinematographySetupToConfig, autoGenerateEndSetup } from "./setup";
import { highLevelInstructionRules } from "../rules";
import {
  getSimpleMovementDirection,
  getSimpleMovementMode,
} from "./simple-movement";

export function translatePromptToSimulationInstruction(
  prompt: CinematographyPrompt,
  options?: {
    frameCount?: number;
    subjectIndex?: number;
  }
): SimulationInstruction {
  const { frameCount = 30, subjectIndex = 0 } = options || {};
  const { movement, initial, final } = prompt;

  const movementEasing = mapMovementSpeedToEasing(movement.speed);
  const constraints = buildConstraintsForMovement(movement.type);
  const initialSetup = mapCinematographySetupToConfig(initial);

  const isSimpleMovement =
    highLevelInstructionRules[movement.type]?.simpleMovement;

  if (isSimpleMovement) {
    return {
      frameCount,
      subjectIndex,
      initialSetup,
      constraints,
      dynamic: {
        type: DynamicMode.Simple,
        easing: movementEasing,
        scale: Scale.Medium,
        direction: getSimpleMovementDirection(movement.type),
        movementMode: getSimpleMovementMode(movement.type),
      },
    };
  } else {
    const subjectAwareInterpolation = determineSubjectAwareInterpolation(
      movement.type
    );
    const endSetup = {
      ...autoGenerateEndSetup(initial, movement.type),
      ...mapCinematographySetupToConfig(final),
    };

    return {
      frameCount,
      subjectIndex,
      initialSetup,
      constraints,
      dynamic: {
        type: DynamicMode.Interpolation,
        easing: movementEasing,
        endSetup,
        subjectAwareInterpolation,
      },
    };
  }
}
