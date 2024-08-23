import { Subject } from "@/types/simulation";
import * as THREE from "three";

export const INITIAL_SUBJECTS: Subject[] = [
  {
    position: new THREE.Vector3(0, 0, 0),
    size: new THREE.Vector3(1, 1, 1),
    rotation: new THREE.Euler(0, 0, 0),
  },
  {
    position: new THREE.Vector3(3, 0, 0),
    size: new THREE.Vector3(1, 1, 1),
    rotation: new THREE.Euler(0, 0, 0),
  },
  {
    position: new THREE.Vector3(-3, 0, 0),
    size: new THREE.Vector3(1, 1, 1),
    rotation: new THREE.Euler(0, 0, 0),
  },
];

export const DEFAULT_FRAME_COUNT = 60;
