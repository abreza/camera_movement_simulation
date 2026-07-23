import {
  CameraVerticalAngle,
  ShotSize,
  SubjectView,
  SubjectInFramePosition,
  CameraMovementType,
  MovementSpeed,
  CinematographyPrompt,
} from "@/service/simulation/instruction/types";

export const defaultCinematographyPrompt: CinematographyPrompt = {
  initial: {
    cameraAngle: CameraVerticalAngle.Eye,
    shotSize: ShotSize.MediumShot,
    subjectView: SubjectView.Front,
    subjectFraming: SubjectInFramePosition.Center,
  },
  movement: {
    type: CameraMovementType.DollyIn,
    speed: MovementSpeed.Constant,
  },
};
