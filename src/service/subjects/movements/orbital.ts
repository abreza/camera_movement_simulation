import * as THREE from "three";
import { Subject, SubjectFrame, RandomizationSettings } from "../types";
import { DEFAULT_FRAME_COUNT } from "../../simulation/constants";
import { getRandomWithSeed } from "../utils";

export function generateOrbitalMotion(
  subject: Subject,
  index: number,
  totalSubjects: number,
  randomSettings?: RandomizationSettings
): SubjectFrame[] {
  const frames: SubjectFrame[] = [];
  const ORBIT_RADIUS = 8;
  const CENTER_OFFSET = new THREE.Vector3(4, 0, 0);
  let angleOffset = (2 * Math.PI * index) / totalSubjects;
  const ORBIT_TILT = Math.PI / 6;

  if (randomSettings?.enabled) {
    const orbitRadius =
      ORBIT_RADIUS * (randomSettings.positionOffset?.radius || 1);

    const centerX = CENTER_OFFSET.x + (randomSettings.positionOffset?.x || 0);
    const centerY = CENTER_OFFSET.y + (randomSettings.positionOffset?.y || 0);
    const centerZ = CENTER_OFFSET.z + (randomSettings.positionOffset?.z || 0);
    const center = new THREE.Vector3(centerX, centerY, centerZ);

    const orbitTilt =
      ORBIT_TILT * getRandomWithSeed(randomSettings.seed + 0.84, 0.5, 1.5);
    angleOffset += randomSettings.rotationOffset || 0;

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

    for (let frame = 0; frame < DEFAULT_FRAME_COUNT; frame++) {
      const progress = frame / (DEFAULT_FRAME_COUNT - 1);
      const angle =
        direction * 2 * Math.PI * progress * speedFactor + angleOffset;

      const x = center.x + orbitRadius * Math.cos(angle);
      const z = center.z + orbitRadius * Math.sin(angle) * Math.cos(orbitTilt);
      const y =
        center.y +
        orbitRadius * Math.sin(angle) * Math.sin(orbitTilt) +
        subject.dimensions.height / 2;

      const directionToCenter = new THREE.Vector3(x, y, z).sub(center);
      const rotation = new THREE.Euler(
        0,
        Math.atan2(directionToCenter.x, directionToCenter.z) +
          (randomSettings.rotationOffset || 0),
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

      const x = CENTER_OFFSET.x + ORBIT_RADIUS * Math.cos(angle);
      const z =
        CENTER_OFFSET.z + ORBIT_RADIUS * Math.sin(angle) * Math.cos(ORBIT_TILT);
      const y =
        CENTER_OFFSET.y +
        ORBIT_RADIUS * Math.sin(angle) * Math.sin(ORBIT_TILT) +
        subject.dimensions.height / 2;

      const directionToCenter = new THREE.Vector3(x, y, z).sub(CENTER_OFFSET);
      const rotation = new THREE.Euler(
        0,
        Math.atan2(directionToCenter.x, directionToCenter.z),
        0
      );

      frames.push({
        position: new THREE.Vector3(x, y, z),
        rotation: rotation,
      });
    }
  }

  return frames;
}
