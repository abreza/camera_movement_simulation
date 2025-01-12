import React, { FC } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { MovementControl } from "./MovementControls";
import { EasingChart } from "../../../components/EasingChart";
import { StaticControls } from "./StaticControls";
import { AdditionalConstraints } from "./AdditionalConstraints";
import {
  MovementEasing,
  SimulationInstruction,
} from "@/service/simulation/instruction/types";
import { useInstructionForm } from "./useInstructionForm";
import { SubjectInfo } from "@/service/subjects/types";
import { defaultSimulationInstruction } from "@/service/simulation/instruction/constants";

export interface GeneralSettingsProps {
  instruction: SimulationInstruction;
  setters: ReturnType<typeof useInstructionForm>["setters"];
  subjectsInfo: SubjectInfo[];
}

export const GeneralSettings: FC<GeneralSettingsProps> = ({
  instruction,
  setters,
  subjectsInfo,
}) => {
  return (
    <>
      <FormControlLabel
        control={
          <Switch
            checked={instruction.constraints?.allFramesVisibility || false}
            onChange={(e) => setters.setAllFramesVisibility(e.target.checked)}
          />
        }
        label="Subject visible at all times"
        sx={{ mb: 1, width: "100%" }}
      />

      <FormControlLabel
        control={
          <Switch
            checked={instruction.subjectAwareInterpolation || false}
            onChange={() =>
              setters.setSubjectAwareInterpolation(
                !instruction.subjectAwareInterpolation
              )
            }
          />
        }
        label="Subject Aware Interpolation"
        sx={{ mb: 1, width: "100%" }}
      />

      <MovementControl
        type={instruction.movementEasing}
        onTypeChange={setters.setMovementEasing}
        options={Object.values(MovementEasing)}
        label="Movement Easing"
        allowEmpty={false}
        StartAdornmentComponent={EasingChart}
      />

      <FormControl fullWidth sx={{ mb: 2 }} size="small">
        <InputLabel>Target Subject</InputLabel>
        <Select
          value={instruction.subjectIndex}
          onChange={(e) =>
            setters.setSubjectIndex(
              e.target.value === "undefined" ? undefined : +e.target.value
            )
          }
          label="Target Subject"
        >
          <MenuItem value="undefined">No subject</MenuItem>
          {subjectsInfo.map((_, index) => (
            <MenuItem key={index} value={index}>
              {`Subject ${index + 1}`}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <StaticControls
        lockedMovement={
          instruction.constraints?.lockedMovement ||
          defaultSimulationInstruction.constraints!.lockedMovement!
        }
        setLockedPosition={setters.setLockedPosition}
        lockedRotation={
          instruction.constraints?.lockedRotation ||
          defaultSimulationInstruction.constraints!.lockedRotation!
        }
        setLockedRotation={setters.setLockedRotation}
      />

      <AdditionalConstraints
        staticDistance={instruction.constraints?.staticDistance}
        setStaticDistance={setters.setStaticDistance}
        staticCameraSubjectRotation={
          instruction.constraints?.staticCameraSubjectRotation
        }
        setStaticCameraSubjectRotation={setters.setStaticCameraSubjectRotation}
        importance={instruction.constraints?.importance || 1}
        setImportance={setters.setImportance}
        frameCount={instruction.frameCount}
        setFrameCount={setters.setFrameCount}
        maxAccelerate={instruction.constraints?.maxAccelerate}
        setMaxAccelerate={setters.setMaxAccelerate}
        maxSpeed={instruction.constraints?.maxSpeed}
        setMaxSpeed={setters.setMaxSpeed}
      />
    </>
  );
};
