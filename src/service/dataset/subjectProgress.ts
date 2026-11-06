import { Euler, Quaternion } from "three";
import type { SubjectFrame } from "@/service/subjects/types";

export const DATASET_SUBJECT_PATH_FRACTIONS = [1, 0.75, 0.5, 0.25, 0.125] as const;

/**
 * Preserve a contiguous segment of the authored procedural motion and its body
 * headings. Resampling changes its extent/speed over the same clip duration;
 * it never replaces the motion with a different curve or recomputes headings.
 */
export function windowDatasetSubjectFrames(
  frames: readonly SubjectFrame[], start: number, fraction: number
): SubjectFrame[] {
  if (!Number.isFinite(start) || !Number.isFinite(fraction) || start < 0 ||
      fraction <= 0 || fraction > 1 || start + fraction > 1 + 1e-12) {
    throw new RangeError("Subject path window requires 0 <= start, 0 < fraction <= 1 and start + fraction <= 1.");
  }
  if (!frames.length) return [];
  if (frames.some((frame) => frame.rotation.order !== "XYZ")) {
    throw new RangeError("Dataset subject path windows require XYZ body rotations.");
  }
  if (start === 0 && fraction === 1 || frames.length === 1) {
    return frames.map((frame) => ({ position: frame.position.clone(), rotation: frame.rotation.clone() }));
  }
  const lastIndex = frames.length - 1;
  return Array.from({ length: frames.length }, (_, index) => {
    const progress = lastIndex ? index / lastIndex : 0;
    const sourceIndex = Math.min(lastIndex, (start + progress * fraction) * lastIndex);
    const lowerIndex = Math.floor(sourceIndex);
    const upperIndex = Math.min(lastIndex, lowerIndex + 1);
    const blend = sourceIndex - lowerIndex;
    const lower = frames[lowerIndex], upper = frames[upperIndex];
    return {
      position: lower.position.clone().lerp(upper.position, blend),
      rotation: new Euler().setFromQuaternion(
        new Quaternion().setFromEuler(lower.rotation).slerp(
          new Quaternion().setFromEuler(upper.rotation), blend
        ), "XYZ"
      ),
    };
  });
}
