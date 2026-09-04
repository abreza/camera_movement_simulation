import * as THREE from "three";
import {
  SimulationInstruction,
  CameraParameters,
  DynamicMode,
  SetupConfig,
  Direction,
  MovementMode,
} from "../instruction/types";
import { SubjectInfo } from "../../subjects/types";
import { getEasedTime } from "../instruction/helpers/movement-easing";
import { getCameraBySetup } from "./setup";
import { interpolateCameraParameters } from "./interpolation";
import {
  applySpeedConstraints,
  measureCanonicalMotion,
  satisfiesSpeedConstraints,
} from "./motion-constraint";
import { moveByEasing } from "./simple-movement";
import { applyConstraintsOnFrame } from "./setup/constraints";
import {
  fixSubjectInView,
  isProjectedBoundsFullyVisible,
} from "./setup/framing";
import { MIN_CAMERA_HEIGHT } from "../constants";
import { projectBoundingBox } from "../utils";

export const initCameraParameters = (
  instruction: SimulationInstruction,
  startCameraParameter: CameraParameters | undefined,
  subjectInfo: SubjectInfo | undefined
): CameraParameters[] => {
  let frames: CameraParameters[] = [];
  const subjectFrames = subjectInfo?.frames;

  if (!subjectInfo || !subjectFrames?.length) {
    return frames;
  }

  const startSubjectFrame = subjectFrames[0];
  const endSubjectFrame = subjectFrames[subjectFrames.length - 1];
  const isDolly =
    instruction.dynamic.type === DynamicMode.Simple &&
    instruction.dynamic.movementMode === MovementMode.Transition &&
    (instruction.dynamic.direction === Direction.Forward ||
      instruction.dynamic.direction === Direction.Backward);
  const motionReference: "world" | "subjectPosition" | "subjectTransform" =
    instruction.dynamic.type === DynamicMode.Interpolation &&
    instruction.dynamic.subjectAwareInterpolation
      ? "subjectTransform"
      : isDolly
      ? "subjectTransform"
      : instruction.dynamic.type === DynamicMode.Simple &&
        (instruction.dynamic.movementMode === MovementMode.Arc ||
          instruction.dynamic.movementMode === MovementMode.Crane)
      ? "subjectPosition"
      : "world";
  const toMotionConstraintSpace = (
    cameraFrames: CameraParameters[]
  ): CameraParameters[] => {
    if (motionReference === "world") return cameraFrames;
    return cameraFrames.map((camera, index) => {
      const subjectFrame =
        subjectFrames[Math.min(index, subjectFrames.length - 1)];
      const subjectQuaternion = new THREE.Quaternion().setFromEuler(
        subjectFrame.rotation
      );
      const inverseSubjectQuaternion = subjectQuaternion.clone().invert();
      const cameraQuaternion = new THREE.Quaternion().setFromEuler(
        camera.rotation
      );
      return {
        ...camera,
        position: camera.position
          .clone()
          .sub(subjectFrame.position)
          .applyQuaternion(
            motionReference === "subjectTransform"
              ? inverseSubjectQuaternion
              : new THREE.Quaternion()
          ),
        rotation:
          motionReference === "subjectTransform"
            ? new THREE.Euler().setFromQuaternion(
                inverseSubjectQuaternion.multiply(cameraQuaternion)
              )
            : camera.rotation.clone(),
      };
    });
  };
  const applyConfiguredMotionConstraints = (
    cameraFrames: CameraParameters[]
  ): CameraParameters[] => {
    // For subject-aware shots the labelled camera motion is the motion
    // relative to the tracked subject.  Limiting the already-composed world
    // path made the camera lag behind arbitrary subject motion and corrupted
    // Follow/Track distance and Dolly direction.
    const motionFrames = toMotionConstraintSpace(cameraFrames);
    // Leave deterministic headroom for the subsequent floor/static-radius
    // projection.  The public postcondition is still checked against the
    // declared value below.
    const internalMaxSpeed = instruction.constraints?.maxSpeed;
    const internalMaxAcceleration = instruction.constraints?.maxAccelerate;
    const constrainedMotionFrames = applySpeedConstraints(
      motionFrames,
      internalMaxSpeed === undefined ? undefined : internalMaxSpeed * 0.9,
      internalMaxAcceleration === undefined
        ? undefined
        : internalMaxAcceleration * 0.9,
      undefined,
      motionReference !== "world"
        ? Number.NEGATIVE_INFINITY
        : MIN_CAMERA_HEIGHT
    );
    if (motionReference === "world") return constrainedMotionFrames;

    return constrainedMotionFrames.map((camera, index) => {
      const subjectFrame =
        subjectFrames[Math.min(index, subjectFrames.length - 1)];
      const subjectQuaternion = new THREE.Quaternion().setFromEuler(
        subjectFrame.rotation
      );
      const localCameraQuaternion = new THREE.Quaternion().setFromEuler(
        camera.rotation
      );
      const position = camera.position
        .clone()
        .applyQuaternion(
          motionReference === "subjectTransform"
            ? subjectQuaternion
            : new THREE.Quaternion()
        )
        .add(subjectFrame.position);
      position.y = Math.max(MIN_CAMERA_HEIGHT, position.y);
      return {
        ...camera,
        position,
        rotation:
          motionReference === "subjectTransform"
            ? new THREE.Euler().setFromQuaternion(
                subjectQuaternion.multiply(localCameraQuaternion)
              )
            : camera.rotation.clone(),
      };
    });
  };

  const timeDenominator = Math.max(1, instruction.frameCount - 1);
  const easedT = Array.from({ length: instruction.frameCount }, (_, i) =>
    getEasedTime(i / timeDenominator, instruction.dynamic.easing)
  );

  if (instruction.dynamic.type === DynamicMode.Interpolation) {
    let startSetup: SetupConfig;
    let endSetup: SetupConfig;

    if (instruction.setup.kind === "init") {
      startSetup = instruction.setup.config;
      endSetup = instruction.dynamic.complementSetup;
    } else {
      startSetup = instruction.dynamic.complementSetup;
      endSetup = instruction.setup.config;
    }

    const startParams =
      startCameraParameter ||
      getCameraBySetup(startSetup, subjectInfo.subject, startSubjectFrame);

    const endParams = getCameraBySetup(
      endSetup,
      subjectInfo.subject,
      endSubjectFrame
    );

    const rotationInterpolation =
      !!endSetup?.subjectView || !!endSetup?.cameraAngle;

    frames = interpolateCameraParameters(
      startParams,
      endParams,
      instruction.dynamic,
      subjectFrames,
      easedT,
      rotationInterpolation
    );
  } else {
    const startParams =
      startCameraParameter ||
      getCameraBySetup(
        instruction.setup.config,
        subjectInfo.subject,
        instruction.setup.kind === "init" ? startSubjectFrame : endSubjectFrame
      );

    frames = moveByEasing(
      startParams,
      instruction.dynamic,
      easedT,
      subjectFrames,
      instruction.setup.kind,
      subjectInfo.subject,
      instruction.setup.config.shotSize
    );
  }

  const semanticFrames: CameraParameters[] = [];
  frames.forEach((camera, index) => {
    const aboveGroundCamera = {
      ...camera,
      position: camera.position.clone(),
      rotation: camera.rotation.clone(),
    };
    aboveGroundCamera.position.y = Math.max(
      MIN_CAMERA_HEIGHT,
      aboveGroundCamera.position.y
    );
    const subjectFrame =
      subjectFrames[Math.min(index, subjectFrames.length - 1)];
    const previousSubjectFrame =
      subjectFrames[Math.max(0, Math.min(index - 1, subjectFrames.length - 1))];
    const referenceCamera = semanticFrames[index - 1] ?? aboveGroundCamera;
    const requestedFraming =
      instruction.setup.config.subjectFraming?.position;
    semanticFrames.push(applyConstraintsOnFrame(
      aboveGroundCamera,
      referenceCamera,
      instruction.constraints,
      subjectFrame,
      subjectInfo.subject.dimensions,
      requestedFraming,
      previousSubjectFrame
    ));
  });

  if (!instruction.constraints?.allFramesVisibility) {
    const constrained = applyConfiguredMotionConstraints(semanticFrames);
    if (
      !satisfiesSpeedConstraints(
        toMotionConstraintSpace(constrained),
        instruction.constraints?.maxSpeed,
        instruction.constraints?.maxAccelerate
      )
    ) {
      throw new Error("Unable to satisfy camera speed/acceleration constraints");
    }
    return constrained;
  }

  let constrainedFrames = semanticFrames;

  const requestedFraming =
    instruction.setup.config.subjectFraming?.position;
  const positionAtRadiusAboveFloor = (
    subjectPosition: THREE.Vector3,
    direction: THREE.Vector3,
    radius: number
  ): THREE.Vector3 => {
    const normalizedDirection = direction.clone().normalize();
    const candidate = subjectPosition
      .clone()
      .add(normalizedDirection.clone().multiplyScalar(radius));
    if (candidate.y >= MIN_CAMERA_HEIGHT) return candidate;

    const verticalDistance = Math.max(
      MIN_CAMERA_HEIGHT - subjectPosition.y,
      -radius
    );
    const horizontalDistance = Math.sqrt(
      Math.max(0, radius * radius - verticalDistance * verticalDistance)
    );
    const horizontalDirection = new THREE.Vector3(
      normalizedDirection.x,
      0,
      normalizedDirection.z
    );
    if (horizontalDirection.lengthSq() < 1e-8) {
      horizontalDirection.set(0, 0, 1);
    }
    horizontalDirection.normalize().multiplyScalar(horizontalDistance);
    return subjectPosition
      .clone()
      .add(horizontalDirection)
      .add(new THREE.Vector3(0, verticalDistance, 0));
  };
  const repairVisibility = (
    cameras: CameraParameters[],
    adjustDistance: boolean
  ): CameraParameters[] => cameras.map((camera, index) => {
    const subjectFrame =
      subjectFrames[Math.min(index, subjectFrames.length - 1)];
    return fixSubjectInView(
      camera,
      subjectFrame.position,
      subjectInfo.subject.dimensions,
      requestedFraming,
      subjectFrame.rotation,
      true,
      adjustDistance
    );
  });
  const repairAtCommonRadius = (
    cameras: CameraParameters[]
  ): CameraParameters[] => {
    const individuallyFitted = repairVisibility(cameras, true);
    const commonRadius = individuallyFitted.reduce((maximum, camera, index) => {
      const subjectFrame =
        subjectFrames[Math.min(index, subjectFrames.length - 1)];
      return Math.max(maximum, camera.position.distanceTo(subjectFrame.position));
    }, 0);

    return individuallyFitted.map((camera, index) => {
      const subjectFrame =
        subjectFrames[Math.min(index, subjectFrames.length - 1)];
      const direction = camera.position.clone().sub(subjectFrame.position);
      const atCommonRadius = {
        ...camera,
        position: positionAtRadiusAboveFloor(
          subjectFrame.position,
          direction,
          commonRadius
        ),
        rotation: camera.rotation.clone(),
      };
      return fixSubjectInView(
        atCommonRadius,
        subjectFrame.position,
        subjectInfo.subject.dimensions,
        requestedFraming,
        subjectFrame.rotation,
        true,
        false
      );
    });
  };
  const allSubjectsVisible = (cameras: CameraParameters[]): boolean =>
    cameras.every((camera, index) => {
      const subjectFrame =
        subjectFrames[Math.min(index, subjectFrames.length - 1)];
      return isProjectedBoundsFullyVisible(
        projectBoundingBox(
          subjectInfo.subject.dimensions,
          subjectFrame.position,
          camera,
          subjectFrame.rotation
        )
      );
    });
  const staticDistanceSatisfied = (cameras: CameraParameters[]): boolean => {
    if (!instruction.constraints?.staticDistance || cameras.length === 0) {
      return true;
    }
    const referenceDistance = cameras[0].position.distanceTo(
      subjectFrames[0].position
    );
    return cameras.every((camera, index) =>
      Math.abs(
        camera.position.distanceTo(subjectFrames[index].position) -
          referenceDistance
      ) <= 1e-6
    );
  };
  const staticRelativeRotationSatisfied = (
    cameras: CameraParameters[]
  ): boolean => {
    if (
      !instruction.constraints?.staticCameraSubjectRotation ||
      cameras.length === 0
    ) {
      return true;
    }
    const getRelativeRotation = (
      camera: CameraParameters,
      index: number
    ): THREE.Quaternion => {
      const subjectQuaternion = new THREE.Quaternion().setFromEuler(
        subjectFrames[index].rotation
      );
      return subjectQuaternion
        .invert()
        .multiply(new THREE.Quaternion().setFromEuler(camera.rotation));
    };
    const referenceRotation = getRelativeRotation(cameras[0], 0);
    return cameras.every(
      (camera, index) =>
        referenceRotation.angleTo(getRelativeRotation(camera, index)) <= 1e-6
    );
  };
  const motionConstraintsSatisfied = (
    cameras: CameraParameters[]
  ): boolean => satisfiesSpeedConstraints(
    toMotionConstraintSpace(cameras),
    instruction.constraints?.maxSpeed,
    instruction.constraints?.maxAccelerate
  );

  // Visibility repair can alter position, while a subsequent kinematic clamp
  // can move the camera back toward an invalid close path.  Alternate the two
  // deterministic projections and only return once both postconditions hold.
  for (let attempt = 0; attempt < 3; attempt++) {
    constrainedFrames = instruction.constraints.staticDistance
      ? repairAtCommonRadius(constrainedFrames)
      : repairVisibility(constrainedFrames, true);
    constrainedFrames = applyConfiguredMotionConstraints(constrainedFrames);
    constrainedFrames = instruction.constraints.staticDistance
      ? repairAtCommonRadius(constrainedFrames)
      : repairVisibility(constrainedFrames, false);
    if (
      allSubjectsVisible(constrainedFrames) &&
      staticDistanceSatisfied(constrainedFrames) &&
      staticRelativeRotationSatisfied(constrainedFrames) &&
      motionConstraintsSatisfied(constrainedFrames)
    ) {
      return constrainedFrames;
    }
  }

  throw new Error(
    `Unable to satisfy camera postconditions (visibility=${allSubjectsVisible(
      constrainedFrames
    )}, staticDistance=${staticDistanceSatisfied(
      constrainedFrames
    )}, staticRelativeRotation=${staticRelativeRotationSatisfied(
      constrainedFrames
    )}, motion=${motionConstraintsSatisfied(
      constrainedFrames
    )}, measuredMotion=${JSON.stringify(
      measureCanonicalMotion(toMotionConstraintSpace(constrainedFrames))
    )})`
  );
};
