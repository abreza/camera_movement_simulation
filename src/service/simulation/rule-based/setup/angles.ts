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

  const x = baseDistance * Math.sin(verticalAngle) * Math.sin(horizontalAngle);
  const y = baseDistance * Math.cos(verticalAngle);
  const z = baseDistance * Math.sin(verticalAngle) * Math.cos(horizontalAngle);

  return new THREE.Vector3(x, y, z).add(subjectPosition);
};
