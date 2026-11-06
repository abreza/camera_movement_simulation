import { HUMAN_DIMENSION_BOUNDS } from "@/service/subjects/constants";
import { generateDimensions } from "@/service/subjects/generateSubjects";
import { ObjectClass } from "@/service/subjects/types";
import { randomValue } from "@/utils/randomUtils";

/** Whole-object scale variation, in addition to each class's shape variation. */
export const DATASET_SUBJECT_SCALE_RANGE = { min: 0.75, max: 1.25 } as const;

export function generateDatasetSubjectDimensions(objectClass: ObjectClass) {
  const dimensions = generateDimensions(objectClass);
  let minimumScale: number = DATASET_SUBJECT_SCALE_RANGE.min;
  let maximumScale: number = DATASET_SUBJECT_SCALE_RANGE.max;

  if (objectClass === ObjectClass.Human) {
    // Scale all axes together to preserve proportions, restricting the scale
    // interval so standing adult proxies remain within their modelling bounds.
    const bounds = HUMAN_DIMENSION_BOUNDS;
    minimumScale = Math.max(
      minimumScale,
      bounds.width.min / dimensions.x,
      bounds.height.min / dimensions.y,
      bounds.depth.min / dimensions.z
    );
    maximumScale = Math.min(
      maximumScale,
      bounds.width.max / dimensions.x,
      bounds.height.max / dimensions.y,
      bounds.depth.max / dimensions.z
    );
  }

  return dimensions.multiplyScalar(
    minimumScale + randomValue() * (maximumScale - minimumScale)
  );
}
