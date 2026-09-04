import { SubjectView } from "@/service/simulation/instruction/types";

import {
  CinematographySetup,
  SetupConfig,
  CameraMovementType,
  CameraVerticalAngle,
  SubjectInFramePosition,
} from "@/service/simulation/instruction/types";
import { getCloserShotSize, getFartherShotSize } from "./shotSize";

export function mapCinematographySetupToConfig(
  setup: Partial<CinematographySetup>
): SetupConfig {
  return {
    ...(setup.cameraAngle && { cameraAngle: setup.cameraAngle }),
    ...(setup.shotSize && { shotSize: setup.shotSize }),
    ...(setup.subjectView && { subjectView: setup.subjectView }),
    ...(setup.subjectFraming && {
      subjectFraming: { position: setup.subjectFraming },
    }),
  };
}

export function autoGenerateEndSetup(
  initial: CinematographySetup,
  movementType: CameraMovementType
): SetupConfig {
  const endSetup: SetupConfig = {};

  switch (movementType) {
    case CameraMovementType.DollyIn:
      endSetup.shotSize = getCloserShotSize(initial.shotSize);
      break;

    case CameraMovementType.DollyOut:
      endSetup.shotSize = getFartherShotSize(initial.shotSize);
      break;

    case CameraMovementType.ArcLeft:
      switch (initial.subjectView) {
        case SubjectView.Front:
          endSetup.subjectView = SubjectView.ThreeQuarterFrontRight;
          break;
        case SubjectView.ThreeQuarterFrontRight:
          endSetup.subjectView = SubjectView.Right;
          break;
        case SubjectView.Right:
          endSetup.subjectView = SubjectView.ThreeQuarterBackRight;
          break;
        case SubjectView.ThreeQuarterBackRight:
          endSetup.subjectView = SubjectView.Back;
          break;
        case SubjectView.Back:
          endSetup.subjectView = SubjectView.ThreeQuarterBackLeft;
          break;
        case SubjectView.ThreeQuarterBackLeft:
          endSetup.subjectView = SubjectView.Left;
          break;
        case SubjectView.Left:
          endSetup.subjectView = SubjectView.ThreeQuarterFrontLeft;
          break;
        case SubjectView.ThreeQuarterFrontLeft:
          endSetup.subjectView = SubjectView.Front;
          break;
      }
      break;

    case CameraMovementType.ArcRight:
      switch (initial.subjectView) {
        case SubjectView.Front:
          endSetup.subjectView = SubjectView.ThreeQuarterFrontLeft;
          break;
        case SubjectView.ThreeQuarterFrontLeft:
          endSetup.subjectView = SubjectView.Left;
          break;
        case SubjectView.Left:
          endSetup.subjectView = SubjectView.ThreeQuarterBackLeft;
          break;
        case SubjectView.ThreeQuarterBackLeft:
          endSetup.subjectView = SubjectView.Back;
          break;
        case SubjectView.Back:
          endSetup.subjectView = SubjectView.ThreeQuarterBackRight;
          break;
        case SubjectView.ThreeQuarterBackRight:
          endSetup.subjectView = SubjectView.Right;
          break;
        case SubjectView.Right:
          endSetup.subjectView = SubjectView.ThreeQuarterFrontRight;
          break;
        case SubjectView.ThreeQuarterFrontRight:
          endSetup.subjectView = SubjectView.Front;
          break;
      }
      break;

    case CameraMovementType.CraneUp:
      switch (initial.cameraAngle) {
        case CameraVerticalAngle.Low:
          endSetup.cameraAngle = CameraVerticalAngle.Eye;
          break;
        case CameraVerticalAngle.Eye:
          endSetup.cameraAngle = CameraVerticalAngle.High;
          break;
        case CameraVerticalAngle.High:
          endSetup.cameraAngle = CameraVerticalAngle.Overhead;
          break;
        case CameraVerticalAngle.Overhead:
          endSetup.cameraAngle = CameraVerticalAngle.BirdsEye;
          break;
      }
      break;

    case CameraMovementType.CraneDown:
      switch (initial.cameraAngle) {
        case CameraVerticalAngle.BirdsEye:
          endSetup.cameraAngle = CameraVerticalAngle.Overhead;
          break;
        case CameraVerticalAngle.Overhead:
          endSetup.cameraAngle = CameraVerticalAngle.High;
          break;
        case CameraVerticalAngle.High:
          endSetup.cameraAngle = CameraVerticalAngle.Eye;
          break;
        case CameraVerticalAngle.Eye:
          endSetup.cameraAngle = CameraVerticalAngle.Low;
          break;
      }
      break;

    case CameraMovementType.PanLeft:
      endSetup.subjectFraming = {
        position: SubjectInFramePosition.Right,
      };
      break;

    case CameraMovementType.PanRight:
      endSetup.subjectFraming = {
        position: SubjectInFramePosition.Left,
      };
      break;

    case CameraMovementType.TiltUp:
      endSetup.subjectFraming = {
        position: SubjectInFramePosition.Bottom,
      };
      break;

    case CameraMovementType.TiltDown:
      endSetup.subjectFraming = {
        position: SubjectInFramePosition.Top,
      };
      break;

    case CameraMovementType.TruckLeft:
      endSetup.subjectFraming = {
        position: SubjectInFramePosition.Left,
      };
      break;

    case CameraMovementType.TruckRight:
      endSetup.subjectFraming = {
        position: SubjectInFramePosition.Right,
      };
      break;

    case CameraMovementType.PedestalUp:
      endSetup.cameraAngle = CameraVerticalAngle.High;
      endSetup.subjectFraming = {
        position: SubjectInFramePosition.Bottom,
      };
      break;

    case CameraMovementType.PedestalDown:
      endSetup.cameraAngle = CameraVerticalAngle.Low;
      endSetup.subjectFraming = {
        position: SubjectInFramePosition.Top,
      };
      break;

    case CameraMovementType.Static:
    case CameraMovementType.Follow:
    case CameraMovementType.Track:
    default:
      break;
  }

  return endSetup;
}
