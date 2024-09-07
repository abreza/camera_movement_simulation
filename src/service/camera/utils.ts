import { Vector3, Euler, Quaternion } from "three";

export function interpolateVector3(
  start: Vector3,
  end: Vector3,
  t: number
): Vector3 {
  return new Vector3().lerpVectors(start, end, t);
}

export function interpolateEuler(start: Euler, end: Euler, t: number): Euler {
  const startQuaternion = new Quaternion().setFromEuler(start);
  const endQuaternion = new Quaternion().setFromEuler(end);
  const interpolatedQuaternion = new Quaternion().slerpQuaternions(
    startQuaternion,
    endQuaternion,
    t
  );
  return new Euler().setFromQuaternion(interpolatedQuaternion);
}
