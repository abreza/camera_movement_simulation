import { SubjectView } from "@/service/simulation/instruction/types";

import {
  CinematographySetup,
  SetupConfig,
  CameraMovementType,
  CameraVerticalAngle,
  SubjectInFramePosition,
  Scale,
} from "@/service/simulation/instruction/types";
import { getCloserShotSize, getFartherShotSize } from "./shotSize";

export function getQuarterSideView(currentView: SubjectView): SubjectView {
  switch (currentView) {
    case SubjectView.Front:
      return SubjectView.ThreeQuarterFrontLeft;
    case SubjectView.Left:
      return SubjectView.ThreeQuarterFrontLeft;
    case SubjectView.Right:
      return SubjectView.ThreeQuarterFrontRight;
    case SubjectView.Back:
      return SubjectView.ThreeQuarterBackRight;
    default:
      return SubjectView.ThreeQuarterFrontLeft;
  }
}

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
  const endSetup: SetupConfig = {
    cameraAngle: initial.cameraAngle,
    shotSize: initial.shotSize,
    subjectView: initial.subjectView,
    subjectFraming: { position: initial.subjectFraming },
  };

  switch (movementType) {
    case CameraMovementType.DollyIn:
    case CameraMovementType.DollyInZoomOut:
      endSetup.shotSize = getCloserShotSize(initial.shotSize);
      break;

    case CameraMovementType.DollyOut:
    case CameraMovementType.DollyOutZoomIn:
      endSetup.shotSize = getFartherShotSize(initial.shotSize);
      break;

    case CameraMovementType.ArcLeft:
    case CameraMovementType.ArcRight:
      endSetup.subjectView = getQuarterSideView(initial.subjectView);
      break;

    case CameraMovementType.DutchLeft:
    case CameraMovementType.DutchRight:
      endSetup.subjectFraming = {
        ...endSetup.subjectFraming,
        dutchAngleScale: Scale.Medium,
      };
      break;

    case CameraMovementType.CraneUp:
    case CameraMovementType.CraneDown:
      if (
        movementType === CameraMovementType.CraneUp &&
        initial.cameraAngle === CameraVerticalAngle.Eye
      ) {
        endSetup.cameraAngle = CameraVerticalAngle.High;
      } else if (
        movementType === CameraMovementType.CraneDown &&
        initial.cameraAngle === CameraVerticalAngle.Eye
      ) {
        endSetup.cameraAngle = CameraVerticalAngle.Low;
      }
      break;

    case CameraMovementType.PanLeft:
      endSetup.subjectFraming = {
        ...endSetup.subjectFraming,
        position: SubjectInFramePosition.Right,
      };
      break;

    case CameraMovementType.PanRight:
      endSetup.subjectFraming = {
        ...endSetup.subjectFraming,
        position: SubjectInFramePosition.Left,
      };
      break;

    case CameraMovementType.TiltUp:
      endSetup.subjectFraming = {
        ...endSetup.subjectFraming,
        position: SubjectInFramePosition.Bottom,
      };
      break;

    case CameraMovementType.TiltDown:
      endSetup.subjectFraming = {
        ...endSetup.subjectFraming,
        position: SubjectInFramePosition.Top,
      };
      break;

    case CameraMovementType.TruckLeft:
      endSetup.subjectFraming = {
        ...endSetup.subjectFraming,
        position: SubjectInFramePosition.Left,
      };
      break;

    case CameraMovementType.TruckRight:
      endSetup.subjectFraming = {
        ...endSetup.subjectFraming,
        position: SubjectInFramePosition.Right,
      };
      break;

    case CameraMovementType.PedestalUp:
      endSetup.cameraAngle = CameraVerticalAngle.High;
      endSetup.subjectFraming = {
        ...endSetup.subjectFraming,
        position: SubjectInFramePosition.Bottom,
      };
      break;

    case CameraMovementType.PedestalDown:
      endSetup.cameraAngle = CameraVerticalAngle.Low;
      endSetup.subjectFraming = {
        ...endSetup.subjectFraming,
        position: SubjectInFramePosition.Top,
      };
      break;

    default:
      break;
  }

  return endSetup;
}
