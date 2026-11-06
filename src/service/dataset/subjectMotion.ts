import { ObjectClass } from "../subjects/types";
import { HUMAN_MOVEMENT_TYPES } from "../subjects/movements";

export const DATASET_MOVEMENT_TYPES = [
  "linear", "circular", "spiral", "figureEight", "wave", "zigzag", "static",
  ...HUMAN_MOVEMENT_TYPES,
] as const;

export type DatasetMovementType = (typeof DATASET_MOVEMENT_TYPES)[number];

export const DEFAULT_DATASET_SUBJECT_CLASS_PROBABILITIES: Record<ObjectClass, number> = {
  [ObjectClass.Chair]: 1,
  [ObjectClass.Table]: 0.7,
  [ObjectClass.Laptop]: 0.3,
  [ObjectClass.Book]: 0.3,
  [ObjectClass.Tree]: 0.5,
  [ObjectClass.Car]: 1,
  [ObjectClass.Bicycle]: 1,
  [ObjectClass.Human]: 8,
};

/** Static receives half of the samples; all other motions share the rest equally. */
export const DEFAULT_DATASET_MOVEMENT_DISTRIBUTION: Record<DatasetMovementType, number> =
  Object.fromEntries(
    DATASET_MOVEMENT_TYPES.map((type) => [
      type,
      type === "static" ? DATASET_MOVEMENT_TYPES.length - 1 : 1,
    ])
  ) as Record<DatasetMovementType, number>;
