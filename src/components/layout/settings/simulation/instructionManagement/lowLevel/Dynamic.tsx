import React, { FC } from "react";
import {
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { MovementControl } from "./components/MovementControls";
import { EasingChart } from "../../../components/EasingChart";
import {
  MovementEasing,
  DynamicMode,
  InterpolationDynamic,
  MovementDynamic,
  Direction,
  MovementMode,
  Scale,
} from "@/service/simulation/instruction/types";
import { useInstructionForm } from "./useInstructionForm";
import SetupControls from "./components/SetupControls";

export interface DynamicProps {
  dynamic: InterpolationDynamic | MovementDynamic;
  setters: ReturnType<typeof useInstructionForm>["setters"];
}

export const Dynamic: FC<DynamicProps> = ({ dynamic, setters }) => {
  return (
    <>
      <MovementControl
        type={dynamic.easing}
        onTypeChange={setters.setDynamicEasing}
        options={Object.values(MovementEasing)}
        label="Movement Easing"
        allowEmpty={false}
        StartAdornmentComponent={EasingChart}
      />

      <ToggleButtonGroup
        value={dynamic?.type}
        exclusive
        onChange={(_, newValue) => setters.setDynamicType(newValue)}
        aria-label="movement type"
        fullWidth
        sx={{ mb: 1 }}
        color="primary"
      >
        <ToggleButton value={DynamicMode.Movement} aria-label="simple movement">
          Simple Movement
        </ToggleButton>
        <ToggleButton
          value={DynamicMode.Interpolation}
          aria-label="subject aware movement"
        >
          Subject Aware Movement
        </ToggleButton>
      </ToggleButtonGroup>

      {dynamic.type === DynamicMode.Movement && (
        <>
          <FormControl fullWidth sx={{ mb: 2 }} size="small">
            <InputLabel>Movement Direction</InputLabel>
            <Select
              value={dynamic.direction}
              onChange={(e) => {
                const newDynamic = {
                  ...dynamic,
                  direction: e.target.value as Direction,
                };
                setters.setDynamicType(DynamicMode.Movement);
              }}
              label="Movement Direction"
            >
              {Object.values(Direction).map((direction) => (
                <MenuItem key={direction} value={direction}>
                  {direction}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }} size="small">
            <InputLabel>Movement Mode</InputLabel>
            <Select
              value={dynamic.movementMode}
              onChange={(e) => {
                const newDynamic = {
                  ...dynamic,
                  movementMode: e.target.value as MovementMode,
                };
                setters.setDynamicType(DynamicMode.Movement);
              }}
              label="Movement Mode"
            >
              {Object.values(MovementMode).map((mode) => (
                <MenuItem key={mode} value={mode}>
                  {mode}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }} size="small">
            <InputLabel>Movement Scale</InputLabel>
            <Select
              value={dynamic.scale}
              onChange={(e) => {
                const newDynamic = {
                  ...dynamic,
                  scale: e.target.value as Scale,
                };
                setters.setDynamicType(DynamicMode.Movement);
              }}
              label="Movement Scale"
            >
              {Object.values(Scale).map((scale) => (
                <MenuItem key={scale} value={scale}>
                  {scale}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </>
      )}

      {dynamic.type === DynamicMode.Interpolation && (
        <SetupControls
          isInitial={false}
          cameraAngle={dynamic.endSetup?.cameraAngle}
          setCameraAngle={setters.setEndCameraAngle}
          shotSize={dynamic.endSetup?.shotSize}
          setShotSize={setters.setEndShotSize}
          subjectView={dynamic.endSetup?.subjectView}
          setSubjectView={setters.setEndSubjectView}
          subjectFraming={dynamic.endSetup?.subjectFraming}
          setSubjectFraming={setters.setEndSubjectFraming}
        />
      )}

      {dynamic.type === DynamicMode.Interpolation && (
        <FormControlLabel
          control={
            <Switch
              checked={dynamic.subjectAwareInterpolation || false}
              onChange={() =>
                dynamic.type === DynamicMode.Interpolation &&
                setters.setSubjectAwareInterpolation(
                  !dynamic.subjectAwareInterpolation
                )
              }
            />
          }
          label="Subject Aware Interpolation"
          sx={{ mb: 1, width: "100%" }}
        />
      )}
    </>
  );
};

export default Dynamic;
