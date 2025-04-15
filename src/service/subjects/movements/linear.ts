import * as THREE from "three";
import { Subject, SubjectFrame, RandomizationSettings } from "../types";
import { DEFAULT_FRAME_COUNT } from "../../simulation/constants";
import { getRandomWithSeed } from "../utils";

export function generateLinearMotion(
  subject: Subject,
  index: number,
  totalSubjects: number,
  randomSettings?: RandomizationSettings
): SubjectFrame[] {
  const frames: SubjectFrame[] = [];
  const START_RADIUS = 8;
  let angleOffset = (2 * Math.PI * index) / totalSubjects;

  if (randomSettings?.enabled) {
    angleOffset += randomSettings.rotationOffset || 0;

    const radius = START_RADIUS * (randomSettings.positionOffset?.radius || 1);

    let startX =
      radius * Math.cos(angleOffset) + (randomSettings.positionOffset?.x || 0);
    let startZ =
      radius * Math.sin(angleOffset) + (randomSettings.positionOffset?.z || 0);
    let endX = -startX;
    let endZ = -startZ;

    if (randomSettings.positionOffset) {
      const endpointRandomness = getRandomWithSeed(
        randomSettings.seed + 0.9,
        0,
        1
      );
      endX += endpointRandomness * (randomSettings.positionOffset?.x || 0);
      endZ += endpointRandomness * (randomSettings.positionOffset?.z || 0);
    }

    const speedFactor = randomSettings.speedFactor
      ? getRandomWithSeed(
          randomSettings.seed + 0.8,
          randomSettings.speedFactor.min,
          randomSettings.speedFactor.max
        )
      : 1;

    for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
      let progress = (frame / DEFAULT_FRAME_COUNT) * speedFactor;

      progress = progress % 1;

      const cyclicProgress =
        progress < 0.5 ? progress * 2 : 1 - (progress - 0.5) * 2;

      const x = startX + (endX - startX) * cyclicProgress;
      const z = startZ + (endZ - startZ) * cyclicProgress;
      const y =
        subject.dimensions.height / 2 + (randomSettings.positionOffset?.y || 0);

      frames.push({
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Euler(
          0,
          Math.atan2(endZ - startZ, endX - startX) +
            (randomSettings.rotationOffset || 0),
          0
        ),
      });
    }
  } else {
    const startX = START_RADIUS * Math.cos(angleOffset);
    const startZ = START_RADIUS * Math.sin(angleOffset);
    const endX = -startX;
    const endZ = -startZ;

    for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
      const progress = frame / DEFAULT_FRAME_COUNT;
      const x = startX + (endX - startX) * progress;
      const z = startZ + (endZ - startZ) * progress;
      const y = subject.dimensions.height / 2;

      frames.push({
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Euler(
          0,
          Math.atan2(endZ - startZ, endX - startX),
          0
        ),
      });
    }
  }

  return frames;
}
