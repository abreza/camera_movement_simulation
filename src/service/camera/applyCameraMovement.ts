import { CameraFrame, CameraMovement, Subject } from "@/types/simulation";
import * as THREE from "three";

export function applyCameraMovement(
  start: CameraFrame,
  movement: CameraMovement,
  easeValue: number,
  moveDistance: number,  
  subject?: Subject,
): CameraFrame {
  const result: CameraFrame = {
    position: start.position.clone(),
    angle: new THREE.Euler().copy(start.angle),
    focalLength: start.focalLength,
  };

  const rotateAngle = Math.PI / 4;
  const zoomFactor = 2;

  switch (movement) {
    case CameraMovement.PanLeft:
      result.angle.y += rotateAngle * easeValue;
      break;
    case CameraMovement.PanRight:
      result.angle.y -= rotateAngle * easeValue;
      break;
    case CameraMovement.TiltUp:
      result.angle.x += rotateAngle * easeValue;
      break;
    case CameraMovement.TiltDown:
      result.angle.x -= rotateAngle * easeValue;
      break;
    case CameraMovement.DollyIn:
      result.position.z -= moveDistance * easeValue;
      break;
    case CameraMovement.DollyOut:
      result.position.z += moveDistance * easeValue;
      break;
    case CameraMovement.TruckLeft:
      result.position.x -= moveDistance * easeValue;
      break;
    case CameraMovement.TruckRight:
      result.position.x += moveDistance * easeValue;
      break;
    case CameraMovement.PedestalUp:
      result.position.y += moveDistance * easeValue;
      break;
    case CameraMovement.PedestalDown:
      result.position.y -= moveDistance * easeValue;
      break;
    case CameraMovement.FullZoomIn:
      result.focalLength *= 1 + (zoomFactor - 1) * easeValue;
      break;
    case CameraMovement.FullZoomOut:
      result.focalLength /= 1 + (zoomFactor - 1) * easeValue;
      break;
    case CameraMovement.HalfZoomIn:
      result.focalLength *= 1 + (Math.sqrt(zoomFactor) - 1) * easeValue;
      break;
    case CameraMovement.HalfZoomOut:
      result.focalLength /= 1 + (Math.sqrt(zoomFactor) - 1) * easeValue;
      break;
    case CameraMovement.ShortZoomIn:
      result.focalLength *= 1 + (Math.pow(zoomFactor, 1 / 4) - 1) * easeValue;
      break;
    case CameraMovement.ShortZoomOut:
      result.focalLength /= 1 + (Math.pow(zoomFactor, 1 / 4) - 1) * easeValue;
      break;
    case CameraMovement.ShortArcShotLeft:
    case CameraMovement.ShortArcShotRight:
    case CameraMovement.HalfArcShotLeft:
    case CameraMovement.HalfArcShotRight:
    case CameraMovement.FullArcShotLeft:
    case CameraMovement.FullArcShotRight:
      if (subject) {
        const arcFactor = movement.startsWith("short")
          ? 0.25
          : movement.startsWith("half")
          ? 0.5
          : 1;
        const direction = movement.endsWith("Left") ? 1 : -1;
        const angle = Math.PI * 2 * arcFactor * easeValue * direction;
        const radius = start.position.distanceTo(subject.position);
        const newPosition = new THREE.Vector3(
          Math.sin(angle) * radius,
          start.position.y,
          Math.cos(angle) * radius
        );
        result.position.copy(newPosition.add(subject.position));
        result.angle.setFromQuaternion(
          new THREE.Quaternion().setFromRotationMatrix(
            new THREE.Matrix4().lookAt(
              newPosition,
              subject.position,
              new THREE.Vector3(0, 1, 0)
            )
          )
        );
      }
      break;
    case CameraMovement.PanAndTilt:
      result.angle.y += rotateAngle * easeValue;
      result.angle.x -= rotateAngle * easeValue;
      break;
    case CameraMovement.DollyAndPan:
      result.position.z -= moveDistance * easeValue;
      result.angle.y += rotateAngle * easeValue;
      break;
    case CameraMovement.ZoomAndTruck:
      result.focalLength *= 1 + (zoomFactor - 1) * easeValue;
      result.position.x += moveDistance * easeValue;
      break;
  }

  return result;
}
