import * as THREE from "three";

export enum ObjectClass {
  Chair = "chair",
  Table = "table",
  Laptop = "laptop",
  Book = "book",
  Tree = "tree",
}

export enum CameraAngle {
  LowAngle = "lowAngle",
  MediumAngle = "mediumAngle",
  HighAngle = "highAngle",
  BirdsEyeView = "birdsEyeView",

  // Other
  // EyeLevel = "eyeLevel",
  // DutchAngle = "dutchAngle",
  // WormsEyeView = "wormsEyeView",
  // OverTheShoulder = "overTheShoulder",
  // PointOfView = "pointOfView",
}

export enum ShotType {
  CloseUp = "closeUp",
  MediumShot = "mediumShot",
  LongShot = "longShot",

  // Other
  // ExtremeCloseUp = "extremeCloseUp",
  // MediumCloseUp = "mediumCloseUp",
  // MediumLongShot = "mediumLongShot",
  // FullShot = "fullShot",
  // ExtremeLongShot = "extremeLongShot",
  // TwoShot = "twoShot",
  // GroupShot = "groupShot",
  // InsertShot = "insertShot",
  // Cutaway = "cutaway",
  // EstablishingShot = "establishingShot",
}

export enum CameraMovement {
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

  FullZoomIn = "fullZoomIn",
  FullZoomOut = "fullZoomOut",
  HalfZoomIn = "halfZoomIn",
  HalfZoomOut = "halfZoomOut",
  ShortZoomIn = "shortZoomIn",
  ShortZoomOut = "shortZoomOut",

  ShortArcShotLeft = "shortArcShotLeft",
  ShortArcShotRight = "shortArcShotRight",
  HalfArcShotLeft = "halfArcShotLeft",
  HalfArcShotRight = "halfArcShotRight",
  FullArcShotLeft = "fullArcShotLeft",
  FullArcShotRight = "fullArcShotRight",

  PanAndTilt = "panAndTilt",
  DollyAndPan = "dollyAndPan",
  ZoomAndTruck = "zoomAndTruck",

  // Other
  // CraneJib = "craneJib",
  // Handheld = "handheld",
  // Steadicam = "steadicam",
  // TrackingShot = "trackingShot",
  // WhipPan = "whipPan",
  // DroneShot = "droneShot",
  // Shake = "shake",
  // RollingShutter = "rollingShutter",
}

export enum MovementEasing {
  Linear = "linear",

  // Ease In (slow start)
  EaseInQuad = "easeInQuad",
  EaseInCubic = "easeInCubic",
  EaseInQuart = "easeInQuart",
  EaseInQuint = "easeInQuint",

  // Ease Out (slow end)
  EaseOutQuad = "easeOutQuad",
  EaseOutCubic = "easeOutCubic",
  EaseOutQuart = "easeOutQuart",
  EaseOutQuint = "easeOutQuint",

  // Ease In Out (slow start and end)
  EaseInOutQuad = "easeInOutQuad",
  EaseInOutCubic = "easeInOutCubic",
  EaseInOutQuart = "easeInOutQuart",
  EaseInOutQuint = "easeInOutQuint",

  // Additional easing functions
  EaseInSine = "easeInSine",
  EaseOutSine = "easeOutSine",
  EaseInOutSine = "easeInOutSine",

  EaseInExpo = "easeInExpo",
  EaseOutExpo = "easeOutExpo",
  EaseInOutExpo = "easeInOutExpo",

  EaseInCirc = "easeInCirc",
  EaseOutCirc = "easeOutCirc",
  EaseInOutCirc = "easeInOutCirc",

  // Bounce
  EaseInBounce = "easeInBounce",
  EaseOutBounce = "easeOutBounce",
  EaseInOutBounce = "easeInOutBounce",

  // Elastic
  EaseInElastic = "easeInElastic",
  EaseOutElastic = "easeOutElastic",
  EaseInOutElastic = "easeInOutElastic",
}

export interface Subject {
  position: THREE.Vector3;
  size: THREE.Vector3;
  rotation: THREE.Euler;
  objectClass: ObjectClass;
}

export interface CinematographyInstruction {
  cameraMovement: CameraMovement;
  movementEasing: MovementEasing;
  frameCount: number;
  initialCameraAngle?: CameraAngle;
  initialShotType?: ShotType;
  subjectIndex?: number;
  // startCamera?: Partial<CameraFrame>;
  // endCamera?: Partial<CameraFrame>;
}

export interface CameraFrame {
  position: THREE.Vector3;
  angle: THREE.Euler;
  focalLength: number;
}
