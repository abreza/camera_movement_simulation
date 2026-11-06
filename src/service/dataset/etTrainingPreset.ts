import calibration from "./profiles/et_training_20261004_model30.json";
import {
  normalizeETTrainingProfile,
  type ETTrainingCalibration,
} from "./etTrainingProfile";

// This immutable aggregate comes from ET training media, with independent
// training-media validation. It contains no native trajectory templates.
export const ET_TRAINING_PRESET = normalizeETTrainingProfile({
  calibration: calibration as ETTrainingCalibration,
  useCenteredPrincipalPointFovProxy: true,
});
