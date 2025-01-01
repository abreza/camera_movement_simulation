import {
  CameraParameters,
  CinematographyInstruction,
} from "../instruction/types";
import { SubjectInfo } from "../../subjects/types";
import { optimizeCameraParameters } from "./optimizer";

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

    const frames = optimizeCameraParameters(
      instruction,
      startCameraParameter,
      subjectInfo
    );

    cameraFrames = [...cameraFrames, ...frames];
    currentFrameNumber += frames.length;
  });

  return cameraFrames;
};
