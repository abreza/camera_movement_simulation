import {
  CinematographyInstruction,
  Subject,
  CameraMovement,
} from "@/types/simulation";
import * as THREE from "three";
import { applyHandheldEffect } from "./utils";

export function applyMovement(
  instruction: CinematographyInstruction,
  subject: Subject,
  startPosition: THREE.Vector3,
  startAngle: THREE.Euler,
  endPosition: THREE.Vector3,
  endAngle: THREE.Euler,
  startFocalLength: number,
  endFocalLength: number
) {
  const subjectPosition = subject.position;
  const subjectSize = subject.size;

  // Helper function to get lookAt vector from angle
  const getLookAtFromAngle = (position: THREE.Vector3, angle: THREE.Euler) => {
    return new THREE.Vector3(0, 0, -1).applyEuler(angle).add(position);
  };

  // Helper function to set angle from lookAt
  const setAngleFromLookAt = (
    position: THREE.Vector3,
    lookAt: THREE.Vector3,
    angle: THREE.Euler
  ) => {
    const direction = new THREE.Vector3()
      .subVectors(lookAt, position)
      .normalize();
    angle.setFromRotationMatrix(
      new THREE.Matrix4().lookAt(
        new THREE.Vector3(),
        direction,
        new THREE.Vector3(0, 1, 0)
      )
    );
  };

  const startLookAt = getLookAtFromAngle(startPosition, startAngle);
  let endLookAt = getLookAtFromAngle(endPosition, endAngle);

  switch (instruction.cameraMovement) {
    case CameraMovement.Dolly:
      const dollyDirection = new THREE.Vector3()
        .subVectors(subjectPosition, startPosition)
        .normalize();
      endPosition
        .copy(startPosition)
        .addScaledVector(dollyDirection, subjectSize.z);
      break;
    case CameraMovement.Truck:
      const truckDirection = new THREE.Vector3()
        .subVectors(startLookAt, startPosition)
        .normalize()
        .cross(new THREE.Vector3(0, 1, 0));
      endPosition
        .copy(startPosition)
        .addScaledVector(truckDirection, subjectSize.x);
      break;
    case CameraMovement.Pedestal:
      endPosition
        .copy(startPosition)
        .add(new THREE.Vector3(0, subjectSize.y, 0));
      break;
    case CameraMovement.Pan:
      endLookAt.copy(subjectPosition);
      break;
    case CameraMovement.Tilt:
      endLookAt.copy(subjectPosition);
      endPosition.y += subjectSize.y * 0.5;
      break;
    case CameraMovement.ArcShot:
      const arcCenter = subjectPosition.clone();
      const arcRadius = startPosition.distanceTo(arcCenter);
      const arcAngle = Math.PI * 0.5; // 90-degree arc
      endPosition.set(
        arcCenter.x + arcRadius * Math.cos(arcAngle),
        startPosition.y,
        arcCenter.z + arcRadius * Math.sin(arcAngle)
      );
      endLookAt.copy(arcCenter);
      break;
    case CameraMovement.CraneJib:
      endPosition
        .copy(startPosition)
        .add(new THREE.Vector3(0, subjectSize.y * 2, -subjectSize.z));
      endLookAt.copy(subjectPosition);
      break;
    case CameraMovement.Handheld:
      applyHandheldEffect(endPosition, endAngle);
      break;
    case CameraMovement.Steadicam:
      endPosition.lerp(subjectPosition, 0.1);
      endLookAt.lerp(subjectPosition, 0.1);
      break;
    case CameraMovement.Zoom:
      const zoomFactor = 1.5;
      endFocalLength = startFocalLength * zoomFactor;
      endPosition.copy(startPosition);
      endLookAt.copy(subjectPosition);
      break;
    case CameraMovement.TrackingShot:
      const trackingOffset = new THREE.Vector3(
        subjectSize.x,
        0,
        subjectSize.z
      ).multiplyScalar(0.5);
      endPosition.copy(subjectPosition).add(trackingOffset);
      endLookAt.copy(subjectPosition);
      break;
    case CameraMovement.WhipPan:
      endLookAt
        .copy(subjectPosition)
        .add(new THREE.Vector3(subjectSize.x * 2, 0, 0));
      break;
    case CameraMovement.DroneShot:
      endPosition
        .copy(startPosition)
        .add(new THREE.Vector3(0, subjectSize.y * 5, 0));
      endLookAt.copy(subjectPosition);
      break;
    default:
      endPosition.copy(startPosition);
      endLookAt.copy(startLookAt);
  }

  // Update endAngle based on the new endLookAt
  setAngleFromLookAt(endPosition, endLookAt, endAngle);
}
