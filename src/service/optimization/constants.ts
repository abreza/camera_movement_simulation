import { MovementScale } from "../simulation/types";

export const MOVEMENT_SCALE_FACTORS = {
  [MovementScale.Short]: 0.3,
  [MovementScale.Medium]: 0.6,
  [MovementScale.Full]: 1.0,
};

export const DEFAULT_FOCAL_LENGTH = 50;
export const DEFAULT_ASPECT_RATIO = 16 / 9;
export const LEARNING_RATE = 0.1;
export const EPSILON = 0.0001;
export const MAX_ITERATIONS = 100;
export const CONVERGENCE_THRESHOLD = 0.001;

export const AXISES = ["x", "y", "z"] as ("x" | "y" | "z")[];
