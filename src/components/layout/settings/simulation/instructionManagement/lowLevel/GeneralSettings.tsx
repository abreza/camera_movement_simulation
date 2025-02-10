import React, { FC } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { StaticControls } from "./components/StaticControls";
import { AdditionalConstraints } from "./components/AdditionalConstraints";
import { SimulationInstruction } from "@/service/simulation/instruction/types";
import { useInstructionForm } from "@/hooks/useInstructionForm";
import { SubjectInfo } from "@/service/subjects/types";
import { defaultSimulationInstruction } from "@/service/simulation/instruction/constants";

export interface GeneralSettingsProps {
  instruction: SimulationInstruction;
  setters: ReturnType<typeof useInstructionForm>["setters"];
  subjectsInfo: SubjectInfo[];
  isSimpleMovement?: boolean;
}

export const GeneralSettings: FC<GeneralSettingsProps> = ({
  instruction,
  setters,
  subjectsInfo,
  isSimpleMovement = false,
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

      <FormControl fullWidth sx={{ mb: 2 }} size="small">
        <InputLabel>Target Subject</InputLabel>
        <Select
          value={
            typeof instruction.subjectIndex === "number"
              ? instruction.subjectIndex
              : "undefined"
          }
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
      {!isSimpleMovement && (
        <>
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
            setStaticCameraSubjectRotation={
              setters.setStaticCameraSubjectRotation
            }
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
      )}
    </>
  );
};
