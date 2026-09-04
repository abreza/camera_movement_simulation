import * as THREE from "three";
import { CameraParameters } from "../instruction/types";
import { DEFAULT_FRAME_COUNT, MIN_CAMERA_HEIGHT } from "../constants";

function applyPositionalConstraints(
  frames: CameraParameters[],
  maxSpeed: number,
  maxAcceleration: number,
  timeScale: number,
  minimumHeight: number
): CameraParameters[] {
  if (frames.length < 2) return frames;

  // Limits are expressed per step of the canonical exported 30-frame clip,
  // not per source-simulation frame.  Without this conversion, rendering the
  // same path at 100 vs 500 frames silently changed its labelled speed and
  // acceleration after dataset resampling.
  let previousCanonicalVelocity = new THREE.Vector3(0, 0, 0);

  for (let i = 1; i < frames.length; i++) {
    const currentPos = frames[i].position;
    const prevPos = frames[i - 1].position;

    const canonicalVelocity = currentPos
      .clone()
      .sub(prevPos)
      .multiplyScalar(timeScale);

    if (canonicalVelocity.length() > maxSpeed) {
      canonicalVelocity.normalize().multiplyScalar(maxSpeed);
    }

    const canonicalAcceleration = canonicalVelocity
      .clone()
      .sub(previousCanonicalVelocity)
      .multiplyScalar(timeScale);
    if (canonicalAcceleration.length() > maxAcceleration) {
      const clampedCanonicalAcceleration = canonicalAcceleration
        .clone()
        .normalize()
        .multiplyScalar(maxAcceleration);

      canonicalVelocity
        .copy(previousCanonicalVelocity)
        .addScaledVector(clampedCanonicalAcceleration, 1 / timeScale);
    }

    const sourceFrameVelocity = canonicalVelocity
      .clone()
      .divideScalar(timeScale);
    const nextPosition = prevPos.clone().add(sourceFrameVelocity);
    nextPosition.y = Math.max(minimumHeight, nextPosition.y);
    frames[i].position.copy(nextPosition);

    // Keep the integrator's state in sync with the position that was actually
    // emitted.  Previously the internal velocity could continue below the
    // floor while the later framing pass lifted only the output position,
    // producing both below-ground frames and apparent acceleration spikes.
    previousCanonicalVelocity
      .copy(nextPosition)
      .sub(prevPos)
      .multiplyScalar(timeScale);
  }

  return frames;
}

function applyRotationalConstraints(
  frames: CameraParameters[],
  maxAnglePerCanonicalFrame: number,
  timeScale: number
): CameraParameters[] {
  if (frames.length < 2) return frames;

  for (let i = 1; i < frames.length; i++) {
    const prevRot = frames[i - 1].rotation;
    const currRot = frames[i].rotation;

    const prevQuat = new THREE.Quaternion().setFromEuler(prevRot);
    const currQuat = new THREE.Quaternion().setFromEuler(currRot);

    const angle = prevQuat.angleTo(currQuat);

    const maxSourceFrameAngle = maxAnglePerCanonicalFrame / timeScale;
    if (angle > maxSourceFrameAngle) {
      const ratio = maxSourceFrameAngle / angle;

      const newQuat = prevQuat.clone().slerp(currQuat, ratio);

      frames[i].rotation.setFromQuaternion(newQuat);
    }
  }

  return frames;
}

export const applySpeedConstraints = (
  frames: CameraParameters[],
  maxSpeed?: number,
  maxAcceleration?: number,
  maxAnglePerFrame: number = (30 * Math.PI) / 180,
  minimumHeight: number = MIN_CAMERA_HEIGHT
) => {
  const safeMaxSpeed = maxSpeed ?? Number.POSITIVE_INFINITY;
  const safeMaxAcceleration = maxAcceleration ?? Number.POSITIVE_INFINITY;
  const timeScale = Math.max(
    1e-8,
    (frames.length - 1) / Math.max(1, DEFAULT_FRAME_COUNT - 1)
  );
  frames = applyPositionalConstraints(
    frames,
    safeMaxSpeed,
    safeMaxAcceleration,
    timeScale,
    minimumHeight
  );

  frames = applyRotationalConstraints(frames, maxAnglePerFrame, timeScale);

  return frames;
};

export const satisfiesSpeedConstraints = (
  frames: CameraParameters[],
  maxSpeed?: number,
  maxAcceleration?: number,
  maxAnglePerFrame: number = (30 * Math.PI) / 180,
  tolerance: number = 1e-5
): boolean => {
  if (frames.length < 2) return true;
  const safeMaxSpeed = maxSpeed ?? Number.POSITIVE_INFINITY;
  const safeMaxAcceleration = maxAcceleration ?? Number.POSITIVE_INFINITY;
  const timeScale = Math.max(
    1e-8,
    (frames.length - 1) / Math.max(1, DEFAULT_FRAME_COUNT - 1)
  );
  let previousCanonicalVelocity = new THREE.Vector3();

  for (let index = 1; index < frames.length; index++) {
    const canonicalVelocity = frames[index].position
      .clone()
      .sub(frames[index - 1].position)
      .multiplyScalar(timeScale);
    if (canonicalVelocity.length() > safeMaxSpeed + tolerance) return false;

    const canonicalAcceleration = canonicalVelocity
      .clone()
      .sub(previousCanonicalVelocity)
      .multiplyScalar(timeScale);
    if (
      canonicalAcceleration.length() >
      safeMaxAcceleration + tolerance
    ) {
      return false;
    }
    previousCanonicalVelocity.copy(canonicalVelocity);

    const previousQuaternion = new THREE.Quaternion().setFromEuler(
      frames[index - 1].rotation
    );
    const currentQuaternion = new THREE.Quaternion().setFromEuler(
      frames[index].rotation
    );
    if (
      previousQuaternion.angleTo(currentQuaternion) * timeScale >
      maxAnglePerFrame + tolerance
    ) {
      return false;
    }
  }
  return true;
};

export const measureCanonicalMotion = (
  frames: CameraParameters[]
): { maxSpeed: number; maxAcceleration: number; maxAngle: number } => {
  if (frames.length < 2) {
    return { maxSpeed: 0, maxAcceleration: 0, maxAngle: 0 };
  }
  const timeScale = Math.max(
    1e-8,
    (frames.length - 1) / Math.max(1, DEFAULT_FRAME_COUNT - 1)
  );
  let previousCanonicalVelocity = new THREE.Vector3();
  let measuredMaxSpeed = 0;
  let measuredMaxAcceleration = 0;
  let measuredMaxAngle = 0;
  for (let index = 1; index < frames.length; index++) {
    const canonicalVelocity = frames[index].position
      .clone()
      .sub(frames[index - 1].position)
      .multiplyScalar(timeScale);
    measuredMaxSpeed = Math.max(measuredMaxSpeed, canonicalVelocity.length());
    measuredMaxAcceleration = Math.max(
      measuredMaxAcceleration,
      canonicalVelocity
        .clone()
        .sub(previousCanonicalVelocity)
        .multiplyScalar(timeScale)
        .length()
    );
    previousCanonicalVelocity.copy(canonicalVelocity);
    measuredMaxAngle = Math.max(
      measuredMaxAngle,
      new THREE.Quaternion()
        .setFromEuler(frames[index - 1].rotation)
        .angleTo(new THREE.Quaternion().setFromEuler(frames[index].rotation)) *
        timeScale
    );
  }
  return {
    maxSpeed: measuredMaxSpeed,
    maxAcceleration: measuredMaxAcceleration,
    maxAngle: measuredMaxAngle,
  };
};
