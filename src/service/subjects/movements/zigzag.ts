import * as THREE from "three";
import { Subject, SubjectFrame, RandomizationSettings } from "../types";
import { DEFAULT_FRAME_COUNT } from "../../simulation/constants";
import { getRandomWithSeed } from "../utils";

export function generateZigzagMotion(
  subject: Subject,
  index: number,
  totalSubjects: number,
  randomSettings?: RandomizationSettings
): SubjectFrame[] {
  const frames: SubjectFrame[] = [];
  const ZIGZAG_WIDTH = 4;
  const ZIGZAG_LENGTH = 8;
  let startZ = -ZIGZAG_LENGTH / 2 + (ZIGZAG_LENGTH * index) / totalSubjects;

  if (randomSettings?.enabled) {
    startZ += randomSettings.positionOffset?.z || 0;
    const startX = randomSettings.positionOffset?.x || 0;

    const speedFactor = randomSettings.speedFactor
      ? getRandomWithSeed(
          randomSettings.seed + 0.8,
          randomSettings.speedFactor.min,
          randomSettings.speedFactor.max
        )
      : 1;

    const phaseOffset = randomSettings.phaseOffset || 0;

    const reverseDirection =
      randomSettings.directionReversalProbability &&
      getRandomWithSeed(randomSettings.seed + 0.7, 0, 1) <
        randomSettings.directionReversalProbability;
    const direction = reverseDirection ? -1 : 1;

    for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
      const progress = frame / DEFAULT_FRAME_COUNT;
      const z = startZ + direction * progress * ZIGZAG_LENGTH;
      const x =
        startX +
        ZIGZAG_WIDTH *
          Math.sin(progress * 6 * Math.PI * speedFactor + phaseOffset);
      const y =
        subject.dimensions.height / 2 + (randomSettings.positionOffset?.y || 0);

      frames.push({
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Euler(
          0,
          Math.atan2(
            Math.cos(progress * 6 * Math.PI * speedFactor + phaseOffset) *
              6 *
              Math.PI *
              ZIGZAG_WIDTH *
              speedFactor *
              direction,
            ZIGZAG_LENGTH * direction
          ) + (randomSettings.rotationOffset || 0),
          0
        ),
      });
    }
  } else {
    for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
      const progress = frame / DEFAULT_FRAME_COUNT;
      const z = startZ + progress * ZIGZAG_LENGTH;
      const x = ZIGZAG_WIDTH * Math.sin(progress * 6 * Math.PI);
      const y = subject.dimensions.height / 2;

      frames.push({
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Euler(
          0,
          Math.atan2(
            Math.cos(progress * 6 * Math.PI) * 6 * Math.PI * ZIGZAG_WIDTH,
            ZIGZAG_LENGTH
          ),
          0
        ),
      });
    }
  }

  return frames;
}
