import * as THREE from "three";
import {
  CameraParameters,
  SimpleMovement,
  Direction,
  MovementMode,
} from "../instruction/types";
import { SubjectFrame } from "../../subjects/types";
import { SCALE_FACTORS } from "../instruction/constants";

export const moveByEasing = (
  startParams: CameraParameters,
  movement: SimpleMovement,
  easedT: number[],
  subjectFrames?: SubjectFrame[],
  allFramesVisibility?: boolean
): CameraParameters[] => {
  const scaleFactor = SCALE_FACTORS[movement.scale];
  const frames: CameraParameters[] = [];

  const movementVectors = {
    [Direction.Left]: new THREE.Vector3(-1, 0, 0),
    [Direction.Right]: new THREE.Vector3(1, 0, 0),
    [Direction.Up]: new THREE.Vector3(0, 1, 0),
    [Direction.Down]: new THREE.Vector3(0, -1, 0),
  };

  const baseMovement = movementVectors[movement.direction];

  const totalDistance = 10 * scaleFactor;

  easedT.forEach((t, index) => {
    const frame = {
      position: new THREE.Vector3(),
      rotation: new THREE.Euler(),
      focalLength: startParams.focalLength,
      aspectRatio: startParams.aspectRatio,
    };

    if (movement.movementMode === MovementMode.Transition) {
      const movementAmount = baseMovement
        .clone()
        .multiplyScalar(totalDistance * t);
      frame.position.copy(startParams.position).add(movementAmount);
      frame.rotation.copy(startParams.rotation);

      if (subjectFrames && allFramesVisibility && subjectFrames[index]) {
        const lookAtMatrix = new THREE.Matrix4();
        lookAtMatrix.lookAt(
          frame.position,
          subjectFrames[index].position,
          new THREE.Vector3(0, 1, 0)
        );
        frame.rotation.setFromRotationMatrix(lookAtMatrix);
      }
    } else if (movement.movementMode === MovementMode.Rotation) {
      frame.position.copy(startParams.position);

      const totalRotation = (Math.PI / 4) * scaleFactor;
      const rotationAmount = totalRotation * t;

      const rotationAxis =
        movement.direction === Direction.Left ||
        movement.direction === Direction.Right
          ? new THREE.Vector3(0, 1, 0)
          : new THREE.Vector3(1, 0, 0);

      const quaternion = new THREE.Quaternion();
      quaternion.setFromEuler(startParams.rotation);
      const rotationQuaternion = new THREE.Quaternion();
      rotationQuaternion.setFromAxisAngle(
        rotationAxis,
        rotationAmount *
          (movement.direction === Direction.Left ||
          movement.direction === Direction.Up
            ? 1
            : -1)
      );

      quaternion.multiply(rotationQuaternion);
      frame.rotation.setFromQuaternion(quaternion);
    }

    frames.push(frame);
  });

  return frames;
};
