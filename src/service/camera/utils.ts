import { Vector3, Euler, Quaternion, Matrix4, MathUtils } from "three";
import { Subject, CameraMovement } from "@/types/simulation";

export function lerp(start: number, end: number, t: number): number {
  return MathUtils.lerp(start, end, t);
}

export function lerpVector3(start: Vector3, end: Vector3, t: number): Vector3 {
  return new Vector3().lerpVectors(start, end, t);
}

export function lerpEuler(start: Euler, end: Euler, t: number): Euler {
  const startQuaternion = new Quaternion().setFromEuler(start);
  const endQuaternion = new Quaternion().setFromEuler(end);
  const slerpedQuaternion = new Quaternion().slerpQuaternions(
    startQuaternion,
    endQuaternion,
    t
  );
  return new Euler().setFromQuaternion(slerpedQuaternion);
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
  return new Euler().setFromQuaternion(
    new Quaternion().setFromRotationMatrix(
      new Matrix4().lookAt(position, target, new Vector3(0, 1, 0))
    )
  );
}

export function getSubjectCenter(subject: Subject): Vector3 {
  const centerOffset = new Vector3(0, subject.size.y / 2, 0);
  centerOffset.applyEuler(subject.rotation);
  return subject.position.clone().add(centerOffset);
}

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

export function applyShake(
  position: Vector3,
  angle: Euler,
  intensity: number = 0.05
): { position: Vector3; angle: Euler } {
  const shakePosition = position
    .clone()
    .add(
      new Vector3(
        (Math.random() - 0.5) * intensity,
        (Math.random() - 0.5) * intensity,
        (Math.random() - 0.5) * intensity
      )
    );
  const shakeAngle = angle.clone();
  shakeAngle.x += (Math.random() - 0.5) * intensity * 0.4;
  shakeAngle.y += (Math.random() - 0.5) * intensity * 0.4;
  return { position: shakePosition, angle: shakeAngle };
}

export function calculateArcPosition(
  center: Vector3,
  radius: number,
  angle: number,
  height: number
): Vector3 {
  return new Vector3(
    center.x + radius * Math.cos(angle),
    height,
    center.z + radius * Math.sin(angle)
  );
}

export function applyOscillation(
  position: Vector3,
  direction: Vector3,
  t: number,
  totalDistance: number,
  frequency: number = 2,
  amplitude: number = 0.1
): Vector3 {
  const oscillation =
    Math.sin(t * Math.PI * frequency) * amplitude * totalDistance;
  return position.clone().addScaledVector(direction.normalize(), oscillation);
}

export function getMovementFunction(
  movement: CameraMovement
): (current: any, target: any, t: number) => any {
  switch (movement) {
    case CameraMovement.Pan:
    case CameraMovement.Tilt:
    case CameraMovement.Dolly:
    case CameraMovement.Truck:
    case CameraMovement.Pedestal:
    case CameraMovement.Zoom:
      return lerp;
    case CameraMovement.CraneJib:
      return (current, target, t) => ({
        position: lerpVector3(current.position, target.position, t),
        angle: lerpEuler(current.angle, target.angle, t),
      });
    case CameraMovement.WhipPan:
      return (current, target, t) => {
        const whipEasedT =
          t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
        return lerp(current, target, whipEasedT);
      };
    default:
      return (current, target, t) => current;
  }
}
