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

export const SHOT_SIZE_ORDER = [
  ShotSize.ExtremeCloseUp,
  ShotSize.CloseUp,
  ShotSize.MediumCloseUp,
  ShotSize.MediumShot,
  ShotSize.FullShot,
  ShotSize.LongShot,
  ShotSize.VeryLongShot,
  ShotSize.ExtremeLongShot,
];

export function getShotSizeIndex(shotSize: ShotSize): number {
  return SHOT_SIZE_ORDER.indexOf(shotSize);
}
