import * as THREE from "three";

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
}

export interface CameraFrame {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
}

export interface Subject {
  position: THREE.Vector3;
  size: THREE.Vector3;
}
