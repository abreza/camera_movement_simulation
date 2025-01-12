import * as THREE from "three";
import { CameraParameters } from "../instruction/types";

export function applyPositionalConstraints(
  frames: CameraParameters[],
  maxSpeed: number,
  maxAcceleration: number
): CameraParameters[] {
  if (frames.length < 2) return frames;

  let prevVelocity = new THREE.Vector3(0, 0, 0);

  for (let i = 1; i < frames.length; i++) {
    const currentPos = frames[i].position;
    const prevPos = frames[i - 1].position;

    const currentVelocity = currentPos.clone().sub(prevPos);

    if (currentVelocity.length() > maxSpeed) {
      currentVelocity.normalize().multiplyScalar(maxSpeed);
    }

    const acceleration = currentVelocity.clone().sub(prevVelocity);
    if (acceleration.length() > maxAcceleration) {
      const clampedAcceleration = acceleration
        .clone()
        .normalize()
        .multiplyScalar(maxAcceleration);

      currentVelocity.copy(prevVelocity).add(clampedAcceleration);
    }

    frames[i].position.copy(prevPos).add(currentVelocity);

    prevVelocity.copy(currentVelocity);
  }

  return frames;
}

export function applyRotationalConstraints(
  frames: CameraParameters[],
  maxAnglePerFrame: number
): CameraParameters[] {
  if (frames.length < 2) return frames;

  for (let i = 1; i < frames.length; i++) {
    const prevRot = frames[i - 1].rotation;
    const currRot = frames[i].rotation;

    const prevQuat = new THREE.Quaternion().setFromEuler(prevRot);
    const currQuat = new THREE.Quaternion().setFromEuler(currRot);

    const angle = prevQuat.angleTo(currQuat);

    if (angle > maxAnglePerFrame) {
      const ratio = maxAnglePerFrame / angle;

      const newQuat = prevQuat.clone().slerp(currQuat, ratio);

      frames[i].rotation.setFromQuaternion(newQuat);
    }
  }

  return frames;
}
