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
  cameraAngle: CameraAngle;
  shotType: ShotType;
  cameraMovement: CameraMovement;
  subjectIndex: number;
  frameCount: number;
  startPosition?: THREE.Vector3;
  endPosition?: THREE.Vector3;
  startAngle?: THREE.Euler;
  endAngle?: THREE.Euler;
  startFocalLength?: number;
  endFocalLength?: number;
  easeFunction?: (t: number) => number;
}

export interface CameraFrame {
  position: THREE.Vector3;
  angle: THREE.Euler;
  focalLength: number;
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

export interface SimulationOptions {
  fps: number;
  duration: number;
  cameraSettings: CameraSettings;
  defaultEasing: (t: number) => number;
}

export interface SimulationResult {
  frames: CameraFrame[];
  duration: number;
  frameCount: number;
}
