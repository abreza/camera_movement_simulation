import {
  CameraFrame,
  CinematographyInstruction,
  CameraAngle,
  ShotType,
  CameraMovement,
  Subject,
} from "@/types/simulation";
import * as THREE from "three";

export function calculateCameraPositions(
  subjects: Subject[],
  instructions: CinematographyInstruction[],
  initialPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 10),
  initialLookAt: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
  initialFocalLength: number = 50
): CameraFrame[] {
  const frames: CameraFrame[] = [];
  let currentPosition = initialPosition.clone();
  let currentLookAt = initialLookAt.clone();
  let currentFocalLength = initialFocalLength;
  let currentRotation = new THREE.Euler();

  for (const instruction of instructions) {
    const { startFrame, endFrame } = calculateKeyframes(
      instruction,
      currentPosition,
      currentLookAt,
      currentFocalLength,
      currentRotation,
      subjects
    );

    for (let frame = 0; frame < instruction.frameCount; frame++) {
      const progress = frame / (instruction.frameCount - 1);
      const easedProgress = easeInOutCubic(progress);

      const position = new THREE.Vector3().lerpVectors(
        startFrame.position,
        endFrame.position,
        easedProgress
      );
      const lookAt = new THREE.Vector3().lerpVectors(
        startFrame.lookAt,
        endFrame.lookAt,
        easedProgress
      );
      const focalLength = THREE.MathUtils.lerp(
        startFrame.focalLength,
        endFrame.focalLength,
        easedProgress
      );
      const rotation = new THREE.Euler().setFromQuaternion(
        new THREE.Quaternion().slerpQuaternions(
          new THREE.Quaternion().setFromEuler(startFrame.rotation),
          new THREE.Quaternion().setFromEuler(endFrame.rotation),
          easedProgress
        )
      );

      frames.push({ position, lookAt, focalLength, rotation });
    }

    currentPosition = endFrame.position;
    currentLookAt = endFrame.lookAt;
    currentFocalLength = endFrame.focalLength;
    currentRotation = endFrame.rotation;
  }

  return frames;
}

function calculateKeyframes(
  instruction: CinematographyInstruction,
  currentPosition: THREE.Vector3,
  currentLookAt: THREE.Vector3,
  currentFocalLength: number,
  currentRotation: THREE.Euler,
  subjects: Subject[]
): {
  startFrame: CameraFrame & { rotation: THREE.Euler };
  endFrame: CameraFrame & { rotation: THREE.Euler };
} {
  const subject = subjects[instruction.subjectIndex];
  const startPosition =
    instruction.startPosition?.clone() || currentPosition.clone();
  const startLookAt = instruction.startLookAt?.clone() || currentLookAt.clone();
  const startFocalLength = instruction.startFocalLength || currentFocalLength;
  const startRotation = currentRotation.clone();

  let endPosition = instruction.endPosition?.clone() || startPosition.clone();
  let endLookAt = instruction.endLookAt?.clone() || subject.position.clone();
  let endFocalLength = instruction.endFocalLength || startFocalLength;
  let endRotation = startRotation.clone();

  applyMovement(
    instruction,
    subject,
    startPosition,
    startLookAt,
    endPosition,
    endLookAt,
    endRotation
  );
  applyCameraAngle(
    instruction.cameraAngle,
    subject,
    endPosition,
    endLookAt,
    endRotation
  );
  applyShotType(
    instruction.shotType,
    subject,
    endPosition,
    endLookAt,
    endFocalLength
  );

  return {
    startFrame: {
      position: startPosition,
      lookAt: startLookAt,
      focalLength: startFocalLength,
      rotation: startRotation,
    },
    endFrame: {
      position: endPosition,
      lookAt: endLookAt,
      focalLength: endFocalLength,
      rotation: endRotation,
    },
  };
}

function applyMovement(
  instruction: CinematographyInstruction,
  subject: Subject,
  startPosition: THREE.Vector3,
  startLookAt: THREE.Vector3,
  endPosition: THREE.Vector3,
  endLookAt: THREE.Vector3,
  endRotation: THREE.Euler
) {
  const subjectPosition = subject.position;
  const subjectSize = subject.size;

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
      applyHandheldEffect(endPosition, endRotation);
      break;

    case CameraMovement.Steadicam:
      // Smooth out the movement
      endPosition.lerp(subjectPosition, 0.1);
      endLookAt.lerp(subjectPosition, 0.1);
      break;

    case CameraMovement.Zoom:
      // Simulate zoom by changing FOV (handled in main function)
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
      // No movement
      endPosition.copy(startPosition);
      endLookAt.copy(startLookAt);
  }
}

function applyCameraAngle(
  cameraAngle: CameraAngle | undefined,
  subject: Subject,
  endPosition: THREE.Vector3,
  endLookAt: THREE.Vector3,
  endRotation: THREE.Euler
) {
  const subjectPosition = subject.position;
  const subjectSize = subject.size;

  switch (cameraAngle) {
    case CameraAngle.EyeLevel:
      endPosition.y = subjectPosition.y + subjectSize.y * 0.9;
      break;

    case CameraAngle.LowAngle:
      endPosition.y = subjectPosition.y + subjectSize.y * 0.3;
      endLookAt.y = subjectPosition.y + subjectSize.y;
      break;

    case CameraAngle.HighAngle:
      endPosition.y = subjectPosition.y + subjectSize.y * 1.5;
      endLookAt.y = subjectPosition.y;
      break;

    case CameraAngle.DutchAngle:
      endRotation.z = THREE.MathUtils.degToRad(15);
      break;

    case CameraAngle.BirdsEyeView:
      endPosition.y = subjectPosition.y + subjectSize.y * 3;
      endPosition.z = subjectPosition.z;
      endLookAt.copy(subjectPosition);
      break;

    case CameraAngle.WormsEyeView:
      endPosition.y = subjectPosition.y - subjectSize.y * 0.5;
      endPosition.z = subjectPosition.z + subjectSize.z * 0.5;
      endLookAt
        .copy(subjectPosition)
        .add(new THREE.Vector3(0, subjectSize.y, 0));
      break;

    case CameraAngle.OverTheShoulder:
      endPosition
        .copy(subjectPosition)
        .add(
          new THREE.Vector3(
            -subjectSize.x * 0.5,
            subjectSize.y * 0.8,
            -subjectSize.z * 0.5
          )
        );
      endLookAt
        .copy(subjectPosition)
        .add(new THREE.Vector3(subjectSize.x * 2, 0, 0));
      break;

    case CameraAngle.PointOfView:
      endPosition
        .copy(subjectPosition)
        .add(new THREE.Vector3(0, subjectSize.y * 0.9, 0));
      endLookAt
        .copy(subjectPosition)
        .add(new THREE.Vector3(subjectSize.x, 0, 0));
      break;

    default:
      // No angle adjustment
      break;
  }
}

function applyShotType(
  shotType: ShotType | undefined,
  subject: Subject,
  endPosition: THREE.Vector3,
  endLookAt: THREE.Vector3,
  endFocalLength: number
) {
  const subjectPosition = subject.position;
  const subjectSize = subject.size;

  switch (shotType) {
    case ShotType.ExtremeCloseUp:
      endPosition.lerpVectors(endPosition, subjectPosition, 0.9);
      endFocalLength = 100;
      break;

    case ShotType.CloseUp:
      endPosition.lerpVectors(endPosition, subjectPosition, 0.8);
      endFocalLength = 85;
      break;

    case ShotType.MediumCloseUp:
      endPosition.lerpVectors(endPosition, subjectPosition, 0.7);
      endFocalLength = 70;
      break;

    case ShotType.MediumShot:
      endPosition.lerpVectors(endPosition, subjectPosition, 0.6);
      endFocalLength = 50;
      break;

    case ShotType.MediumLongShot:
      endPosition.lerpVectors(endPosition, subjectPosition, 0.5);
      endFocalLength = 40;
      break;

    case ShotType.LongShot:
      endPosition.lerpVectors(endPosition, subjectPosition, 0.3);
      endFocalLength = 35;
      break;

    case ShotType.ExtremeLongShot:
      endPosition.lerpVectors(endPosition, subjectPosition, 0.1);
      endFocalLength = 24;
      break;

    case ShotType.TwoShot:
      // Assumes two subjects side by side
      endPosition
        .copy(subjectPosition)
        .add(new THREE.Vector3(subjectSize.x * 1.5, 0, subjectSize.z * 2));
      endLookAt
        .copy(subjectPosition)
        .add(new THREE.Vector3(subjectSize.x * 0.5, 0, 0));
      endFocalLength = 50;
      break;

    case ShotType.GroupShot:
      // Assumes a group in a semi-circle
      endPosition
        .copy(subjectPosition)
        .add(new THREE.Vector3(0, subjectSize.y * 0.5, subjectSize.z * 3));
      endLookAt.copy(subjectPosition);
      endFocalLength = 35;
      break;

    case ShotType.InsertShot:
      endPosition.lerpVectors(endPosition, subjectPosition, 0.95);
      endFocalLength = 100;
      break;

    case ShotType.Cutaway:
      // Move camera to a new position to simulate cutting away
      endPosition.add(
        new THREE.Vector3(subjectSize.x * 2, subjectSize.y, subjectSize.z)
      );
      endLookAt.copy(subjectPosition);
      endFocalLength = 50;
      break;

    case ShotType.EstablishingShot:
      endPosition.lerpVectors(endPosition, subjectPosition, 0.05);
      endLookAt.copy(subjectPosition);
      endFocalLength = 24;
      break;

    default:
      // No shot type adjustment
      break;
  }
}

function applyHandheldEffect(position: THREE.Vector3, rotation: THREE.Euler) {
  const handheldIntensity = 0.05;
  position.x += (Math.random() - 0.5) * handheldIntensity;
  position.y += (Math.random() - 0.5) * handheldIntensity;
  position.z += (Math.random() - 0.5) * handheldIntensity;
  rotation.x += (Math.random() - 0.5) * handheldIntensity * 0.1;
  rotation.y += (Math.random() - 0.5) * handheldIntensity * 0.1;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
