import * as THREE from "three";

export enum ObjectClass {
  Chair = "chair",
  Table = "table",
  Laptop = "laptop",
  Book = "book",
  Tree = "tree",
}
export const colors = [
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "black",
] as const;

export type Color = (typeof colors)[number];

export enum CameraAngle {
  EyeLevel = "eyeLevel",
  LowAngle = "lowAngle",
  HighAngle = "highAngle",
  DutchAngle = "dutchAngle",
  BirdsEyeView = "birdsEyeView",
  WormsEyeView = "wormsEyeView",
  OverTheShoulder = "overTheShoulder",
  PointOfView = "pointOfView",
}

export enum ShotType {
  ExtremeCloseUp = "extremeCloseUp",
  CloseUp = "closeUp",
  MediumCloseUp = "mediumCloseUp",
  MediumShot = "mediumShot",
  MediumLongShot = "mediumLongShot",
  FullShot = "fullShot",
  LongShot = "longShot",
  ExtremeLongShot = "extremeLongShot",
  TwoShot = "twoShot",
  GroupShot = "groupShot",
  InsertShot = "insertShot",
  Cutaway = "cutaway",
  EstablishingShot = "establishingShot",
}

export enum CameraMovement {
  Pan = "pan",
  Tilt = "tilt",
  Dolly = "dolly",
  Truck = "truck",
  Pedestal = "pedestal",
  CraneJib = "craneJib",
  Handheld = "handheld",
  Steadicam = "steadicam",
  Zoom = "zoom",
  TrackingShot = "trackingShot",
  WhipPan = "whipPan",
  ArcShot = "arcShot",
  DroneShot = "droneShot",
}

export interface Subject {
  position: THREE.Vector3;
  size: THREE.Vector3;
  rotation: THREE.Euler;
  objectClass: ObjectClass;
  color: Color;
}

export interface CinematographyInstruction {
  cameraAngle?: CameraAngle;
  shotType?: ShotType;
  cameraMovement?: CameraMovement;
  subjectIndex: number;
  frameCount: number;
  startPosition?: THREE.Vector3;
  endPosition?: THREE.Vector3;
  startLookAt?: THREE.Vector3;
  endLookAt?: THREE.Vector3;
  startFocalLength?: number;
  endFocalLength?: number;
  startRotation?: THREE.Euler;
  endRotation?: THREE.Euler;
  easeFunction?: (t: number) => number;
}

export interface CameraFrame {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  focalLength: number;
  rotation: THREE.Euler;
}

export interface Scene {
  subjects: Subject[];
  cameraInstructions: CinematographyInstruction[];
}

export interface CameraSettings {
  nearClippingPlane: number;
  farClippingPlane: number;
  aspectRatio: number;
  initialFocalLength: number;
}

export type EasingFunction = (t: number) => number;

export interface SimulationOptions {
  fps: number;
  duration: number;
  cameraSettings: CameraSettings;
  defaultEasing: EasingFunction;
}

export interface SimulationResult {
  frames: CameraFrame[];
  duration: number;
  frameCount: number;
}
