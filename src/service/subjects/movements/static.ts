import * as THREE from "three";
import { Subject, SubjectFrame, RandomizationSettings } from "../types";
import { DEFAULT_FRAME_COUNT } from "../../simulation/constants";
import { getRandomWithSeed } from "../utils";

export function generateStaticMotion(
  subject: Subject,
  index: number,
  totalSubjects: number,
  randomSettings?: RandomizationSettings
): SubjectFrame[] {
  const frames: SubjectFrame[] = [];
  const CIRCLE_RADIUS = 5;

  let angle = (2 * Math.PI * index) / totalSubjects;
  let x = CIRCLE_RADIUS * Math.cos(angle);
  let z = CIRCLE_RADIUS * Math.sin(angle);
  let y = subject.dimensions.height / 2;

  if (randomSettings?.enabled) {
    angle += randomSettings.rotationOffset || 0;
    const radius = CIRCLE_RADIUS * (randomSettings.positionOffset?.radius || 1);

    x = radius * Math.cos(angle) + (randomSettings.positionOffset?.x || 0);
    z = radius * Math.sin(angle) + (randomSettings.positionOffset?.z || 0);
    y = subject.dimensions.height / 2 + (randomSettings.positionOffset?.y || 0);

    const subtleMovement =
      getRandomWithSeed(randomSettings.seed + 0.95, 0, 1) < 0.3;

    if (subtleMovement) {
      const subtleAmplitude = getRandomWithSeed(
        randomSettings.seed + 0.96,
        0.01,
        0.1
      );
      const subtleFrequency = getRandomWithSeed(
        randomSettings.seed + 0.97,
        0.1,
        0.5
      );

      for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
        const progress = frame / DEFAULT_FRAME_COUNT;
        const subtleX =
          x +
          Math.sin(progress * Math.PI * 2 * subtleFrequency) * subtleAmplitude;
        const subtleZ =
          z +
          Math.cos(progress * Math.PI * 2 * subtleFrequency) * subtleAmplitude;
        const subtleY =
          y +
          (Math.sin(progress * Math.PI * 4 * subtleFrequency) *
            subtleAmplitude) /
            2;

        frames.push({
          position: new THREE.Vector3(subtleX, subtleY, subtleZ),
          rotation: new THREE.Euler(
            0,
            angle + subtleAmplitude * Math.sin(progress * Math.PI * 2),
            0
          ),
        });
      }
      return frames;
    }
  }

  for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
    frames.push({
      position: new THREE.Vector3(x, y, z),
      rotation: new THREE.Euler(0, angle, 0),
    });
  }

  return frames;
}
