import { Subject } from "@/types/simulation";
import { Vector3, Euler, Quaternion, Matrix4 } from "three";

export function lerp(start: number, end: number, t: number): number {
  return start * (1 - t) + end * t;
}

export function calculateRequiredDistance(
  subjectSize: Vector3,
  focalLength: number,
  sensorHeight: number = 24
): number {
  const fov = 2 * Math.atan(sensorHeight / (2 * focalLength));
  const subjectHeight = Math.max(subjectSize.y, subjectSize.x);
  return subjectHeight / 2 / Math.tan(fov / 2);
}

export function lookAt(position: Vector3, target: Vector3): Euler {
  const rotation = new Euler().setFromQuaternion(
    new Quaternion().setFromRotationMatrix(
      new Matrix4().lookAt(position, target, new Vector3(0, 1, 0))
    )
  );
  return rotation;
}

export function getSubjectCenter(subject: Subject): Vector3 {
  const centerOffset = new Vector3(
    subject.size.x / 2,
    subject.size.y / 2,
    subject.size.z / 2
  );

  centerOffset.applyEuler(subject.rotation);

  const center = subject.position.clone().add(centerOffset);

  return center;
}

export const lerpEuler = (start: Euler, end: Euler, t: number): Euler => {
  const startQuaternion = new Quaternion().setFromEuler(start);
  const endQuaternion = new Quaternion().setFromEuler(end);
  const slerpedQuaternion = new Quaternion().slerpQuaternions(
    startQuaternion,
    endQuaternion,
    t
  );
  return new Euler().setFromQuaternion(slerpedQuaternion);
};

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easedLerp(
  start: number,
  end: number,
  t: number,
  easingFn: (t: number) => number
): number {
  return lerp(start, end, easingFn(t));
}
