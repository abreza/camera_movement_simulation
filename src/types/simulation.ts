import * as THREE from "three";

import { Subject } from "@/service/subjects/types";

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
  ArcLeft = "arcLeft",
  ArcRight = "arcRight",
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

export type DistanceConstraint = {
  minDistance: number;
  maxDistance: number;
};

export type SubjectSizeConstraint = {
  minSize: number; // Percentage of frame height
  maxSize: number;
};

export type CinematographyInstruction = {
  frameCount: number;
  movementEasing: MovementEasing;

  subjectIndex?: number;

  initialSetup: {
    distance?: number;
    cameraAngle?: CameraVerticalAngle;
    shotSize?: ShotSize;
    subjectView?: SubjectView;
    focusPoint?: THREE.Vector3;
  };

  movement: {
    translation?: { type: CameraTranslationMovement; scale?: MovementScale };
    rotation?: { type: CameraRotationMovement; scale?: MovementScale };
    zoom?: { type: CameraZoomMovement; scale?: MovementScale };
    distance?: { type: CameraSubjectDistanceMovement; scale?: MovementScale };
  };

  constraints?: {
    visibility?: VisibilityConstraint;
    distance?: DistanceConstraint;
    subjectSize?: SubjectSizeConstraint;
  };
};

export type CameraParameters = {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  focalLength: number;
  aspectRatio: number;
};

export type SubjectFrame = {
  position: THREE.Vector3;
  rotation: THREE.Euler;
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

export type SubjectInfo = {
  subject: Subject;
  frames?: SubjectFrame[];
};

export type SubjectFrameInfo = {
  subject: Subject;
  frame?: SubjectFrame;
};

export const DEFAULT_FRAME_COUNT = 180;
