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
  const ZIGZAG_WIDTH = 1.75;
  const ZIGZAG_LENGTH = 14;
  const ZIGZAG_FREQUENCY = 2;
  const ZIGZAG_SHARPNESS = 0.9;
  const normalizedRoundedTriangle = (phase: number): number =>
    Math.asin(ZIGZAG_SHARPNESS * Math.sin(phase)) /
    Math.asin(ZIGZAG_SHARPNESS);
  const roundedTriangleDerivative = (phase: number): number =>
    (ZIGZAG_SHARPNESS * Math.cos(phase)) /
    (Math.asin(ZIGZAG_SHARPNESS) *
      Math.sqrt(
        1 -
          ZIGZAG_SHARPNESS ** 2 * Math.sin(phase) ** 2
      ));
  let startZ = -ZIGZAG_LENGTH / 2 + (ZIGZAG_LENGTH * index) / totalSubjects;

  if (randomSettings?.enabled) {
    startZ += randomSettings.positionOffset?.z || 0;
    const startX = randomSettings.positionOffset?.x || 0;

    const pathFrequency =
      ZIGZAG_FREQUENCY *
      getRandomWithSeed(randomSettings.seed + 0.81, 0.8, 1.2);

    const phaseOffset = randomSettings.phaseOffset || 0;

    const reverseDirection =
      randomSettings.directionReversalProbability &&
      getRandomWithSeed(randomSettings.seed + 0.7, 0, 1) <
        randomSettings.directionReversalProbability;
    const direction = reverseDirection ? -1 : 1;

    for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
      const progress = frame / (DEFAULT_FRAME_COUNT - 1);
      const z = startZ + direction * progress * ZIGZAG_LENGTH;
      const phase = progress * pathFrequency * 2 * Math.PI + phaseOffset;
      const x =
        startX + ZIGZAG_WIDTH * normalizedRoundedTriangle(phase);
      const y =
        subject.dimensions.height / 2 + (randomSettings.positionOffset?.y || 0);

      frames.push({
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Euler(
          0,
          Math.atan2(
            roundedTriangleDerivative(phase) *
              pathFrequency *
              2 *
              Math.PI *
              ZIGZAG_WIDTH *
              direction,
            ZIGZAG_LENGTH * direction
          ) + (randomSettings.rotationOffset || 0),
          0
        ),
      });
    }
  } else {
    for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
      const progress = frame / (DEFAULT_FRAME_COUNT - 1);
      const z = startZ + progress * ZIGZAG_LENGTH;
      const phase = progress * ZIGZAG_FREQUENCY * 2 * Math.PI;
      const x = ZIGZAG_WIDTH * normalizedRoundedTriangle(phase);
      const y = subject.dimensions.height / 2;

      frames.push({
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Euler(
          0,
          Math.atan2(
            roundedTriangleDerivative(phase) *
              ZIGZAG_FREQUENCY *
              2 *
              Math.PI *
              ZIGZAG_WIDTH,
            ZIGZAG_LENGTH
          ),
          0
        ),
      });
    }
  }

  return frames;
}
