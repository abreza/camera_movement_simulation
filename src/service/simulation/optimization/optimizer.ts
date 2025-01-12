import * as THREE from "three";
import { CameraParameters, SimulationInstruction } from "../instruction/types";
import { SubjectInfo } from "../../subjects/types";
import { initCameraParameters } from "../rule-based";
import { AXISES } from "../constants";
import {
  MAX_ITERATIONS,
  CONVERGENCE_THRESHOLD,
  EPSILON,
  LEARNING_RATE,
} from "./constants";
import { calculateTotalLoss } from "./losses";

export const optimizeCameraParameters = (
  instruction: SimulationInstruction,
  startCameraParameter?: CameraParameters,
  subjectInfo?: SubjectInfo
): CameraParameters[] => {
  if (!subjectInfo?.frames?.length) {
    return [];
  }

  let frames = initCameraParameters(
    instruction,
    startCameraParameter,
    subjectInfo
  );

  // for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
  //   const currentLoss = calculateTotalLoss(frames, instruction, subjectInfo);

  //   if (currentLoss < CONVERGENCE_THRESHOLD) {
  //     break;
  //   }

  //   const positionGradients: THREE.Vector3[] = [];
  //   const rotationGradients: THREE.Euler[] = [];
  //   const focalLengthGradients: number[] = [];

  //   for (let i = 0; i < instruction.frameCount; i++) {
  //     const frame = frames[i];
  //     const positionGradient = new THREE.Vector3();
  //     const rotationGradient = new THREE.Euler();
  //     let focalLengthGradient = 0;

  //     AXISES.forEach((axis) => {
  //       const originalValue = frame.position[axis];

  //       frame.position[axis] = originalValue + EPSILON;
  //       const lossPlus = calculateTotalLoss(frames, instruction, subjectInfo);

  //       frame.position[axis] = originalValue - EPSILON;
  //       const lossMinus = calculateTotalLoss(frames, instruction, subjectInfo);

  //       positionGradient[axis] = (lossPlus - lossMinus) / (2 * EPSILON);

  //       frame.position[axis] = originalValue;

  //       console.log(i, axis, lossPlus, lossMinus, positionGradient[axis]);
  //     });

  //     AXISES.forEach((axis) => {
  //       const originalValue = frame.rotation[axis];

  //       frame.rotation[axis] = originalValue + EPSILON;
  //       const lossPlus = calculateTotalLoss(frames, instruction, subjectInfo);

  //       frame.rotation[axis] = originalValue - EPSILON;
  //       const lossMinus = calculateTotalLoss(frames, instruction, subjectInfo);

  //       rotationGradient[axis] = (lossPlus - lossMinus) / (2 * EPSILON);

  //       frame.rotation[axis] = originalValue;
  //     });

  //     const originalFocalLength = frame.focalLength;

  //     frame.focalLength = originalFocalLength + EPSILON;
  //     const lossPlus = calculateTotalLoss(frames, instruction, subjectInfo);

  //     frame.focalLength = originalFocalLength - EPSILON;
  //     const lossMinus = calculateTotalLoss(frames, instruction, subjectInfo);

  //     focalLengthGradient = (lossPlus - lossMinus) / (2 * EPSILON);

  //     frame.focalLength = originalFocalLength;

  //     positionGradients.push(positionGradient);
  //     rotationGradients.push(rotationGradient);
  //     focalLengthGradients.push(focalLengthGradient);
  //   }

  //   for (let i = 0; i < instruction.frameCount; i++) {
  //     frames[i].position.sub(
  //       positionGradients[i].multiplyScalar(LEARNING_RATE)
  //     );

  //     frames[i].rotation.x -= rotationGradients[i].x * LEARNING_RATE;
  //     frames[i].rotation.y -= rotationGradients[i].y * LEARNING_RATE;
  //     frames[i].rotation.z -= rotationGradients[i].z * LEARNING_RATE;

  //     frames[i].focalLength -= focalLengthGradients[i] * LEARNING_RATE;
  //     frames[i].focalLength = Math.max(
  //       12,
  //       Math.min(200, frames[i].focalLength)
  //     );
  //   }
  // }

  return frames;
};
