import {
  CinematographyPrompt,
  MovementSpeed,
  CameraMovementType,
  ShotSize,
  SubjectView,
  SubjectInFramePosition,
  CameraVerticalAngle,
} from "@/service/simulation/instruction/types";

export const simulatedPrompts: CinematographyPrompt[] = [
  {
    movement: {
      type: CameraMovementType.PedestalDown,
      speed: MovementSpeed.Constant,
    },
    final: {
      shotSize: ShotSize.LongShot,
      subjectView: SubjectView.Left,
      subjectFraming: SubjectInFramePosition.Center,
    },
    frameCount: 60,
  },
  {
    movement: {
      type: CameraMovementType.DollyOut,
      speed: MovementSpeed.SmoothStartStop,
    },
    final: {
      shotSize: ShotSize.ExtremeLongShot,
      subjectView: SubjectView.Front,
      subjectFraming: SubjectInFramePosition.Center,
    },
    frameCount: 40,
  },
  {
    initial: {
      shotSize: ShotSize.ExtremeLongShot,
      subjectView: SubjectView.Front,
      subjectFraming: SubjectInFramePosition.Center,
    },
    movement: {
      type: CameraMovementType.DollyOut,
      speed: MovementSpeed.SmoothStartStop,
    },
    final: {
      shotSize: ShotSize.ExtremeLongShot,
      subjectView: SubjectView.Left,
      cameraAngle: CameraVerticalAngle.High,
      subjectFraming: SubjectInFramePosition.Center,
    },
    frameCount: 100,
  },
  {
    movement: {
      type: CameraMovementType.DollyOut,
      speed: MovementSpeed.SmoothStartStop,
    },
    final: {
      shotSize: ShotSize.ExtremeLongShot,
      subjectView: SubjectView.Back,
      cameraAngle: CameraVerticalAngle.Overhead,
      subjectFraming: SubjectInFramePosition.Center,
    },
    frameCount: 50,
  },
  {
    initial: {
      shotSize: ShotSize.ExtremeLongShot,
      subjectView: SubjectView.Back,
      cameraAngle: CameraVerticalAngle.Overhead,
      subjectFraming: SubjectInFramePosition.Center,
    },
    movement: {
      type: CameraMovementType.DollyIn,
      speed: MovementSpeed.SmoothStartStop,
    },
    final: {
      shotSize: ShotSize.LongShot,
      subjectView: SubjectView.Right,
      cameraAngle: CameraVerticalAngle.High,
      subjectFraming: SubjectInFramePosition.Center,
    },
    frameCount: 120,
  },
  {
    movement: {
      type: CameraMovementType.Follow,
      speed: MovementSpeed.SmoothStartStop,
    },
    frameCount: 90,
  },
  {
    movement: {
      type: CameraMovementType.DollyOut,
      speed: MovementSpeed.SmoothStartStop,
    },
    final: {
      shotSize: ShotSize.ExtremeLongShot,
      subjectView: SubjectView.Left,
      cameraAngle: CameraVerticalAngle.High,
      subjectFraming: SubjectInFramePosition.Center,
    },
    frameCount: 45,
  },
];
