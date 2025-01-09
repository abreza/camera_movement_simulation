import {
  CameraVerticalAngle,
  ShotSize,
  SubjectView,
  SubjectInFramePosition,
  CameraMovementType,
  MovementSpeed,
} from "@/service/simulation/instruction/types";

const getRandomElement = <T extends string>(arr: T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)];
};

const generateRandomInstruction = () => {
  const randomInitial = {
    cameraAngle: getRandomElement(Object.values(CameraVerticalAngle)),
    shotSize: getRandomElement(Object.values(ShotSize)),
    subjectView: getRandomElement(Object.values(SubjectView)),
    subjectFraming: getRandomElement(Object.values(SubjectInFramePosition)),
  };

  const randomMovement = {
    type: getRandomElement(Object.values(CameraMovementType)),
    speed: getRandomElement(Object.values(MovementSpeed)),
  };

  const randomFinal = {
    cameraAngle: getRandomElement(Object.values(CameraVerticalAngle)),
    shotSize: getRandomElement(Object.values(ShotSize)),
    subjectView: getRandomElement(Object.values(SubjectView)),
    subjectFraming: getRandomElement(Object.values(SubjectInFramePosition)),
  };

  return `Generate cinematography camera trajectory that begins with a ${randomInitial.cameraAngle} camera angle from the ${randomInitial.subjectView} side of the subject, using a ${randomInitial.shotSize} shot size and positioning the subject in the ${randomInitial.subjectFraming} portion of the frame. Next, apply a ${randomMovement.type} movement with ${randomMovement.speed} speed. Finally, conclude with a ${randomFinal.cameraAngle} camera angle from the ${randomFinal.subjectView} side of the subject, using a ${randomFinal.shotSize} shot size and positioning the subject in the ${randomFinal.subjectFraming} portion of the frame.`;
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
