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

export type LockedMovement = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  forward: boolean;
  backward: boolean;
};

export type LockedRotation = {
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
  lockedMovement?: LockedMovement;
  lockedRotation?: LockedRotation;
  maxAccelerate?: number;
  maxSpeed?: number;
  importance?: number;
};

export enum DynamicMode {
  Interpolation = "interpolation",
  Simple = "simple",
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

  Smooth = "smooth",
}

export enum Randomness {
  HandHeld = "handHeld",
  Shaky = "shaky",
}

export type DynamicBase = {
  type: DynamicMode;
  easing: MovementEasing;
  randomness?: Randomness;
};

export type InterpolationDynamic = DynamicBase & {
  type: DynamicMode.Interpolation;
  complementSetup: SetupConfig;
  subjectAwareInterpolation?: boolean;
};

export enum Direction {
  Left = "left",
  Right = "right",
  Up = "up",
  Down = "down",
  Forward = "forward",
  Backward = "backward",
}

export enum MovementMode {
  Transition = "transition",
  Rotation = "rotation",
  Arc = "arc",
  Roll = "roll",
}

export enum Scale {
  Small = "small",
  Medium = "medium",
  Large = "large",
  Full = "full",
}

export type SimpleMovement = DynamicBase & {
  type: DynamicMode.Simple;
  scale: Scale;
  direction: Direction;
  movementMode: MovementMode;
};

export type InstructionDynamic = InterpolationDynamic | SimpleMovement;

export type SimulationInstruction = {
  setup: {
    config: SetupConfig;
    kind: "init" | "end";
  };
  dynamic: InstructionDynamic;
  constraints?: ConstraintsConfig;
  frameCount: number;
  subjectIndex?: number;
};

export enum CameraMovementType {
  Static = "static",

  Follow = "follow",
  Track = "track",

  DollyIn = "dollyIn",
  DollyOut = "dollyOut",

  PanLeft = "panLeft",
  PanRight = "panRight",
  TiltUp = "tiltUp",
  TiltDown = "tiltDown",

  TruckLeft = "truckLeft",
  TruckRight = "truckRight",
  PedestalUp = "pedestalUp",
  PedestalDown = "pedestalDown",

  ArcLeft = "arcLeft",
  ArcRight = "arcRight",

  CraneUp = "craneUp",
  CraneDown = "craneDown",

  DutchLeft = "dutchLeft",
  DutchRight = "dutchRight",
}

export enum MovementSpeed {
  SlowToFast = "slowToFast",
  FastToSlow = "fastToSlow",
  Constant = "constant",
  SmoothStartStop = "smoothStartStop",
}

export type CinematographySetup = {
  cameraAngle: CameraVerticalAngle;
  shotSize: ShotSize;
  subjectView: SubjectView;
  subjectFraming: SubjectInFramePosition;
};

export type CinematographyPrompt = {
  initial?: Partial<CinematographySetup>;
  movement: {
    type: CameraMovementType;
    speed: MovementSpeed;
  };
  final?: Partial<CinematographySetup>;
  frameCount?: number;
};
