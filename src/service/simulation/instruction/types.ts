import * as THREE from "three";

export enum CameraVerticalAngle {
  Low = "low",
  Eye = "eye",
  High = "high",
  Overhead = "overhead",
  BirdsEye = "birdsEye",
}

export enum ShotSize {
  ExtremeCloseUp = "extremeCloseUp",
  CloseUp = "closeUp",
  MediumCloseUp = "mediumCloseUp",
  MediumShot = "mediumShot",
  FullShot = "fullShot",
  LongShot = "longShot",
  VeryLongShot = "veryLongShot",
  ExtremeLongShot = "extremeLongShot",
}

export enum Scale {
  Small = "small",
  Medium = "medium",
  Large = "large",
  Full = "full",
}

export enum MovementEasing {
  Linear = "linear",

  EaseInSine = "easeInSine",
  EaseOutSine = "easeOutSine",
  EaseInOutSine = "easeInOutSine",

  EaseInQuad = "easeInQuad",
  EaseOutQuad = "easeOutQuad",
  EaseInOutQuad = "easeInOutQuad",

  EaseInCubic = "easeInCubic",
  EaseOutCubic = "easeOutCubic",
  EaseInOutCubic = "easeInOutCubic",

  EaseInQuart = "easeInQuart",
  EaseOutQuart = "easeOutQuart",
  EaseInOutQuart = "easeInOutQuart",

  EaseInQuint = "easeInQuint",
  EaseOutQuint = "easeOutQuint",
  EaseInOutQuint = "easeInOutQuint",

  EaseInExpo = "easeInExpo",
  EaseOutExpo = "easeOutExpo",
  EaseInOutExpo = "easeInOutExpo",

  EaseInCirc = "easeInCirc",
  EaseOutCirc = "easeOutCirc",
  EaseInOutCirc = "easeInOutCirc",

  EaseInBack = "easeInBack",
  EaseOutBack = "easeOutBack",
  EaseInOutBack = "easeInOutBack",

  EaseInElastic = "easeInElastic",
  EaseOutElastic = "easeOutElastic",
  EaseInOutElastic = "easeInOutElastic",

  EaseInBounce = "easeInBounce",
  EaseOutBounce = "easeOutBounce",
  EaseInOutBounce = "easeInOutBounce",

  HandHeld = "handHeld",
  Anticipation = "anticipation",
  Smooth = "smooth",
}

export enum SubjectView {
  Front = "front",
  Back = "back",
  Left = "left",
  Right = "right",
  ThreeQuarterFrontLeft = "threeQuarterFrontLeft",
  ThreeQuarterFrontRight = "threeQuarterFrontRight",
  ThreeQuarterBackLeft = "threeQuarterBackLeft",
  ThreeQuarterBackRight = "threeQuarterBackRight",
}

export enum SubjectInFramePosition {
  Left = "left",
  Right = "right",
  Top = "top",
  Bottom = "bottom",
  Center = "center",
  TopLeft = "topLeft",
  TopRight = "topRight",
  BottomLeft = "bottomLeft",
  BottomRight = "bottomRight",
  OuterLeft = "outerLeft",
  OuterRight = "outerRight",
  OuterTop = "outerTop",
  OuterBottom = "outerBottom",
}

export type MovementConfig<T> = {
  type: T;
  scale?: Scale;
};

export type SubjectFraming = {
  position?: SubjectInFramePosition;
  dutchAngleScale?: Scale;
};

export type SetupConfig = {
  cameraAngle?: CameraVerticalAngle;
  shotSize?: ShotSize;
  subjectView?: SubjectView;
  subjectFraming?: SubjectFraming;
};

export type CameraParameters = {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  focalLength: number;
  aspectRatio: number;
};

export type StaticPosition = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  forward: boolean;
  backward: boolean;
};

export type StaticRotation = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  rollClockwise: boolean;
  rollNonClockwise: boolean;
};

export type ConstraintsConfig = {
  allFramesVisibility?: boolean;
  staticDistance?: boolean;
  staticCameraSubjectRotation?: boolean;
  staticPosition?: StaticPosition;
  staticRotation?: StaticRotation;
  maxAccelerate?: number;
  maxSpeed?: number;
  importance?: number;
};

export type SimulationInstruction = {
  frameCount: number;
  initialSetup: SetupConfig;
  movementEasing: MovementEasing;
  subjectAwareInterpolation?: boolean;
  subjectIndex?: number;
  endSetup?: SetupConfig;
  constraints?: ConstraintsConfig;
};

export enum CameraMovementType {
  Static = "static",

  PanLeft = "panLeft",
  PanRight = "panRight",
  TiltUp = "tiltUp",
  TiltDown = "tiltDown",
  DollyIn = "dollyIn",
  DollyOut = "dollyOut",
  TruckLeft = "truckLeft",
  TruckRight = "truckRight",
  PedestalUp = "pedestalUp",
  PedestalDown = "pedestalDown",

  ArcLeft = "arcLeft",
  ArcRight = "arcRight",

  CraneUp = "craneUp",
  CraneDown = "craneDown",

  DollyOutZoomIn = "dollyOutZoomIn",
  DollyInZoomOut = "dollyInZoomOut",

  DutchLeft = "dutchLeft",
  DutchRight = "dutchRight",

  Follow = "follow",
}

export enum MovementSpeed {
  SlowToFast = "slowToFast",
  FastToSlow = "fastToSlow",
  Constant = "constant",
  DeliberateStartStop = "deliberateStartStop",
}

export type CinematographySetup = {
  cameraAngle: CameraVerticalAngle;
  shotSize: ShotSize;
  subjectView: SubjectView;
  subjectFraming: SubjectInFramePosition;
};

export type CinematographyPrompt = {
  initial: CinematographySetup;
  movement: {
    type: CameraMovementType;
    speed: MovementSpeed;
  };
  final: Partial<CinematographySetup>;
};
