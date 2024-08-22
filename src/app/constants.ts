import * as THREE from "three";

export const INITIAL_SUBJECTS = [
  {
    position: new THREE.Vector3(0, 0, 0),
    size: new THREE.Vector3(1, 1, 1),
  },
  {
    position: new THREE.Vector3(3, 0, 0),
    size: new THREE.Vector3(1, 1, 1),
  },
  {
    position: new THREE.Vector3(-3, 0, 0),
    size: new THREE.Vector3(1, 1, 1),
  },
];

export const DEFAULT_FRAME_COUNT = 60;
