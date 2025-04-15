import * as THREE from "three";
import { Subject, SubjectFrame, RandomizationSettings } from "../types";
import { DEFAULT_FRAME_COUNT } from "../../simulation/constants";
import { getRandomWithSeed } from "../utils";

export function generatePendulumMotion(
  subject: Subject,
  index: number,
  totalSubjects: number,
  randomSettings?: RandomizationSettings
): SubjectFrame[] {
  const frames: SubjectFrame[] = [];
  const PENDULUM_LENGTH = 8;
  const MAX_ANGLE = Math.PI / 3;
  const PENDULUM_FREQUENCY = 2;
  let phaseOffset = (index / totalSubjects) * 2 * Math.PI;

  if (randomSettings?.enabled) {
    const pendulumLength =
      PENDULUM_LENGTH * (randomSettings.positionOffset?.radius || 1);
    const maxAngle =
      MAX_ANGLE * getRandomWithSeed(randomSettings.seed + 0.82, 0.7, 1.3);
    const pendulumFreq =
      PENDULUM_FREQUENCY *
      getRandomWithSeed(randomSettings.seed + 0.83, 0.7, 1.3);

    phaseOffset += randomSettings.phaseOffset || 0;

    const speedFactor = randomSettings.speedFactor
      ? getRandomWithSeed(
          randomSettings.seed + 0.8,
          randomSettings.speedFactor.min,
          randomSettings.speedFactor.max
        )
      : 1;

    const posX = randomSettings.positionOffset?.x || 0;
    const posZ = randomSettings.positionOffset?.z || 0;

    for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
      const progress = frame / DEFAULT_FRAME_COUNT;
      const angle =
        maxAngle *
        Math.sin(
          progress * pendulumFreq * 2 * Math.PI * speedFactor + phaseOffset
        );

      const x = pendulumLength * Math.sin(angle) + posX;
      const z = pendulumLength * Math.cos(angle) + posZ;
      const y =
        subject.dimensions.height / 2 + (randomSettings.positionOffset?.y || 0);

      frames.push({
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Euler(
          0,
          angle + Math.PI + (randomSettings.rotationOffset || 0),
          0
        ),
      });
    }
  } else {
    for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
      const progress = frame / DEFAULT_FRAME_COUNT;
      const angle =
        MAX_ANGLE *
        Math.sin(progress * PENDULUM_FREQUENCY * 2 * Math.PI + phaseOffset);

      const x = PENDULUM_LENGTH * Math.sin(angle);
      const z = PENDULUM_LENGTH * Math.cos(angle);
      const y = subject.dimensions.height / 2;

      frames.push({
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Euler(0, angle + Math.PI, 0),
      });
    }
  }

  return frames;
}
