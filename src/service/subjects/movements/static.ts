import * as THREE from "three";
import { Subject, SubjectFrame, RandomizationSettings } from "../types";
import { DEFAULT_FRAME_COUNT } from "../../simulation/constants";

export function generateStaticMotion(
  subject: Subject,
  index: number,
  totalSubjects: number,
  randomSettings?: RandomizationSettings
): SubjectFrame[] {
  const frames: SubjectFrame[] = [];
  const CIRCLE_RADIUS = 5;

  let angle = (2 * Math.PI * index) / totalSubjects;
  let x = CIRCLE_RADIUS * Math.cos(angle);
  let z = CIRCLE_RADIUS * Math.sin(angle);
  let y = subject.dimensions.height / 2;

  if (randomSettings?.enabled) {
    angle += randomSettings.rotationOffset || 0;
    const radius = CIRCLE_RADIUS * (randomSettings.positionOffset?.radius || 1);

    x = radius * Math.cos(angle) + (randomSettings.positionOffset?.x || 0);
    z = radius * Math.sin(angle) + (randomSettings.positionOffset?.z || 0);
    y = subject.dimensions.height / 2 + (randomSettings.positionOffset?.y || 0);

  }

  for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
    frames.push({
      position: new THREE.Vector3(x, y, z),
      rotation: new THREE.Euler(0, angle, 0),
    });
  }

  return frames;
}
