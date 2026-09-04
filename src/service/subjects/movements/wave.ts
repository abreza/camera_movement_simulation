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
  // Broad, low-curvature lane changes are plausible for ground vehicles. The
  // previous 3-cycle/8-to-10-unit wave forced near-instant heading reversals.
  const WAVE_WIDTH = 2;
  const WAVE_LENGTH = 14;
  const WAVE_FREQUENCY = 1.25;
  let startZ = -WAVE_LENGTH / 2 + (WAVE_LENGTH * index) / totalSubjects;

  if (randomSettings?.enabled) {
    startZ += randomSettings.positionOffset?.z || 0;
    const startX = randomSettings.positionOffset?.x || 0;

    const waveWidth = WAVE_WIDTH * (randomSettings.positionOffset?.radius || 1);
    const waveFreq =
      WAVE_FREQUENCY * getRandomWithSeed(randomSettings.seed + 0.81, 0.7, 1.3);

    const reverseDirection =
      randomSettings.directionReversalProbability &&
      getRandomWithSeed(randomSettings.seed + 0.7, 0, 1) <
        randomSettings.directionReversalProbability;
    const direction = reverseDirection ? -1 : 1;

    const phaseOffset = randomSettings.phaseOffset || 0;

    for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
      const progress = frame / (DEFAULT_FRAME_COUNT - 1);
      const z = startZ + direction * progress * WAVE_LENGTH;
      const x =
        startX +
        waveWidth *
          Math.sin(
            progress * waveFreq * 2 * Math.PI + phaseOffset
          );
      const y =
        subject.dimensions.height / 2 + (randomSettings.positionOffset?.y || 0);

      const dx =
        waveWidth *
        waveFreq *
        2 *
        Math.PI *
        Math.cos(progress * waveFreq * 2 * Math.PI + phaseOffset);
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
      const progress = frame / (DEFAULT_FRAME_COUNT - 1);
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
