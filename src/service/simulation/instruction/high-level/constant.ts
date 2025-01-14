import {
  CameraVerticalAngle,
  ShotSize,
  SubjectView,
  SubjectInFramePosition,
  CameraMovementType,
  MovementSpeed,
} from "@/service/simulation/instruction/types";

export const DEFAULT_START_CAMERA_SETUP = {
  cameraAngle: CameraVerticalAngle.Eye,
  shotSize: ShotSize.MediumShot,
  subjectView: SubjectView.Front,
  subjectFraming: SubjectInFramePosition.Center,
};

export const DEFAULT_END_CAMERA_SETUP = {
  cameraAngle: undefined,
  shotSize: undefined,
  subjectView: undefined,
  subjectFraming: undefined,
};

export const DEFAULT_MOVEMENT = {
  type: CameraMovementType.DollyIn,
  speed: MovementSpeed.Constant,
};
