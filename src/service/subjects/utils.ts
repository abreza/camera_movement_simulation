import * as THREE from "three";
import { SubjectFrame } from "./types";
import { randomValue } from "@/utils/randomUtils";

export function getRandomWithSeed(seed: number, min = 0, max = 1): number {
  const x = Math.sin(seed) * 10000;
  const random = x - Math.floor(x);
  return min + random * (max - min);
}

export function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash) / 1000000;
}

export function addMovementNoise(
  frames: SubjectFrame[],
  noiseSettings: {
    positionAmplitude?: number;
    rotationAmplitude?: number;
    frequency?: number;
    grounded?: boolean;
  } = {}
): SubjectFrame[] {
  const {
    positionAmplitude = 0.1,
    rotationAmplitude = 0.02,
    frequency = 0.5,
    grounded = false,
  } = noiseSettings;

  const seeds = {
    px: randomValue() * 100,
    py: randomValue() * 100,
    pz: randomValue() * 100,
    rx: randomValue() * 100,
    ry: randomValue() * 100,
    rz: randomValue() * 100,
  };

  return frames.map((frame, index) => {
    // Express frequency in cycles per clip, not radians per frame.  This keeps
    // the same motion character for both 100- and 500-frame exports and avoids
    // high-frequency vehicle jitter on long clips.
    const progress = index / Math.max(1, frames.length - 1);
    const phase = progress * frequency * Math.PI * 2;
    const noise = {
      px: Math.sin(phase + seeds.px) * positionAmplitude,
      py: grounded
        ? 0
        : Math.sin(phase + seeds.py) * positionAmplitude,
      pz: Math.sin(phase + seeds.pz) * positionAmplitude,
      rx: grounded
        ? 0
        : Math.sin(phase + seeds.rx) * rotationAmplitude,
      ry: Math.sin(phase + seeds.ry) * rotationAmplitude,
      rz: grounded
        ? 0
        : Math.sin(phase + seeds.rz) * rotationAmplitude,
    };

    return {
      position: new THREE.Vector3(
        frame.position.x + noise.px,
        frame.position.y + noise.py,
        frame.position.z + noise.pz
      ),
      rotation: new THREE.Euler(
        frame.rotation.x + noise.rx,
        frame.rotation.y + noise.ry,
        frame.rotation.z + noise.rz,
        frame.rotation.order
      ),
    };
  });
}
