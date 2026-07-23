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

  const startConfig = initial && mapCinematographySetupToConfig(initial);

  const endConfig: SetupConfig = {
    ...(initial
      ? autoGenerateEndSetup(
          {
            ...defaultCinematographyPrompt.initial,
            ...initial,
          } as CinematographySetup,
          movement.type
        )
      : {}),
    ...(final ? mapCinematographySetupToConfig(final) : {}),
  };

  if (isSimpleMovement) {
    const setup = startConfig
      ? {
          config: startConfig,
          kind: "init",
        }
      : ({
          config: endConfig,
          kind: "end",
        } as any);
    return {
      frameCount,
      subjectIndex,
      setup,
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

    let mainConfig: SetupConfig;
    let complementConfig: SetupConfig;
    let kind: "init" | "end";

    if (!initial && final) {
      kind = "end";
      mainConfig = endConfig;
      complementConfig = startConfig || {};
    } else {
      kind = "init";
      mainConfig = startConfig || {};
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
