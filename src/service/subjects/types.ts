import * as THREE from "three";

export enum ObjectClass {
  Chair = "chair",
  Table = "table",
  Laptop = "laptop",
  Book = "book",
  Tree = "tree",
  Building = "building",
  Car = "car",
  Bicycle = "bicycle",
}

export type SubjectDimensions = {
  width: number;
  height: number;
  depth: number;
};

export type Subject = {
  id: string;
  class: ObjectClass;
  dimensions: SubjectDimensions;
  attentionBox?: {
    dimensions: SubjectDimensions;
    position: THREE.Vector3;
  };
};

export type SubjectFrame = {
  position: THREE.Vector3;
  rotation: THREE.Euler;
};

export type SubjectInfo = {
  subject: Subject;
  frames?: SubjectFrame[];
};

export type SubjectFrameInfo = {
  subject: Subject;
  frame?: SubjectFrame;
};
