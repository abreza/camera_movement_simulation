import {
  CameraVerticalAngle,
  ShotSize,
  SubjectView,
  SubjectInFramePosition,
  CameraMovementType,
  MovementSpeed,
  CinematographyPrompt,
  CinematographySetup,
} from "@/service/simulation/instruction/types";
import {
  highLevelInstructionRules,
  normalizeCinematographyPrompt,
} from "./rules";
import {
  cameraVerticalAngleLabels,
  shotSizeLabels,
  subjectViewLabels,
  subjectInFramePositionLabels,
  cameraMovementTypeLabels,
  movementSpeedLabels,
} from "./enumLabels";
import { getShotSizeIndex } from "../constants";
import { randomValue } from "@/utils/randomUtils";

const MOVEMENT_VALIDATION_RULES = {
  [CameraMovementType.DollyIn]: {
    shotSize: (initial: ShotSize, final?: ShotSize) => {
      if (!final) return true;
      const initialIndex = getShotSizeIndex(initial);
      const finalIndex = getShotSizeIndex(final);

      return finalIndex < initialIndex;
    },
  },
  [CameraMovementType.DollyOut]: {
    shotSize: (initial: ShotSize, final?: ShotSize) => {
      if (!final) return true;
      const initialIndex = getShotSizeIndex(initial);
      const finalIndex = getShotSizeIndex(final);

      return finalIndex > initialIndex;
    },
  },
};

type GeneratedCinematographyPrompt = CinematographyPrompt & {
  initial: CinematographySetup;
};

const validateSetup = ({
  initial,
  movement,
  final,
}: CinematographyPrompt): boolean => {
  const rules = (MOVEMENT_VALIDATION_RULES as any)[movement.type];
  if (!rules) return true;

  if (rules.shotSize && final?.shotSize) {
    if (!rules.shotSize(initial?.shotSize, final.shotSize)) {
      return false;
    }
  }

  return true;
};

export const getRandomEnumValue = <T extends object>(
  enumObj: T
): T[keyof T] => {
  const values = Object.values(enumObj);
  return values[Math.floor(randomValue() * values.length)];
};

const generateInitialSetup = (): CinematographySetup => {
  return {
    cameraAngle: getRandomEnumValue(CameraVerticalAngle),
    shotSize: getRandomEnumValue(ShotSize),
    subjectView: getRandomEnumValue(SubjectView),
    subjectFraming: getRandomEnumValue(SubjectInFramePosition),
  };
};

const GENERATED_MOVEMENT_TYPES = Object.values(CameraMovementType).filter(
  (movementType) =>
    movementType !== CameraMovementType.DutchLeft &&
    movementType !== CameraMovementType.DutchRight
);

const generateMovement = () => {
  return {
    type:
      GENERATED_MOVEMENT_TYPES[
        Math.floor(randomValue() * GENERATED_MOVEMENT_TYPES.length)
      ],
    speed: getRandomEnumValue(MovementSpeed),
  };
};

const generateEndSetup = (
  initial: CinematographySetup,
  movementType: CameraMovementType
) => {
  const disabledFields = (highLevelInstructionRules[movementType]
    ?.disabledFinalSetup || []) as string[];
  let validEndSetup: Partial<CinematographySetup>;
  let attempts = 0;
  const MAX_ATTEMPTS = 10;

  do {
    validEndSetup = {};

    if (!disabledFields.includes("cameraAngle") && randomValue() < 0.5) {
      validEndSetup.cameraAngle = getRandomEnumValue(CameraVerticalAngle);
    }
    if (!disabledFields.includes("shotSize") && randomValue() < 0.5) {
      validEndSetup.shotSize = getRandomEnumValue(ShotSize);
    }
    if (!disabledFields.includes("subjectView") && randomValue() < 0.5) {
      validEndSetup.subjectView = getRandomEnumValue(SubjectView);
    }
    if (!disabledFields.includes("subjectFraming") && randomValue() < 0.5) {
      validEndSetup.subjectFraming = getRandomEnumValue(SubjectInFramePosition);
    }

    attempts++;
  } while (
    !validateSetup({
      initial,
      movement: { type: movementType, speed: MovementSpeed.Constant },
      final: validEndSetup,
    }) &&
    attempts < MAX_ATTEMPTS
  );

  if (attempts >= MAX_ATTEMPTS) {
    return {};
  }

  return validEndSetup;
};

const formatInstruction = (
  initial: {
    cameraAngle: CameraVerticalAngle;
    shotSize: ShotSize;
    subjectView: SubjectView;
    subjectFraming: SubjectInFramePosition;
  },
  movement: {
    type: CameraMovementType;
    speed: MovementSpeed;
  },
  final: Partial<CinematographySetup> = {}
) => {
  let text =
    `Begin with a ${
      cameraVerticalAngleLabels[initial.cameraAngle]
    } camera angle ` +
    `from the ${subjectViewLabels[initial.subjectView]} side of the subject, ` +
    `using a ${shotSizeLabels[initial.shotSize]} shot size and positioning ` +
    `the subject in the ${
      subjectInFramePositionLabels[initial.subjectFraming]
    } portion of the frame.`;

  text +=
    `\nApply a ${cameraMovementTypeLabels[movement.type]} movement ` +
    `with ${movementSpeedLabels[movement.speed]} speed.`;

  const hasEndSetup = Object.keys(final).length > 0;
  if (hasEndSetup) {
    text += "\nFinally, conclude with ";
    const endSetupParts = [];

    if (final.cameraAngle) {
      endSetupParts.push(
        `a ${cameraVerticalAngleLabels[final.cameraAngle]} camera angle`
      );
    }
    if (final.subjectView) {
      endSetupParts.push(
        `from the ${subjectViewLabels[final.subjectView]} view`
      );
    }
    if (final.shotSize) {
      endSetupParts.push(`a ${shotSizeLabels[final.shotSize]} shot`);
    }
    if (final.subjectFraming) {
      endSetupParts.push(
        `positioning the subject in the ${
          subjectInFramePositionLabels[final.subjectFraming]
        } portion of the frame`
      );
    }

    text += endSetupParts.join(", ").replace(/,([^,]*)$/, " and$1") + ".";
  }

  return text;
};

export const generateRandomCinematographyPrompt =
  (): GeneratedCinematographyPrompt => {
    const initial = generateInitialSetup();
    const movement = generateMovement();
    if (
      (movement.type === CameraMovementType.CraneDown ||
        movement.type === CameraMovementType.PedestalDown) &&
      initial.cameraAngle === CameraVerticalAngle.Low
    ) {
      // A low-angle camera already sits on the physical floor, leaving no
      // valid downward crane travel.
      initial.cameraAngle = CameraVerticalAngle.Eye;
    }
    const final = generateEndSetup(initial, movement.type);

    return normalizeCinematographyPrompt({
      initial,
      movement,
      final,
    }) as GeneratedCinematographyPrompt;
  };

export const generateRandomTexts = () => {
  const texts = Array.from({ length: 1000 }, () =>
    generateRandomCinematographyPrompt()
  ).map(({ initial, movement, final }) => {
    if (!initial) {
      throw new Error("Randomly generated prompts must include an initial setup");
    }

    return formatInstruction(initial, movement, final);
  });

  const blob = new Blob([texts.join("\n\n")], { type: "text/plain" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cinematography_instructions.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};
