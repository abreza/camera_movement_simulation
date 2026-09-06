import { SubjectInfo } from "../../subjects/types";
import { CameraParameters, SimulationInstruction } from "../instruction/types";
import { initCameraParameters } from "./index";

/** Generates a shot on the scene timeline using deterministic camera rules. */
export const generateCameraParameters = (
  instruction: SimulationInstruction,
  startCameraParameter?: CameraParameters,
  subjectInfo?: SubjectInfo,
  startFrameNumber: number = 0
): CameraParameters[] => {
  if (!Number.isSafeInteger(instruction.frameCount) || instruction.frameCount < 0) {
    throw new Error("Instruction frame count must be a non-negative integer.");
  }
  if (!Number.isSafeInteger(startFrameNumber) || startFrameNumber < 0) {
    throw new Error("Starting frame must be a non-negative integer.");
  }
  const subjectFrames = subjectInfo?.frames;
  if (instruction.frameCount === 0 || !subjectInfo || !subjectFrames?.length) {
    return [];
  }

  // Sample absolute scene time, holding the last pose once a track ends.
  // An exact-length window also makes the end setup refer to this shot's
  // final frame, rather than the end of the entire subject animation.
  const frames = Array.from({ length: instruction.frameCount }, (_, index) =>
    subjectFrames[Math.min(startFrameNumber + index, subjectFrames.length - 1)]
  );
  return initCameraParameters(instruction, startCameraParameter, {
    ...subjectInfo,
    frames,
  });
};

export const calculateCameraPositions = (
  instructions: SimulationInstruction[],
  subjectsInfo: SubjectInfo[]
): CameraParameters[] => {
  const cameraFrames: CameraParameters[] = [];

  instructions.forEach((instruction, instructionIndex) => {
    const subjectInfo = subjectsInfo[instruction.subjectIndex ?? 0];
    if (instruction.frameCount > 0 && !subjectInfo?.frames?.length) {
      throw new Error(
        `Instruction ${instructionIndex + 1}: the target subject has no animation frames.`
      );
    }
    const frames = generateCameraParameters(
      instruction,
      cameraFrames[cameraFrames.length - 1],
      subjectInfo,
      cameraFrames.length
    );
    // Avoid spreading a long shot into function arguments.
    for (const frame of frames) cameraFrames.push(frame);
  });

  return cameraFrames;
};
