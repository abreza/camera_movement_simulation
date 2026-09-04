import * as THREE from "three";
import { Subject, SubjectFrame, RandomizationSettings } from "../types";
import { DEFAULT_FRAME_COUNT } from "../../simulation/constants";
import { getRandomWithSeed } from "../utils";

export function generateSpiralMotion(
  subject: Subject,
  index: number,
  totalSubjects: number,
  randomSettings?: RandomizationSettings
): SubjectFrame[] {
  const frames: SubjectFrame[] = [];
  const MAX_RADIUS = 6;
  const SPIRAL_TURNS = 2;
  let angleOffset = (2 * Math.PI * index) / totalSubjects;

  if (randomSettings?.enabled) {
    angleOffset += randomSettings.rotationOffset || 0;

    const maxRadius = MAX_RADIUS * (randomSettings.positionOffset?.radius || 1);

    const speedFactor = randomSettings.speedFactor
      ? getRandomWithSeed(
          randomSettings.seed + 0.8,
          randomSettings.speedFactor.min,
          randomSettings.speedFactor.max
        )
      : 1;

    const spiralTurns = SPIRAL_TURNS * speedFactor;

    const reverseDirection =
      randomSettings.directionReversalProbability &&
      getRandomWithSeed(randomSettings.seed + 0.7, 0, 1) <
        randomSettings.directionReversalProbability;
    const direction = reverseDirection ? -1 : 1;

    for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
      const progress = frame / (DEFAULT_FRAME_COUNT - 1);
      const angle =
        direction * progress * spiralTurns * 2 * Math.PI + angleOffset;
      const radius = progress * maxRadius;

      const x =
        radius * Math.cos(angle) + (randomSettings.positionOffset?.x || 0);
      const z =
        radius * Math.sin(angle) + (randomSettings.positionOffset?.z || 0);
      const y =
        subject.dimensions.height / 2 + (randomSettings.positionOffset?.y || 0);

      frames.push({
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Euler(
          0,
          angle + Math.PI / 2 + (randomSettings.rotationOffset || 0),
          0
        ),
      });
    }
  } else {
    for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
      const progress = frame / (DEFAULT_FRAME_COUNT - 1);
      const angle = progress * SPIRAL_TURNS * 2 * Math.PI + angleOffset;
      const radius = progress * MAX_RADIUS;

      frames.push({
        position: new THREE.Vector3(
          radius * Math.cos(angle),
          subject.dimensions.height / 2,
          radius * Math.sin(angle)
        ),
        rotation: new THREE.Euler(0, angle + Math.PI / 2, 0),
      });
    }
  }

  return frames;
}
