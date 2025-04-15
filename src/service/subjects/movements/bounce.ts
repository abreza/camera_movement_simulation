import * as THREE from "three";
import { Subject, SubjectFrame, RandomizationSettings } from "../types";
import { DEFAULT_FRAME_COUNT } from "../../simulation/constants";
import { getRandomWithSeed } from "../utils";

export function generateBounceMotion(
  subject: Subject,
  index: number,
  totalSubjects: number,
  randomSettings?: RandomizationSettings
): SubjectFrame[] {
  const frames: SubjectFrame[] = [];
  const BOUNCE_HEIGHT = 3;
  const BOUNCE_DISTANCE = 8;
  const BOUNCE_COUNT = 3;
  let startX = -BOUNCE_DISTANCE / 2 + (BOUNCE_DISTANCE * index) / totalSubjects;

  if (randomSettings?.enabled) {
    const bounceHeight =
      BOUNCE_HEIGHT * getRandomWithSeed(randomSettings.seed + 0.85, 0.7, 1.3);
    const bounceCount = Math.round(
      BOUNCE_COUNT * getRandomWithSeed(randomSettings.seed + 0.86, 0.7, 1.5)
    );

    startX += randomSettings.positionOffset?.x || 0;
    const startZ = randomSettings.positionOffset?.z || 0;

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
      const x = startX + direction * progress * BOUNCE_DISTANCE;
      const z = startZ;

      const bouncePhase =
        progress * bounceCount * Math.PI * speedFactor + phaseOffset;
      const normalizedHeight = Math.abs(Math.sin(bouncePhase));
      const damping =
        1 - progress * getRandomWithSeed(randomSettings.seed + 0.87, 0.4, 0.6);
      const y =
        subject.dimensions.height / 2 +
        normalizedHeight * bounceHeight * damping +
        (randomSettings.positionOffset?.y || 0);

      const verticalVelocity = Math.cos(bouncePhase) * bounceHeight * damping;
      const tiltAngle = Math.atan2(verticalVelocity, BOUNCE_DISTANCE) * 0.3;

      frames.push({
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Euler(
          tiltAngle,
          (direction * Math.PI) / 2 + (randomSettings.rotationOffset || 0),
          0
        ),
      });
    }
  } else {
    for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
      const progress = frame / DEFAULT_FRAME_COUNT;
      const x = startX + progress * BOUNCE_DISTANCE;

      const bouncePhase = progress * BOUNCE_COUNT * Math.PI;
      const normalizedHeight = Math.abs(Math.sin(bouncePhase));
      const damping = 1 - progress * 0.5;
      const y =
        subject.dimensions.height / 2 +
        normalizedHeight * BOUNCE_HEIGHT * damping;

      const z = 0;

      frames.push({
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Euler(0, 0, 0),
      });
    }
  }

  return frames;
}
