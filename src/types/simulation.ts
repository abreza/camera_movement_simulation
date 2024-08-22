import * as THREE from "three";

export enum InstructionType {
  "zoomIn" = "zoomIn",
  "zoomOut" = "zoomOut",
  "moveAround" = "moveAround",
}

export interface Instruction {
  type: InstructionType;
  subjectIndex: number;
  frameCount: number;
}

export interface CameraFrame {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
}

export interface Subject {
  position: THREE.Vector3;
  size: THREE.Vector3;
}
