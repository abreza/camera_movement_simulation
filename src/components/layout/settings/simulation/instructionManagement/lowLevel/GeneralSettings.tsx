import React, { FC } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Switch,
  FormControlLabel,
  FormGroup,
  Typography,
} from "@mui/material";
import {
  CameraSubjectDistance,
  MovementEasing,
  Scale,
} from "@/service/simulation/instruction/types";
import { SubjectInfo } from "@/service/subjects/types";
import { MovementControl } from "./MovementControls";
import { EasingChart } from "./EasingChart";

interface GeneralSettingsProps {
  frameCount: number;
  setFrameCount: (count: number) => void;
  movementEasing: MovementEasing;
  setMovementEasing: (easing: MovementEasing) => void;
  subjectAwareInterpolation?: boolean;
  setSubjectAwareInterpolation: (subjectAwareInterpolation?: boolean) => void;
  selectedSubjectIndex?: number;
  setSelectedSubjectIndex: (index?: number) => void;
  allFramesVisibility?: boolean;
  setAllFramesVisibility: (enabled: boolean) => void;
  subjectsInfo: SubjectInfo[];
  distanceType: CameraSubjectDistance | undefined;
  setDistanceType: (type: CameraSubjectDistance | undefined) => void;
  distanceScale: Scale | undefined;
  setDistanceScale: (scale: Scale | undefined) => void;
}

export const GeneralSettings: FC<GeneralSettingsProps> = ({
  frameCount,
  setFrameCount,
  movementEasing,
  setMovementEasing,
  selectedSubjectIndex,
  setSelectedSubjectIndex,
  allFramesVisibility,
  setAllFramesVisibility,
  subjectsInfo,
  distanceType,
  setDistanceType,
  distanceScale,
  setDistanceScale,
  subjectAwareInterpolation,
  setSubjectAwareInterpolation,
}) => (
  <>
    <FormControlLabel
      control={
        <Switch
          checked={allFramesVisibility || false}
          onChange={(e) => setAllFramesVisibility(e.target.checked)}
        />
      }
      label="Subject visible at all times"
      sx={{ mb: 1, width: "100%" }}
    />

    <FormControlLabel
      control={
        <Switch
          checked={subjectAwareInterpolation}
          onChange={() =>
            setSubjectAwareInterpolation(!subjectAwareInterpolation)
          }
        />
      }
      label={"Subject Aware Interpolation"}
      sx={{ mb: 1, width: "100%" }}
    />

    <MovementControl
      type={distanceType}
      scale={distanceScale}
      onTypeChange={setDistanceType}
      onScaleChange={setDistanceScale}
      options={Object.values(CameraSubjectDistance)}
      label="Distance Constraint"
      allowEmpty={true}
    />

    <MovementControl
      type={movementEasing}
      onTypeChange={setMovementEasing}
      options={Object.values(MovementEasing)}
      label="Movement Easing"
      allowEmpty={false}
      StartAdornmentComponent={EasingChart}
    />

    <FormControl fullWidth sx={{ mb: 2 }} size="small">
      <InputLabel>Target Subject</InputLabel>
      <Select
        value={selectedSubjectIndex}
        onChange={(e) =>
          setSelectedSubjectIndex(
            e.target.value === "undefined" ? undefined : +e.target.value
          )
        }
        label="Target Subject"
      >
        <MenuItem value="undefined">No subject</MenuItem>
        {subjectsInfo.map((_, index) => (
          <MenuItem key={index} value={index}>{`Subject ${
            index + 1
          }`}</MenuItem>
        ))}
      </Select>
    </FormControl>

    <TextField
      type="number"
      label="Frame Count"
      value={frameCount}
      onChange={(e) => setFrameCount(Number(e.target.value))}
      fullWidth
      sx={{ mb: 2 }}
      size="small"
      InputProps={{ inputProps: { min: 100, step: 100 } }}
      helperText="Number of frames for this instruction (minimum 100)"
    />
  </>
);
