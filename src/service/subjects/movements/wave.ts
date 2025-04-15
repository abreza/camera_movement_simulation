import * as THREE from "three";
import { Subject, SubjectFrame, RandomizationSettings } from "../types";
import { DEFAULT_FRAME_COUNT } from "../../simulation/constants";
import { getRandomWithSeed } from "../utils";

export function generateWaveMotion(
  subject: Subject,
  index: number,
  totalSubjects: number,
  randomSettings?: RandomizationSettings
): SubjectFrame[] {
  const frames: SubjectFrame[] = [];
  const WAVE_WIDTH = 3;
  const WAVE_LENGTH = 10;
  const WAVE_FREQUENCY = 3;
  let startZ = -WAVE_LENGTH / 2 + (WAVE_LENGTH * index) / totalSubjects;

  if (randomSettings?.enabled) {
    startZ += randomSettings.positionOffset?.z || 0;
    const startX = randomSettings.positionOffset?.x || 0;

    const waveWidth = WAVE_WIDTH * (randomSettings.positionOffset?.radius || 1);
    const waveFreq =
      WAVE_FREQUENCY * getRandomWithSeed(randomSettings.seed + 0.81, 0.7, 1.3);

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
      const progress = frame / DEFAULT_FRAME_COUNT;
      const z = startZ + direction * progress * WAVE_LENGTH;
      const x =
        startX +
        waveWidth *
          Math.sin(
            progress * waveFreq * 2 * Math.PI * speedFactor + phaseOffset
          );
      const y =
        subject.dimensions.height / 2 + (randomSettings.positionOffset?.y || 0);

      const dx =
        waveWidth *
        waveFreq *
        2 *
        Math.PI *
        speedFactor *
        Math.cos(progress * waveFreq * 2 * Math.PI * speedFactor + phaseOffset);
      const dz = direction * WAVE_LENGTH;
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
      const progress = frame / DEFAULT_FRAME_COUNT;
      const z = startZ + progress * WAVE_LENGTH;
      const x = WAVE_WIDTH * Math.sin(progress * WAVE_FREQUENCY * 2 * Math.PI);
      const y = subject.dimensions.height / 2;

      const dx =
        WAVE_WIDTH *
        WAVE_FREQUENCY *
        2 *
        Math.PI *
        Math.cos(progress * WAVE_FREQUENCY * 2 * Math.PI);
      const dz = WAVE_LENGTH;
      const rotation = new THREE.Euler(0, Math.atan2(dx, dz), 0);

      frames.push({
        position: new THREE.Vector3(x, y, z),
        rotation: rotation,
      });
    }
  }

  return frames;
}
