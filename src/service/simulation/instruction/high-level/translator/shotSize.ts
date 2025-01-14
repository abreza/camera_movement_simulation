import { ShotSize } from "@/service/simulation/instruction/types";
import { getShotSizeIndex, SHOT_SIZE_ORDER } from "../../constants";

export function getCloserShotSize(currentShot: ShotSize): ShotSize {
  const index = getShotSizeIndex(currentShot);
  if (index <= 0) return currentShot;
  return SHOT_SIZE_ORDER[index - 1];
}

export function getFartherShotSize(currentShot: ShotSize): ShotSize {
  const index = getShotSizeIndex(currentShot);
  if (index < 0 || index >= SHOT_SIZE_ORDER.length - 1) return currentShot;
  return SHOT_SIZE_ORDER[index + 1];
}
