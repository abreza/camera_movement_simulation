import {
  CinematographyPrompt,
  DynamicMode,
  Scale,
  SimulationInstruction,
  SetupConfig,
  CinematographySetup,
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
import { defaultCinematographyPrompt } from "../constant";

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
  const isSimpleMovement =
    highLevelInstructionRules[movement.type]?.simpleMovement;

  const startSetupSource: CinematographySetup = {
    ...defaultCinematographyPrompt.initial,
    ...initial,
  } as CinematographySetup;
  const startConfig = mapCinematographySetupToConfig(startSetupSource);

  if (isSimpleMovement) {
    return {
      frameCount,
      subjectIndex,
      setup: {
        config: startConfig,
        kind: "init",
      },
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

    const endConfig: SetupConfig = {
      ...autoGenerateEndSetup(startSetupSource, movement.type),
      ...(final ? mapCinematographySetupToConfig(final) : {}),
    };

    let mainConfig: SetupConfig;
    let complementConfig: SetupConfig;
    let kind: "init" | "end";

    if (!initial && final) {
      kind = "end";
      mainConfig = endConfig;
      complementConfig = startConfig;
    } else {
      kind = "init";
      mainConfig = startConfig;
      complementConfig = endConfig;
    }

    return {
      frameCount,
      subjectIndex,
      setup: {
        config: mainConfig,
        kind: kind,
      },
      constraints,
      dynamic: {
        type: DynamicMode.Interpolation,
        easing: movementEasing,
        complementSetup: complementConfig,
        subjectAwareInterpolation,
      },
    };
  }
}
