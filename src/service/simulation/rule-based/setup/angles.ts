import * as THREE from "three";
import { SetupConfig } from "../../instruction/types";
import { SubjectFrame } from "../../../subjects/types";
import {
  getDesiredVerticalAngle,
  getDesiredHorizontalAngle,
} from "../../instruction/helpers/static";

export const calculatePositionByAngles = (
  setup: SetupConfig,
  frame: SubjectFrame
): THREE.Vector3 => {
  const subjectPosition = frame.position;
  const baseDistance = 200;

  const verticalAngle = setup?.cameraAngle
    ? getDesiredVerticalAngle(setup.cameraAngle)
    : Math.PI / 2;

  const horizontalAngle = setup?.subjectView
    ? getDesiredHorizontalAngle(setup.subjectView)
    : 0;

  const offset = new THREE.Vector3(
    baseDistance * Math.sin(verticalAngle) * Math.sin(horizontalAngle),
    baseDistance * Math.cos(verticalAngle),
    -baseDistance * Math.sin(verticalAngle) * Math.cos(horizontalAngle)
  ).applyQuaternion(new THREE.Quaternion().setFromEuler(frame.rotation));

  return offset.add(subjectPosition);
};
