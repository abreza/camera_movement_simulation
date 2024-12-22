export enum ObjectClass {
  Chair = "chair",
  Table = "table",
  Laptop = "laptop",
  Book = "book",
  Tree = "tree",
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
};
