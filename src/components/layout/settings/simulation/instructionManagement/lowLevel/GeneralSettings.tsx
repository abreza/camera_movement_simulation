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
import { DynamicMode } from "@/service/simulation/instruction/types";
import { useAppSelector, useAppDispatch } from "@/redux/hooks";
import {
  setAllFramesVisibility,
  setSubjectIndex,
} from "@/redux/slices/formSlice";

export const GeneralSettings: FC = () => {
  const dispatch = useAppDispatch();
  const subjectsInfo = useAppSelector((state) => state.subjects.subjectsInfo);
  const instruction = useAppSelector((state) => state.form.currentInstruction);
  const isSimpleMovement = instruction.dynamic.type === DynamicMode.Simple;

  return (
    <>
      <FormControlLabel
        control={
          <Switch
            checked={instruction.constraints?.allFramesVisibility || false}
            onChange={(e) => dispatch(setAllFramesVisibility(e.target.checked))}
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
            dispatch(
              setSubjectIndex(
                e.target.value === "undefined" ? undefined : +e.target.value
              )
            )
          }
          label="Target Subject"
        >
          <MenuItem value="undefined">No subject</MenuItem>
          {subjectsInfo.map(({ subject }, index) => (
            <MenuItem key={subject.id} value={index}>
              {subject.id}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {!isSimpleMovement && (
        <>
          <StaticControls />
          <AdditionalConstraints />
        </>
      )}
    </>
  );
};

export default GeneralSettings;
