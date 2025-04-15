import { CameraParameters } from "@/service/simulation/instruction/types";
import { SubjectFrame } from "@/service/subjects/types";
import * as THREE from "three";

export const serializeVector3 = (
  vector: THREE.Vector3
): { x: number; y: number; z: number } => {
  return { x: vector.x, y: vector.y, z: vector.z };
};

export const deserializeVector3 = (obj: {
  x: number;
  y: number;
  z: number;
}): THREE.Vector3 => {
  return new THREE.Vector3(obj.x, obj.y, obj.z);
};

export const serializeEuler = (
  euler: THREE.Euler
): { x: number; y: number; z: number; order: string } => {
  return { x: euler.x, y: euler.y, z: euler.z, order: euler.order };
};

export const deserializeEuler = (obj: {
  x: number;
  y: number;
  z: number;
  order: THREE.EulerOrder;
}): THREE.Euler => {
  return new THREE.Euler(obj.x, obj.y, obj.z, obj.order);
};

export const serializeCameraParams = (camera: CameraParameters | null) => {
  if (!camera) return null;

  return {
    ...camera,
    position: camera.position ? serializeVector3(camera.position) : undefined,
    rotation: camera.rotation ? serializeEuler(camera.rotation) : undefined,
  };
};

export const deserializeCameraParams = (
  camera: any
): CameraParameters | null => {
  if (!camera) return null;

  return {
    ...camera,
    position: camera.position ? deserializeVector3(camera.position) : undefined,
    rotation: camera.rotation ? deserializeEuler(camera.rotation) : undefined,
  };
};

export const serializeSubjectFrames = (frames: SubjectFrame[][]) => {
  if (!frames) return [];

  return frames.map((subjectFrames) =>
    subjectFrames.map((frame) => ({
      ...frame,
      position: frame.position ? serializeVector3(frame.position) : undefined,
      rotation: frame.rotation ? serializeEuler(frame.rotation) : undefined,
    }))
  );
};

export const deserializeSubjectFrames = (frames: any[][]): SubjectFrame[][] => {
  if (!frames) return [];

  return frames.map((subjectFrames) =>
    subjectFrames.map((frame) => ({
      ...frame,
      position: frame.position ? deserializeVector3(frame.position) : undefined,
      rotation: frame.rotation ? deserializeEuler(frame.rotation) : undefined,
    }))
  );
};
