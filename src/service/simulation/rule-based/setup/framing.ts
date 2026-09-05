import * as THREE from "three";
import {
  SubjectInFramePosition,
  CameraParameters,
} from "@/service/simulation/instruction/types";
import {
  getCameraFieldOfView,
  projectBoundingBox,
  ProjectedBounds,
} from "@/service/simulation/utils";
import { SubjectDimensions } from "@/service/subjects/types";
import { MIN_CAMERA_HEIGHT } from "../../constants";

const FRAME_MARGIN = 0.03;
const MAX_FRAMING_ITERATIONS = 12;
const THIRD_CENTER = 2 / 3;
const MAX_CAMERA_DISTANCE_FROM_TARGET = 1000;
const aimingCamera = new THREE.PerspectiveCamera();

function positionAtDistanceAboveFloor(
  targetPosition: THREE.Vector3,
  awayDirection: THREE.Vector3,
  distance: number
): THREE.Vector3 {
  const direction = awayDirection.clone().normalize();
  const result = targetPosition
    .clone()
    .add(direction.clone().multiplyScalar(distance));
  if (result.y >= MIN_CAMERA_HEIGHT) return result;

  const verticalDistance = Math.max(
    MIN_CAMERA_HEIGHT - targetPosition.y,
    -distance
  );
  const horizontalDistance = Math.sqrt(
    Math.max(0, distance * distance - verticalDistance * verticalDistance)
  );
  const horizontalDirection = new THREE.Vector3(
    direction.x,
    0,
    direction.z
  );
  if (horizontalDirection.lengthSq() < 1e-8) horizontalDirection.set(0, 0, 1);
  horizontalDirection.normalize().multiplyScalar(horizontalDistance);

  return targetPosition
    .clone()
    .add(horizontalDirection)
    .add(new THREE.Vector3(0, verticalDistance, 0));
}

function getTargetCenter(
  bounds: ProjectedBounds,
  position: SubjectInFramePosition
): THREE.Vector2 {
  switch (position) {
    case SubjectInFramePosition.Center:
      return new THREE.Vector2(0, 0);
    case SubjectInFramePosition.Left:
      return new THREE.Vector2(-THIRD_CENTER, 0);
    case SubjectInFramePosition.Right:
      return new THREE.Vector2(THIRD_CENTER, 0);
    case SubjectInFramePosition.Top:
      return new THREE.Vector2(0, THIRD_CENTER);
    case SubjectInFramePosition.Bottom:
      return new THREE.Vector2(0, -THIRD_CENTER);
    case SubjectInFramePosition.TopLeft:
      return new THREE.Vector2(-THIRD_CENTER, THIRD_CENTER);
    case SubjectInFramePosition.TopRight:
      return new THREE.Vector2(THIRD_CENTER, THIRD_CENTER);
    case SubjectInFramePosition.BottomLeft:
      return new THREE.Vector2(-THIRD_CENTER, -THIRD_CENTER);
    case SubjectInFramePosition.BottomRight:
      return new THREE.Vector2(THIRD_CENTER, -THIRD_CENTER);
    case SubjectInFramePosition.OuterLeft:
      return new THREE.Vector2(-1 - bounds.width / 4, 0);
    case SubjectInFramePosition.OuterRight:
      return new THREE.Vector2(1 + bounds.width / 4, 0);
    case SubjectInFramePosition.OuterTop:
      return new THREE.Vector2(0, 1 + bounds.height / 4);
    case SubjectInFramePosition.OuterBottom:
      return new THREE.Vector2(0, -1 - bounds.height / 4);
  }
}

function getVisibilityCompatiblePosition(
  position: SubjectInFramePosition
): SubjectInFramePosition {
  const outerToInner: Partial<
    Record<SubjectInFramePosition, SubjectInFramePosition>
  > = {
    [SubjectInFramePosition.OuterLeft]: SubjectInFramePosition.Left,
    [SubjectInFramePosition.OuterRight]: SubjectInFramePosition.Right,
    [SubjectInFramePosition.OuterTop]: SubjectInFramePosition.Top,
    [SubjectInFramePosition.OuterBottom]: SubjectInFramePosition.Bottom,
  };
  return outerToInner[position] ?? position;
}

function clampCenterForVisibility(
  center: THREE.Vector2,
  bounds: ProjectedBounds
): THREE.Vector2 {
  const horizontalLimit = Math.max(
    0,
    1 - FRAME_MARGIN - bounds.width / 2
  );
  const verticalLimit = Math.max(
    0,
    1 - FRAME_MARGIN - bounds.height / 2
  );

  return new THREE.Vector2(
    THREE.MathUtils.clamp(center.x, -horizontalLimit, horizontalLimit),
    THREE.MathUtils.clamp(center.y, -verticalLimit, verticalLimit)
  );
}

export function calculateMinOffsetToCenterSection(
  bounds: ProjectedBounds
): THREE.Vector2 {
  const min = -1 / 3;
  const max = 1 / 3;
  const offsetX =
    bounds.center.x < min
      ? min - bounds.center.x
      : bounds.center.x > max
      ? max - bounds.center.x
      : 0;
  const offsetY =
    bounds.center.y < min
      ? min - bounds.center.y
      : bounds.center.y > max
      ? max - bounds.center.y
      : 0;

  return new THREE.Vector2(offsetX, offsetY);
}

export function calculateRequiredOffset(
  bounds: ProjectedBounds,
  position: SubjectInFramePosition
): THREE.Vector2 {
  return getTargetCenter(bounds, position).sub(bounds.center);
}

export function isProjectedBoundsFullyVisible(
  bounds: ProjectedBounds,
  margin: number = FRAME_MARGIN
): boolean {
  const limit = 1 - margin;
  return (
    bounds.allInFront &&
    Number.isFinite(bounds.width) &&
    Number.isFinite(bounds.height) &&
    bounds.min.x >= -limit &&
    bounds.max.x <= limit &&
    bounds.min.y >= -limit &&
    bounds.max.y <= limit
  );
}

function aimAtNdcPosition(
  cameraParams: CameraParameters,
  targetPosition: THREE.Vector3,
  targetCenter: THREE.Vector2
): void {
  aimAtTarget(cameraParams, targetPosition);
  const fov = getCameraFieldOfView(cameraParams);
  const localTargetRay = new THREE.Vector3(
    targetCenter.x * Math.tan(fov.horizontal / 2),
    targetCenter.y * Math.tan(fov.vertical / 2),
    -1
  ).normalize();
  const localForward = new THREE.Vector3(0, 0, -1);
  const framingRotation = new THREE.Quaternion().setFromUnitVectors(
    localTargetRay,
    localForward
  );
  const lookAtQuaternion = new THREE.Quaternion().setFromEuler(
    cameraParams.rotation
  );
  cameraParams.rotation.setFromQuaternion(
    lookAtQuaternion.multiply(framingRotation)
  );
}

function aimAtTarget(
  cameraParams: CameraParameters,
  targetPosition: THREE.Vector3
): void {
  aimingCamera.position.copy(cameraParams.position);
  const forward = targetPosition.clone().sub(cameraParams.position).normalize();
  aimingCamera.up.set(0, 1, 0);
  if (Math.abs(forward.dot(aimingCamera.up)) > 0.999) {
    aimingCamera.up.set(0, 0, 1);
  }
  aimingCamera.lookAt(targetPosition);
  cameraParams.rotation.copy(aimingCamera.rotation);
}

function moveBackToFit(
  cameraParams: CameraParameters,
  targetPosition: THREE.Vector3,
  bounds: ProjectedBounds
): boolean {
  const availableWidth = Math.max(
    1e-6,
    2 * (1 - FRAME_MARGIN - Math.abs(bounds.center.x))
  );
  const availableHeight = Math.max(
    1e-6,
    2 * (1 - FRAME_MARGIN - Math.abs(bounds.center.y))
  );
  const widthRatio = Number.isFinite(bounds.width)
    ? bounds.width / availableWidth
    : 2;
  const heightRatio = Number.isFinite(bounds.height)
    ? bounds.height / availableHeight
    : 2;
  const fitRatio = Math.max(
    widthRatio,
    heightRatio,
    bounds.allInFront ? 1 : 2
  );

  if (fitRatio <= 1 + 1e-6) return false;

  let away = cameraParams.position.clone().sub(targetPosition);
  if (away.lengthSq() < 1e-8) {
    away = new THREE.Vector3(0, 0, 1).applyEuler(cameraParams.rotation);
  }
  const currentDistance = Math.max(away.length(), 0.1);
  const nextDistance = Math.min(
    MAX_CAMERA_DISTANCE_FROM_TARGET,
    currentDistance * Math.min(fitRatio * 1.01, 10)
  );
  cameraParams.position.copy(
    positionAtDistanceAboveFloor(targetPosition, away, nextDistance)
  );
  aimAtTarget(cameraParams, targetPosition);
  return true;
}

function ensureBoundingSphereDistance(
  cameraParams: CameraParameters,
  targetPosition: THREE.Vector3,
  dimensions: SubjectDimensions,
  targetCenter: THREE.Vector2
): void {
  const radius =
    Math.sqrt(
      dimensions.width * dimensions.width +
        dimensions.height * dimensions.height +
        dimensions.depth * dimensions.depth
    ) / 2;
  if (radius <= 1e-8) return;

  const fov = getCameraFieldOfView(cameraParams);
  const ndcLimit = 1 - FRAME_MARGIN;
  const availableAngularRoom = (
    targetCoordinate: number,
    fieldOfView: number
  ): number => {
    const tangent = Math.tan(fieldOfView / 2);
    const targetAngle = Math.atan(targetCoordinate * tangent);
    const lowEdgeAngle = Math.atan(-ndcLimit * tangent);
    const highEdgeAngle = Math.atan(ndcLimit * tangent);
    return Math.max(
      1e-4,
      Math.min(targetAngle - lowEdgeAngle, highEdgeAngle - targetAngle)
    );
  };
  // NDC is linear in tan(angle), not in angle itself.  Subtracting NDC
  // coordinates before atan overestimated the room at rule-of-thirds
  // positions and left corners a few pixels outside the promised margin.
  const horizontalHalfAngle = availableAngularRoom(
    targetCenter.x,
    fov.horizontal
  );
  const verticalHalfAngle = availableAngularRoom(
    targetCenter.y,
    fov.vertical
  );
  const limitingHalfFov = Math.min(
    horizontalHalfAngle,
    verticalHalfAngle
  );
  const minimumDistance =
    radius / Math.max(Math.sin(limitingHalfFov) * (1 - FRAME_MARGIN), 1e-4);
  const away = cameraParams.position.clone().sub(targetPosition);
  const currentDistance = away.length();
  if (currentDistance >= minimumDistance) return;

  if (away.lengthSq() < 1e-8) {
    away.set(0, 0, 1).applyEuler(cameraParams.rotation);
  }
  cameraParams.position.copy(
    positionAtDistanceAboveFloor(
      targetPosition,
      away,
      minimumDistance
    )
  );
  aimAtTarget(cameraParams, targetPosition);
}

/**
 * Aims a camera at an oriented subject/ROI and optionally guarantees that the
 * complete oriented bounds remain inside the rendered frame.
 */
export function fixSubjectInView(
  cameraParams: CameraParameters,
  subjectPosition: THREE.Vector3,
  subjectDimensions: SubjectDimensions = { width: 0, height: 0, depth: 0 },
  subjectInFramePosition?: SubjectInFramePosition,
  subjectRotation: THREE.Euler = new THREE.Euler(),
  ensureFullyVisible: boolean = false,
  adjustDistance: boolean = true
): CameraParameters {
  const updated: CameraParameters = {
    position: cameraParams.position.clone(),
    rotation: cameraParams.rotation.clone(),
    focalLength: cameraParams.focalLength,
    aspectRatio: cameraParams.aspectRatio,
  };
  updated.position.y = Math.max(MIN_CAMERA_HEIGHT, updated.position.y);

  if (!ensureFullyVisible || subjectInFramePosition) {
    aimAtTarget(updated, subjectPosition);
  }
  const effectiveFramePosition =
    ensureFullyVisible && subjectInFramePosition
      ? getVisibilityCompatiblePosition(subjectInFramePosition)
      : subjectInFramePosition;
  const conservativeTargetCenter = effectiveFramePosition
    ? getTargetCenter(
        projectBoundingBox(
          subjectDimensions,
          subjectPosition,
          updated,
          subjectRotation
        ),
        effectiveFramePosition
      )
    : new THREE.Vector2(0, 0);
  if (ensureFullyVisible && adjustDistance) {
    ensureBoundingSphereDistance(
      updated,
      subjectPosition,
      subjectDimensions,
      conservativeTargetCenter
    );
  }

  // A projection stays valid until the camera pose changes, including across
  // iterations and when the distance already fits the requested frame.
  let bounds = projectBoundingBox(
    subjectDimensions,
    subjectPosition,
    updated,
    subjectRotation
  );
  for (let iteration = 0; iteration < MAX_FRAMING_ITERATIONS; iteration++) {

    const hasUsableProjection =
      bounds.allInFront &&
      Number.isFinite(bounds.width) &&
      Number.isFinite(bounds.height) &&
      Number.isFinite(bounds.center.x) &&
      Number.isFinite(bounds.center.y);
    if (!hasUsableProjection) {
      if (adjustDistance) {
        moveBackToFit(updated, subjectPosition, bounds);
      } else {
        aimAtTarget(updated, subjectPosition);
      }
      bounds = projectBoundingBox(
        subjectDimensions,
        subjectPosition,
        updated,
        subjectRotation
      );
      continue;
    }

    const requestedCenter = effectiveFramePosition
      ? getTargetCenter(bounds, effectiveFramePosition)
      : ensureFullyVisible
      ? new THREE.Vector2(0, 0)
      : bounds.center.clone().add(calculateMinOffsetToCenterSection(bounds));
    const targetCenter = ensureFullyVisible
      ? clampCenterForVisibility(requestedCenter, bounds)
      : requestedCenter;
    aimAtNdcPosition(updated, subjectPosition, targetCenter);

    bounds = projectBoundingBox(
      subjectDimensions,
      subjectPosition,
      updated,
      subjectRotation
    );
    if (
      ensureFullyVisible &&
      adjustDistance &&
      moveBackToFit(updated, subjectPosition, bounds)
    ) {
      bounds = projectBoundingBox(
        subjectDimensions,
        subjectPosition,
        updated,
        subjectRotation
      );
    }

    const nextRequestedCenter = effectiveFramePosition
      ? getTargetCenter(bounds, effectiveFramePosition)
      : ensureFullyVisible
      ? new THREE.Vector2(0, 0)
      : bounds.center.clone().add(calculateMinOffsetToCenterSection(bounds));
    const nextTargetCenter = ensureFullyVisible
      ? clampCenterForVisibility(nextRequestedCenter, bounds)
      : nextRequestedCenter;
    const framingSatisfied =
      nextTargetCenter.distanceToSquared(bounds.center) < 1e-8;
    if (
      framingSatisfied &&
      (!ensureFullyVisible || isProjectedBoundsFullyVisible(bounds))
    ) {
      break;
    }
  }

  if (ensureFullyVisible && adjustDistance) {
    if (!isProjectedBoundsFullyVisible(bounds)) {
      throw new Error(
        "Unable to fit the complete subject bounds inside the requested frame"
      );
    }
  }

  return updated;
}
