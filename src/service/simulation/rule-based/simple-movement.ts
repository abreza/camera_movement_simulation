import * as THREE from "three";
import {
  CameraParameters,
  SimpleMovement,
  Direction,
  MovementMode,
  ShotSize,
} from "../instruction/types";
import { Subject, SubjectFrame } from "../../subjects/types";
import { SCALE_FACTORS } from "../instruction/constants";
import { sampleGaussian } from "../utils";
import { MIN_CAMERA_HEIGHT } from "../constants";
import { calculateRegionOfInterest } from "./setup/roi";

const SCALE_STD_DEV_PERCENTAGE = 0.2;

function positionAtDistanceAboveFloor(
  subjectPosition: THREE.Vector3,
  relativePosition: THREE.Vector3,
  distance: number
): THREE.Vector3 {
  const direction = relativePosition.clone().normalize();
  const candidate = subjectPosition
    .clone()
    .add(direction.clone().multiplyScalar(distance));
  if (candidate.y >= MIN_CAMERA_HEIGHT) return candidate;

  const verticalDistance = Math.max(
    MIN_CAMERA_HEIGHT - subjectPosition.y,
    -distance
  );
  const horizontalDistance = Math.sqrt(
    Math.max(0, distance * distance - verticalDistance * verticalDistance)
  );
  const horizontalDirection = new THREE.Vector3(direction.x, 0, direction.z);
  if (horizontalDirection.lengthSq() < 1e-8) horizontalDirection.set(0, 0, 1);
  horizontalDirection.normalize().multiplyScalar(horizontalDistance);

  return subjectPosition
    .clone()
    .add(horizontalDirection)
    .add(new THREE.Vector3(0, verticalDistance, 0));
}

function aimAt(
  camera: CameraParameters,
  targetPosition: THREE.Vector3
): void {
  const lookAtMatrix = new THREE.Matrix4();
  const forward = targetPosition.clone().sub(camera.position).normalize();
  const up = Math.abs(forward.y) > 0.999
    ? new THREE.Vector3(0, 0, 1)
    : new THREE.Vector3(0, 1, 0);
  lookAtMatrix.lookAt(camera.position, targetPosition, up);
  camera.rotation.setFromRotationMatrix(lookAtMatrix);
}

export const moveByEasing = (
  params: CameraParameters,
  movement: SimpleMovement,
  easedT: number[],
  subjectFrames?: SubjectFrame[],
  kind: "init" | "end" = "init",
  subject?: Subject,
  shotSize?: ShotSize
): CameraParameters[] => {
  const meanScaleFactor = SCALE_FACTORS[movement.scale];
  const stdDev = meanScaleFactor * SCALE_STD_DEV_PERCENTAGE;
  const scaleFactor = Math.max(
    meanScaleFactor * 0.1,
    sampleGaussian(meanScaleFactor, stdDev)
  );

  const frames: CameraParameters[] = [];

  const cameraQuaternion = new THREE.Quaternion().setFromEuler(params.rotation);
  const cameraRight = new THREE.Vector3(1, 0, 0)
    .applyQuaternion(cameraQuaternion)
    .normalize();
  const cameraForward = new THREE.Vector3(0, 0, -1)
    .applyQuaternion(cameraQuaternion)
    .normalize();
  const movementVectors: Record<Direction, THREE.Vector3> = {
    [Direction.Left]: cameraRight.clone().negate(),
    [Direction.Right]: cameraRight,
    [Direction.Up]: new THREE.Vector3(0, 1, 0),
    [Direction.Down]: new THREE.Vector3(0, -1, 0),
    [Direction.Forward]: cameraForward,
    [Direction.Backward]: cameraForward.clone().negate(),
  };

  const baseMovement = movementVectors[movement.direction];
  const anchorSubjectFrame = subjectFrames?.[
    kind === "init" ? 0 : subjectFrames.length - 1
  ];
  let totalDistance = 10 * scaleFactor;
  const isDolly =
    movement.movementMode === MovementMode.Transition &&
    (movement.direction === Direction.Forward ||
      movement.direction === Direction.Backward) &&
    !!anchorSubjectFrame;
  const anchorSubjectRelativePosition = anchorSubjectFrame
    ? params.position.clone().sub(anchorSubjectFrame.position)
    : new THREE.Vector3();
  const anchorSubjectDistance = anchorSubjectRelativePosition.length();
  const anchorSubjectQuaternion = anchorSubjectFrame
    ? new THREE.Quaternion().setFromEuler(anchorSubjectFrame.rotation)
    : new THREE.Quaternion();
  const anchorOpticalTarget =
    anchorSubjectFrame && subject
      ? calculateRegionOfInterest(shotSize, subject, anchorSubjectFrame)
          .regionOfInterest.position
      : anchorSubjectFrame?.position ?? new THREE.Vector3();
  const anchorTargetLocalOffset = anchorSubjectFrame
    ? anchorOpticalTarget
        .clone()
        .sub(anchorSubjectFrame.position)
        .applyQuaternion(anchorSubjectQuaternion.clone().invert())
    : new THREE.Vector3();
  const anchorDollyRelativePosition = params.position
    .clone()
    .sub(anchorOpticalTarget);
  const anchorDollyDistance = anchorDollyRelativePosition.length();
  const anchorDollyRelativeDirection =
    anchorDollyDistance > 1e-8
      ? anchorDollyRelativePosition
          .clone()
          .divideScalar(anchorDollyDistance)
          .applyQuaternion(anchorSubjectQuaternion.clone().invert())
      : cameraForward.clone().negate();
  const subjectLocalCameraRotation = anchorSubjectFrame
    ? anchorSubjectQuaternion
        .clone()
        .invert()
        .multiply(cameraQuaternion.clone())
    : cameraQuaternion.clone();
  const craneBoomAxis = (() => {
    const horizontalAway = new THREE.Vector3(
      anchorSubjectRelativePosition.x,
      0,
      anchorSubjectRelativePosition.z
    );
    if (horizontalAway.lengthSq() < 1e-8) horizontalAway.set(0, 0, 1);
    return horizontalAway
      .normalize()
      .cross(new THREE.Vector3(0, 1, 0))
      .normalize();
  })();
  const craneRotationMagnitude = (() => {
    if (
      movement.movementMode !== MovementMode.Crane ||
      !anchorSubjectFrame ||
      anchorSubjectDistance <= 1e-8
    ) {
      return 0;
    }
    const horizontalDistance = Math.hypot(
      anchorSubjectRelativePosition.x,
      anchorSubjectRelativePosition.z
    );
    const elevation = Math.atan2(
      anchorSubjectRelativePosition.y,
      horizontalDistance
    );
    const movementSign = movement.direction === Direction.Up ? 1 : -1;
    const nonAnchorSign = movementSign * (kind === "init" ? 1 : -1);
    const angleToVerticalExtreme = nonAnchorSign > 0
      ? Math.PI / 2 - elevation
      : elevation + Math.PI / 2;
    const requestedMagnitude = Math.min(
      (Math.PI / 2) * scaleFactor,
      Math.max(0, angleToVerticalExtreme - 1e-3)
    );
    if (!subjectFrames?.length) return requestedMagnitude;

    const directionSign = movement.direction === Direction.Up ? 1 : -1;
    const staysAboveFloor = (magnitude: number): boolean =>
      easedT.every((t, index) => {
        const timeFactor = kind === "init" ? t : t - 1;
        const relativePosition = anchorSubjectRelativePosition
          .clone()
          .applyAxisAngle(
            craneBoomAxis,
            magnitude * timeFactor * directionSign
          );
        const subjectFrame =
          subjectFrames[Math.min(index, subjectFrames.length - 1)];
        // The anchor camera may legitimately sit exactly on the configured
        // camera floor (notably a low-angle shot). Requiring extra headroom at
        // every sample made even a zero-magnitude CraneUp infeasible, so the
        // binary search collapsed a correctly-labelled crane into a static
        // trajectory. The actual invariant is simply that no frame crosses
        // the floor; the generated positions are clamped to the same value.
        return (
          subjectFrame.position.y + relativePosition.y >=
          MIN_CAMERA_HEIGHT - 1e-9
        );
      });
    if (staysAboveFloor(requestedMagnitude)) return requestedMagnitude;

    let low = 0;
    let high = requestedMagnitude;
    for (let iteration = 0; iteration < 32; iteration++) {
      const middle = (low + high) / 2;
      if (staysAboveFloor(middle)) low = middle;
      else high = middle;
    }
    return low;
  })();

  if (isDolly) {
    const subjectRadius = subject
      ? Math.sqrt(
          subject.dimensions.width * subject.dimensions.width +
            subject.dimensions.height * subject.dimensions.height +
            subject.dimensions.depth * subject.dimensions.depth
        ) / 2
      : 1;
    const minimumDistance = Math.min(
      Math.max(0.2, subjectRadius + 0.1),
      anchorDollyDistance * 0.9
    );
    const approachesSubject =
      (movement.direction === Direction.Forward && kind === "init") ||
      (movement.direction === Direction.Backward && kind === "end");
    if (approachesSubject) {
      totalDistance = Math.min(
        totalDistance,
        Math.max(0, anchorDollyDistance - minimumDistance)
      );
    }
  }
  if (
    movement.movementMode === MovementMode.Transition &&
    movement.direction === Direction.Down &&
    kind === "init"
  ) {
    totalDistance = Math.min(
      totalDistance,
      Math.max(0, params.position.y - MIN_CAMERA_HEIGHT - 0.05)
    );
  }

  easedT.forEach((t, index) => {
    const rawFrame: CameraParameters = {
      position: new THREE.Vector3(),
      rotation: new THREE.Euler(),
      focalLength: params.focalLength,
      aspectRatio: params.aspectRatio,
    };

    const timeFactor = kind === "init" ? t : t - 1;
    const subjectFrame = subjectFrames?.[
      Math.min(index, subjectFrames.length - 1)
    ];

    if (movement.movementMode === MovementMode.Transition) {
      if (isDolly && subjectFrame) {
        const progressFromAnchor =
          kind === "init" ? t : 1 - t;
        const movesCloser = movement.direction === Direction.Forward;
        const distanceSign = movesCloser ? -1 : 1;
        const directionFromAnchor = kind === "init" ? 1 : -1;
        const desiredDistance =
          anchorDollyDistance +
          distanceSign *
            directionFromAnchor *
            totalDistance *
            progressFromAnchor;
        const currentSubjectQuaternion = new THREE.Quaternion().setFromEuler(
          subjectFrame.rotation
        );
        const currentOpticalTarget = anchorTargetLocalOffset
          .clone()
          .applyQuaternion(currentSubjectQuaternion)
          .add(subjectFrame.position);
        const currentRelativeDirection = anchorDollyRelativeDirection
          .clone()
          .applyQuaternion(currentSubjectQuaternion)
          .normalize();
        const desiredRelativePosition = currentRelativeDirection
          .clone()
          .multiplyScalar(desiredDistance);
        const candidateY =
          currentOpticalTarget.y + desiredRelativePosition.y;

        rawFrame.position.copy(
          candidateY < MIN_CAMERA_HEIGHT
            ? positionAtDistanceAboveFloor(
                currentOpticalTarget,
                desiredRelativePosition,
                desiredDistance
              )
            : currentOpticalTarget.clone().add(desiredRelativePosition)
        );
        if (candidateY < MIN_CAMERA_HEIGHT) {
          aimAt(rawFrame, currentOpticalTarget);
        } else {
          rawFrame.rotation.setFromQuaternion(
            currentSubjectQuaternion.multiply(subjectLocalCameraRotation.clone())
          );
        }
      } else {
        const movementAmount = baseMovement
          .clone()
          .multiplyScalar(totalDistance * timeFactor);
        rawFrame.position.copy(params.position).add(movementAmount);
      }
      if (!isDolly || !subjectFrame) rawFrame.rotation.copy(params.rotation);
    } else if (
      movement.movementMode === MovementMode.Rotation ||
      movement.movementMode === MovementMode.Roll
    ) {
      rawFrame.position.copy(params.position);

      const totalRotation = (Math.PI / 4) * scaleFactor;
      const rotationAmount = totalRotation * timeFactor;

      const rotationAxis =
        movement.movementMode === MovementMode.Roll
          ? new THREE.Vector3(0, 0, 1)
          : movement.direction === Direction.Left ||
            movement.direction === Direction.Right
            ? new THREE.Vector3(0, 1, 0)
            : new THREE.Vector3(1, 0, 0);

      const quaternion = new THREE.Quaternion();
      quaternion.setFromEuler(params.rotation);
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
      rawFrame.rotation.setFromQuaternion(quaternion);
    } else if (movement.movementMode === MovementMode.Arc && subjectFrames) {
      const arcCenter = subjectFrame?.position ?? anchorSubjectFrame?.position;
      if (!arcCenter || !anchorSubjectFrame) return;
      const initialRelativePos = anchorSubjectRelativePosition.clone();

      const totalRotation = (Math.PI / 2) * scaleFactor;
      const rotationAmount = totalRotation * timeFactor;
      const rotationDirection = movement.direction === Direction.Left ? -1 : 1;

      const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        rotationAmount * rotationDirection
      );

      const newRelativePos = initialRelativePos
        .clone()
        .applyQuaternion(rotationQuaternion);

      rawFrame.position.copy(arcCenter).add(newRelativePos);

      aimAt(rawFrame, arcCenter);
    } else if (
      movement.movementMode === MovementMode.Crane &&
      subjectFrame &&
      anchorSubjectFrame
    ) {
      // A crane/jib moves on a vertical boom arc while keeping its lens on the
      // subject.  This is deliberately different from a pedestal, which is a
      // straight world-Y translation with unchanged camera rotation.
      const rotationAmount =
        craneRotationMagnitude *
        timeFactor *
        (movement.direction === Direction.Up ? 1 : -1);
      const desiredRelativePosition = anchorSubjectRelativePosition
        .clone()
        .applyAxisAngle(craneBoomAxis, rotationAmount);
      rawFrame.position.copy(
        positionAtDistanceAboveFloor(
          subjectFrame.position,
          desiredRelativePosition,
          anchorSubjectDistance
        )
      );
      aimAt(rawFrame, subjectFrame.position);
    }

    rawFrame.position.y = Math.max(MIN_CAMERA_HEIGHT, rawFrame.position.y);
    frames.push(rawFrame);
  });

  return frames;
};
