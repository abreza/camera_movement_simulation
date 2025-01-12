import {
  CameraVerticalAngle,
  ShotSize,
  SubjectView,
  SubjectInFramePosition,
  CameraMovementType,
  MovementSpeed,
} from "@/service/simulation/instruction/types";

export const cameraVerticalAngleLabels: Record<CameraVerticalAngle, string> = {
  [CameraVerticalAngle.Low]: "Low",
  [CameraVerticalAngle.Eye]: "Eye Level",
  [CameraVerticalAngle.High]: "High",
  [CameraVerticalAngle.Overhead]: "Overhead",
  [CameraVerticalAngle.BirdsEye]: "Bird's Eye",
};

export const shotSizeLabels: Record<ShotSize, string> = {
  [ShotSize.ExtremeCloseUp]: "Extreme Close-Up",
  [ShotSize.CloseUp]: "Close-Up",
  [ShotSize.MediumCloseUp]: "Medium Close-Up",
  [ShotSize.MediumShot]: "Medium Shot",
  [ShotSize.FullShot]: "Full Shot",
  [ShotSize.LongShot]: "Long Shot",
  [ShotSize.VeryLongShot]: "Very Long Shot",
  [ShotSize.ExtremeLongShot]: "Extreme Long Shot",
};

export const subjectViewLabels: Record<SubjectView, string> = {
  [SubjectView.Front]: "Front",
  [SubjectView.Back]: "Back",
  [SubjectView.Left]: "Left Side",
  [SubjectView.Right]: "Right Side",
  [SubjectView.ThreeQuarterFrontLeft]: "Three Quarter Front Left",
  [SubjectView.ThreeQuarterFrontRight]: "Three Quarter Front Right",
  [SubjectView.ThreeQuarterBackLeft]: "Three Quarter Back Left",
  [SubjectView.ThreeQuarterBackRight]: "Three Quarter Back Right",
};

export const subjectInFramePositionLabels: Record<
  SubjectInFramePosition,
  string
> = {
  [SubjectInFramePosition.Left]: "Left",
  [SubjectInFramePosition.Right]: "Right",
  [SubjectInFramePosition.Top]: "Top",
  [SubjectInFramePosition.Bottom]: "Bottom",
  [SubjectInFramePosition.Center]: "Center",
  [SubjectInFramePosition.TopLeft]: "Top Left",
  [SubjectInFramePosition.TopRight]: "Top Right",
  [SubjectInFramePosition.BottomLeft]: "Bottom Left",
  [SubjectInFramePosition.BottomRight]: "Bottom Right",
  [SubjectInFramePosition.OuterLeft]: "Far Left",
  [SubjectInFramePosition.OuterRight]: "Far Right",
  [SubjectInFramePosition.OuterTop]: "Far Top",
  [SubjectInFramePosition.OuterBottom]: "Far Bottom",
};

export const cameraMovementTypeLabels: Record<CameraMovementType, string> = {
  [CameraMovementType.Static]: "Static",
  [CameraMovementType.PanLeft]: "Pan Left",
  [CameraMovementType.PanRight]: "Pan Right",
  [CameraMovementType.TiltUp]: "Tilt Up",
  [CameraMovementType.TiltDown]: "Tilt Down",
  [CameraMovementType.DollyIn]: "Dolly In",
  [CameraMovementType.DollyOut]: "Dolly Out",
  [CameraMovementType.TruckLeft]: "Truck Left",
  [CameraMovementType.TruckRight]: "Truck Right",
  [CameraMovementType.PedestalUp]: "Pedestal Up",
  [CameraMovementType.PedestalDown]: "Pedestal Down",
  [CameraMovementType.ArcLeft]: "Arc Left",
  [CameraMovementType.ArcRight]: "Arc Right",
  [CameraMovementType.CraneUp]: "Crane Up",
  [CameraMovementType.CraneDown]: "Crane Down",
  [CameraMovementType.DollyOutZoomIn]: "Dolly Out & Zoom In",
  [CameraMovementType.DollyInZoomOut]: "Dolly In & Zoom Out",
  [CameraMovementType.DutchLeft]: "Dutch Left",
  [CameraMovementType.DutchRight]: "Dutch Right",
  [CameraMovementType.Follow]: "Follow",
};

export const movementSpeedLabels: Record<MovementSpeed, string> = {
  [MovementSpeed.SlowToFast]: "Slow to Fast",
  [MovementSpeed.FastToSlow]: "Fast to Slow",
  [MovementSpeed.Constant]: "Constant",
  [MovementSpeed.DeliberateStartStop]: "Deliberate Start/Stop",
};

export const getEnumLabel = (value: string, enumType: string): string => {
  switch (enumType) {
    case "CameraVerticalAngle":
      return cameraVerticalAngleLabels[value as CameraVerticalAngle] || value;
    case "ShotSize":
      return shotSizeLabels[value as ShotSize] || value;
    case "SubjectView":
      return subjectViewLabels[value as SubjectView] || value;
    case "SubjectInFramePosition":
      return (
        subjectInFramePositionLabels[value as SubjectInFramePosition] || value
      );
    case "CameraMovementType":
      return cameraMovementTypeLabels[value as CameraMovementType] || value;
    case "MovementSpeed":
      return movementSpeedLabels[value as MovementSpeed] || value;
    default:
      return value;
  }
};
