export const DEFAULT_FRAME_COUNT = 30;
export const DEFAULT_FOCAL_LENGTH = 37.52;
export const DEFAULT_ASPECT_RATIO = 16 / 9;

// `THREE.PerspectiveCamera.setFocalLength` uses millimetres and a 35 mm
// horizontal film gauge by default.  Keeping the same physical unit here is
// important: the previous value (3500) made the hand-written framing FOV about
// 176 degrees while Three.js rendered a roughly 29 degree vertical FOV.
export const SENSOR_WIDTH = 35;
export const SENSOR_HEIGHT = SENSOR_WIDTH / DEFAULT_ASPECT_RATIO;
export const MIN_CAMERA_HEIGHT = 0.1;

export const AXISES = ["x", "y", "z"] as ("x" | "y" | "z")[];
