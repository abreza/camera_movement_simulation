import * as THREE from "three";

import { Subject, SubjectFrame } from "@/service/subjects/types";

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

export enum CameraZoomMovement {
  Static = "static",
  ZoomIn = "zoomIn",
  ZoomOut = "zoomOut",
}

export enum CameraSubjectDistanceMovement {
  Static = "static",
  DollyIn = "dollyIn",
  DollyOut = "dollyOut",
}

export enum CameraRotationMovement {
  Static = "static",
  PanLeft = "panLeft",
  PanRight = "panRight",
  TiltUp = "tiltUp",
  TiltDown = "tiltDown",
}

export enum CameraTranslationMovement {
  Static = "static",
  TruckLeft = "truckLeft",
  TruckRight = "truckRight",
  PedestalUp = "pedestalUp",
  PedestalDown = "pedestalDown",
}

export enum MovementScale {
  Short = "short",
  Medium = "medium",
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

export enum VisibilityConstraint {
  VisibleAtAllTimes = "visibleAtAllTimes",
  VisibleAtStart = "visibleAtStart",
  VisibleAtEnd = "visibleAtEnd",
}

export enum SubjectInFrame {
  InnerLeft = "innerLeft",
  InnerRight = "innerRight",
  InnerTop = "innerTop",
  InnerBottom = "innerBottom",
  InnerCenter = "innerCenter",
  OuterLeft = "outerLeft",
  OuterRight = "outerRight",
  OuterTop = "outerTop",
  OuterBottom = "outerBottom",
}

export type CinematographyInstruction = {
  maxFrameCount: number;
  movementEasing: MovementEasing;

  subjectIndex?: number;

  initialSetup: {
    cameraAngle?: CameraVerticalAngle;
    shotSize?: ShotSize;
    subjectView?: SubjectView;
    subjectInFrame?: SubjectInFrame;
  };

  endSetup: {
    cameraAngle?: CameraVerticalAngle;
    shotSize?: ShotSize;
    subjectView?: SubjectView;
    subjectInFrame?: SubjectInFrame;
  };

  movement: {
    translation?: { type: CameraTranslationMovement; scale?: MovementScale };
    rotation?: { type: CameraRotationMovement; scale?: MovementScale };
    zoom?: { type: CameraZoomMovement; scale?: MovementScale };
    distance?: { type: CameraSubjectDistanceMovement; scale?: MovementScale };
  };

  constraints?: {
    visibility?: VisibilityConstraint;
  };
};

export type CameraParameters = {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  focalLength: number;
  aspectRatio: number;
};

export type SimulationFrame = {
  camera: CameraParameters;
  subjectsFrames: Record<string, SubjectFrame[]>;
};

export type Simulation = {
  subjects: Subject[];
  instructions: CinematographyInstruction[];
  frames: SimulationFrame[];
};
