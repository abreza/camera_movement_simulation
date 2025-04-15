import * as THREE from "three";
import { Subject, SubjectFrame, RandomizationSettings } from "../types";
import { DEFAULT_FRAME_COUNT } from "../../simulation/constants";
import { getRandomWithSeed } from "../utils";

export function generateCircularMotion(
  subject: Subject,
  index: number,
  totalSubjects: number,
  randomSettings?: RandomizationSettings
): SubjectFrame[] {
  const CIRCLE_RADIUS = 5;
  const frames: SubjectFrame[] = [];
  let angleOffset = (2 * Math.PI * index) / totalSubjects;

  const radius =
    CIRCLE_RADIUS *
    (randomSettings?.enabled && randomSettings.positionOffset?.radius
      ? randomSettings.positionOffset.radius
      : 1);

  if (randomSettings?.enabled) {
    angleOffset += randomSettings.rotationOffset || 0;

    const reverseDirection =
      randomSettings.directionReversalProbability &&
      getRandomWithSeed(randomSettings.seed + 0.7, 0, 1) <
        randomSettings.directionReversalProbability;

    const speedFactor = randomSettings.speedFactor
      ? getRandomWithSeed(
          randomSettings.seed + 0.8,
          randomSettings.speedFactor.min,
          randomSettings.speedFactor.max
        )
      : 1;

    for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
      const direction = reverseDirection ? -1 : 1;
      const angle =
        (direction * (2 * Math.PI * frame * speedFactor)) /
          DEFAULT_FRAME_COUNT +
        angleOffset;

      const x =
        radius * Math.cos(angle) + (randomSettings.positionOffset?.x || 0);
      const z =
        radius * Math.sin(angle) + (randomSettings.positionOffset?.z || 0);
      const y =
        subject.dimensions.height / 2 + (randomSettings.positionOffset?.y || 0);

      frames.push({
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Euler(0, angle, 0),
      });
    }
  } else {
    for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
      const angle = (2 * Math.PI * frame) / DEFAULT_FRAME_COUNT + angleOffset;
      const x = CIRCLE_RADIUS * Math.cos(angle);
      const z = CIRCLE_RADIUS * Math.sin(angle);
      const y = subject.dimensions.height / 2;

      frames.push({
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Euler(0, angle, 0),
      });
    }
  }

  return frames;
}
