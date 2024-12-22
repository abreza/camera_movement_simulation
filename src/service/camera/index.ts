import {
  CameraParameters,
  CinematographyInstruction,
  SubjectInfo,
} from "@/types/simulation";
import { calculateFramesForInstruction } from "./cameraFrameCalculator";

export const calculateCameraPositions = (
  instructions: CinematographyInstruction[],
  subjectsInfo: SubjectInfo[]
): CameraParameters[] => {
  let cameraFrames: CameraParameters[] = [];
  let currentFrameNumber = 0;

  instructions.forEach((instruction) => {
    const subjectInfo =
      instruction.subjectIndex !== undefined
        ? subjectsInfo[instruction.subjectIndex]
        : undefined;
    const startCameraParameter =
      cameraFrames.length > 0
        ? cameraFrames[cameraFrames.length - 1]
        : undefined;

    const frames = calculateFramesForInstruction(
      instruction,
      startCameraParameter,
      subjectInfo
    );

    cameraFrames = [...cameraFrames, ...frames];
    currentFrameNumber += instruction.frameCount;
  });

  return cameraFrames;
};
