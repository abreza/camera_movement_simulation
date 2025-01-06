import * as THREE from "three";

export enum CameraVerticalAngle {
  Low = "low",
  Eye = "eye",
  High = "high",
  Overhead = "overhead",
  BirdsEye = "birdsEye",
}

export enum ShotSize {
  CloseUp = "closeUp",
  MediumShot = "mediumShot",
  LongShot = "longShot",
}

export enum CameraSubjectDistance {
  Static = "static",
  DollyIn = "dollyIn",
  DollyOut = "dollyOut",
}

export enum Scale {
  Small = "small",
  Medium = "medium",
  Large = "large",
  Full = "full",
}

export enum MovementEasing {
  Linear = "linear",
  EaseInOut = "easeInOut",
  EaseIn = "easeIn",
  EaseOut = "easeOut",
  Smooth = "smooth",
  Bounce = "bounce",
  Elastic = "elastic",
  HandHeld = "handHeld",
  Anticipation = "anticipation",
}

export enum SubjectView {
  Front = "front",
  Back = "back",
  Left = "left",
  Right = "right",
  ThreeQuarterLeft = "threeQuarterLeft",
  ThreeQuarterRight = "threeQuarterRight",
}

export enum SubjectFramePosition {
  Left = "left",
  Right = "right",
  Top = "top",
  Bottom = "bottom",
  Center = "center",
  TopLeft = "topLeft",
  TopRight = "topRight",
  BottomLeft = "bottomLeft",
  BottomRight = "bottomRight",
}

export enum SubjectFrameZone {
  Inner = "inner",
  Outer = "outer",
}

export type MovementConfig<T> = {
  type: T;
  scale?: Scale;
};

export type DistanceConstraint = {
  type: CameraSubjectDistance;
  scale?: Scale;
};

export type SubjectFraming = {
  position: SubjectFramePosition;
  zone: SubjectFrameZone;
  scale: Scale;
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

export type ConstraintsConfig = {
  allFramesVisibility?: boolean;
  distance?: DistanceConstraint;
  staticPosition?: { x: boolean; y: boolean; z: boolean };
  staticRotation?: { x: boolean; y: boolean; z: boolean };
  importance?: number;
};

export enum InterpolationMode {
  Normal = "normal",
  SubjectAware = "subjectAware",
}

export type CinematographyInstruction = {
  frameCount: number;
  movementEasing: MovementEasing;
  interpolationMode?: InterpolationMode;
  subjectIndex?: number;
  initialSetup?: SetupConfig;
  endSetup?: SetupConfig;
  constraints?: ConstraintsConfig;
};
