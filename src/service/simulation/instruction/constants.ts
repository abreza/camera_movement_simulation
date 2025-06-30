import { DEFAULT_FRAME_COUNT } from "../constants";
import {
  CameraVerticalAngle,
  DynamicMode,
  MovementEasing,
  Scale,
  ShotSize,
  SimulationInstruction,
  SubjectInFramePosition,
  SubjectView,
} from "./types";

export const SCALE_FACTORS = {
  [Scale.Small]: 0.3,
  [Scale.Medium]: 0.5,
  [Scale.Large]: 0.7,
  [Scale.Full]: 1.0,
};

export const defaultSimulationInstruction: SimulationInstruction = {
  frameCount: DEFAULT_FRAME_COUNT,
  setup: {
    config: {
      cameraAngle: CameraVerticalAngle.Eye,
      shotSize: ShotSize.MediumShot,
      subjectView: SubjectView.Front,
      subjectFraming: {
        position: SubjectInFramePosition.Center,
      },
    },
    kind: "init",
  },
  dynamic: {
    type: DynamicMode.Interpolation,
    easing: MovementEasing.Linear,
    subjectAwareInterpolation: false,
    complementSetup: {
      cameraAngle: undefined,
      shotSize: undefined,
      subjectView: undefined,
      subjectFraming: undefined,
    },
  },
  subjectIndex: 0,
  constraints: {
    allFramesVisibility: true,
    staticDistance: false,
    staticCameraSubjectRotation: false,
    lockedMovement: {
      left: false,
      right: false,
      up: false,
      down: false,
      forward: false,
      backward: false,
    },
    lockedRotation: {
      left: false,
      right: false,
      up: false,
      down: false,
      rollClockwise: false,
      rollNonClockwise: false,
    },
    maxAccelerate: 2,
    maxSpeed: undefined,
    importance: 1,
  },
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
