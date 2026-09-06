// Compatibility for older imports. All generation uses camera rules;
// there is no optimization pass or numerical solver.
export {
  calculateCameraPositions,
  generateCameraParameters as optimizeCameraParameters,
} from "../rule-based/sequence";
