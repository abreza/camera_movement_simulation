import {
  CameraVerticalAngle,
  ShotSize,
  SubjectView,
  SubjectInFramePosition,
  CameraMovementType,
  MovementSpeed,
} from "@/service/simulation/instruction/types";
import { highLevelInstructionRules } from "./rules";
import {
  cameraVerticalAngleLabels,
  shotSizeLabels,
  subjectViewLabels,
  subjectInFramePositionLabels,
  cameraMovementTypeLabels,
  movementSpeedLabels,
} from "./enumLabels";

const getRandomEnumValue = <T extends object>(enumObj: T): T[keyof T] => {
  const values = Object.values(enumObj);
  return values[Math.floor(Math.random() * values.length)];
};

const generateInitialSetup = () => {
  return {
    cameraAngle: getRandomEnumValue(CameraVerticalAngle),
    shotSize: getRandomEnumValue(ShotSize),
    subjectView: getRandomEnumValue(SubjectView),
    subjectFraming: getRandomEnumValue(SubjectInFramePosition),
  };
};

const generateMovement = () => {
  return {
    type: getRandomEnumValue(CameraMovementType),
    speed: getRandomEnumValue(MovementSpeed),
  };
};

const generateEndSetup = (movementType: CameraMovementType) => {
  const disabledFields = (highLevelInstructionRules[movementType]
    ?.disabledFinalSetup || []) as string[];
  const endSetup: any = {};

  if (!disabledFields.includes("cameraAngle") && Math.random() < 0.5) {
    endSetup.cameraAngle = getRandomEnumValue(CameraVerticalAngle);
  }
  if (!disabledFields.includes("shotSize") && Math.random() < 0.5) {
    endSetup.shotSize = getRandomEnumValue(ShotSize);
  }
  if (!disabledFields.includes("subjectView") && Math.random() < 0.5) {
    endSetup.subjectView = getRandomEnumValue(SubjectView);
  }
  if (!disabledFields.includes("subjectFraming") && Math.random() < 0.5) {
    endSetup.subjectFraming = getRandomEnumValue(SubjectInFramePosition);
  }

  return endSetup;
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
  final: {
    cameraAngle?: CameraVerticalAngle;
    shotSize?: ShotSize;
    subjectView?: SubjectView;
    subjectFraming?: SubjectInFramePosition;
  }
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

const generateRandomInstruction = () => {
  const initial = generateInitialSetup();
  const movement = generateMovement();
  const final = generateEndSetup(movement.type as CameraMovementType);

  return formatInstruction(initial, movement, final);
};

export const generateRandomTexts = () => {
  const texts = Array.from({ length: 1000 }, () => generateRandomInstruction());

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
