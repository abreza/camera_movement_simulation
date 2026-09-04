import * as THREE from "three";
import { Subject, SubjectFrame, RandomizationSettings } from "../types";
import { DEFAULT_FRAME_COUNT } from "../../simulation/constants";
import { getRandomWithSeed } from "../utils";

export function generateFigureEightMotion(
  subject: Subject,
  index: number,
  totalSubjects: number,
  randomSettings?: RandomizationSettings
): SubjectFrame[] {
  const frames: SubjectFrame[] = [];
  const FIGURE_8_WIDTH = 6;
  const FIGURE_8_LENGTH = 3;
  let angleOffset = (2 * Math.PI * index) / totalSubjects;

  if (randomSettings?.enabled) {
    angleOffset += randomSettings.rotationOffset || 0;

    const width = FIGURE_8_WIDTH * (randomSettings.positionOffset?.radius || 1);
    const length =
      FIGURE_8_LENGTH * (randomSettings.positionOffset?.radius || 1);

    const speedFactor = randomSettings.speedFactor
      ? getRandomWithSeed(
          randomSettings.seed + 0.8,
          randomSettings.speedFactor.min,
          randomSettings.speedFactor.max
        )
      : 1;

    const reverseDirection =
      randomSettings.directionReversalProbability &&
      getRandomWithSeed(randomSettings.seed + 0.7, 0, 1) <
        randomSettings.directionReversalProbability;
    const direction = reverseDirection ? -1 : 1;

    const phaseOffset = randomSettings.phaseOffset || 0;

    for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
      const progress = frame / (DEFAULT_FRAME_COUNT - 1);
      const angle =
        direction * 2 * Math.PI * progress * speedFactor +
        angleOffset +
        phaseOffset;

      const x =
        width * Math.sin(angle) + (randomSettings.positionOffset?.x || 0);
      const z =
        length * Math.sin(2 * angle) + (randomSettings.positionOffset?.z || 0);
      const y =
        subject.dimensions.height / 2 + (randomSettings.positionOffset?.y || 0);

      const dx = width * Math.cos(angle) * direction;
      const dz = 2 * length * Math.cos(2 * angle) * direction;
      const rotation = new THREE.Euler(
        0,
        Math.atan2(dx, dz) + (randomSettings.rotationOffset || 0),
        0
      );

      frames.push({
        position: new THREE.Vector3(x, y, z),
        rotation: rotation,
      });
    }
  } else {
    for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
      const progress = frame / (DEFAULT_FRAME_COUNT - 1);
      const angle = 2 * Math.PI * progress + angleOffset;

      const x = FIGURE_8_WIDTH * Math.sin(angle);
      const z = FIGURE_8_LENGTH * Math.sin(2 * angle);
      const y = subject.dimensions.height / 2;

      const dx = FIGURE_8_WIDTH * Math.cos(angle);
      const dz = 2 * FIGURE_8_LENGTH * Math.cos(2 * angle);
      const rotation = new THREE.Euler(0, Math.atan2(dx, dz), 0);

      frames.push({
        position: new THREE.Vector3(x, y, z),
        rotation: rotation,
      });
    }
  }

  return frames;
}
