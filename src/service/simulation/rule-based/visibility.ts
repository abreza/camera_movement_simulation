import * as THREE from "three";
import { CameraParameters } from "../instruction/types";
import { SubjectInfo } from "@/service/subjects/types";
import { getLookAtAngle } from "../utils";

export const applyVisibilityConstraints = (
  frames: CameraParameters[],
  subjectInfo: SubjectInfo
): CameraParameters[] => {
  if (!subjectInfo.frames?.length) {
    return frames;
  }

  const updatedFrames = frames.map((frame) => ({
    position: frame.position.clone(),
    rotation: frame.rotation.clone(),
    focalLength: frame.focalLength,
    aspectRatio: frame.aspectRatio,
  }));

  for (let i = 0; i < frames.length; i++) {
    const visibilityWeight = 1 - 2 * (i / frames.length - 0.5) ** 2;
    const subjectFrame =
      subjectInfo.frames[Math.min(i, subjectInfo.frames.length - 1)];

    const currentLookDirection = new THREE.Vector3(0, 0, -1);
    currentLookDirection.applyEuler(updatedFrames[i].rotation);

    const targetRotation = getLookAtAngle(
      updatedFrames[i].position,
      subjectFrame.position
    );

    const currentQuaternion = new THREE.Quaternion().setFromEuler(
      updatedFrames[i].rotation
    );
    const targetQuaternion = new THREE.Quaternion().setFromEuler(
      targetRotation
    );

    currentQuaternion.slerp(targetQuaternion, visibilityWeight);

    updatedFrames[i].rotation.setFromQuaternion(currentQuaternion);
  }

  return updatedFrames;
};
