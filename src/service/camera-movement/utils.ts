import * as THREE from "three";

export const applyHandheldEffect = (
  position: THREE.Vector3,
  rotation: THREE.Euler
) => {
  const handheldIntensity = 0.05;
  position.x += (Math.random() - 0.5) * handheldIntensity;
  position.y += (Math.random() - 0.5) * handheldIntensity;
  position.z += (Math.random() - 0.5) * handheldIntensity;
  rotation.x += (Math.random() - 0.5) * handheldIntensity * 0.1;
  rotation.y += (Math.random() - 0.5) * handheldIntensity * 0.1;
};

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
