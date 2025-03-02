import React, { FC, useEffect } from "react";
import {
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  Box,
} from "@mui/material";
import { MovementControl } from "./components/MovementControls";
import { EasingChart } from "../../../components/EasingChart";
import {
  MovementEasing,
  DynamicMode,
  InterpolationDynamic,
  SimpleMovement,
  Direction,
  MovementMode,
  Scale,
} from "@/service/simulation/instruction/types";
import { useInstructionForm } from "@/hooks/useInstructionForm";
import SetupControls from "./components/SetupControls";

export interface DynamicProps {
  dynamic: InterpolationDynamic | SimpleMovement;
  setters: ReturnType<typeof useInstructionForm>["setters"];
}

export const Dynamic: FC<DynamicProps> = ({ dynamic, setters }) => {
  useEffect(() => {
    if (dynamic.type === DynamicMode.Simple) {
      if (!dynamic.direction) {
        setters.setDynamic({
          ...dynamic,
          direction: Direction.Right,
          movementMode: MovementMode.Transition,
          scale: Scale.Medium,
        });
      }
    } else if (dynamic.type === DynamicMode.Interpolation) {
      if (!dynamic.endSetup) {
        setters.setDynamic({
          ...dynamic,
          endSetup: {},
          subjectAwareInterpolation: false,
        });
      }
    }
  }, [dynamic.type]);

  const handleDynamicTypeChange = (
    _: React.MouseEvent<HTMLElement>,
    newValue: DynamicMode | null
  ) => {
    if (newValue === null) return;

    if (newValue === DynamicMode.Simple) {
      setters.setDynamicType(DynamicMode.Simple);
      setters.setDynamic({
        type: DynamicMode.Simple,
        easing: dynamic.easing,
        direction: Direction.Right,
        movementMode: MovementMode.Transition,
        scale: Scale.Medium,
      });
    } else {
      setters.setDynamicType(DynamicMode.Interpolation);
      setters.setDynamic({
        type: DynamicMode.Interpolation,
        easing: dynamic.easing,
        endSetup: {},
        subjectAwareInterpolation: false,
      });
    }
  };

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Movement Properties
      </Typography>

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
        onChange={handleDynamicTypeChange}
        aria-label="movement type"
        fullWidth
        sx={{ mb: 2 }}
        color="primary"
      >
        <ToggleButton value={DynamicMode.Simple} aria-label="simple movement">
          Simple Movement
        </ToggleButton>
        <ToggleButton
          value={DynamicMode.Interpolation}
          aria-label="subject aware movement"
        >
          Subject Aware Movement
        </ToggleButton>
      </ToggleButtonGroup>

      {dynamic.type === DynamicMode.Simple && (
        <>
          <FormControl fullWidth sx={{ mb: 2 }} size="small">
            <InputLabel>Movement Direction</InputLabel>
            <Select
              value={dynamic.direction || Direction.Right}
              onChange={(e) =>
                setters.setDynamic({
                  ...dynamic,
                  direction: e.target.value as Direction,
                })
              }
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
              value={dynamic.movementMode || MovementMode.Transition}
              onChange={(e) =>
                setters.setDynamic({
                  ...dynamic,
                  movementMode: e.target.value as MovementMode,
                })
              }
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
              value={dynamic.scale || Scale.Medium}
              onChange={(e) =>
                setters.setDynamic({
                  ...dynamic,
                  scale: e.target.value as Scale,
                })
              }
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
        <>
          <Typography variant="subtitle2" gutterBottom>
            End Camera Setup
          </Typography>
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

          <FormControlLabel
            control={
              <Switch
                checked={dynamic.subjectAwareInterpolation || false}
                onChange={() =>
                  setters.setSubjectAwareInterpolation(
                    !dynamic.subjectAwareInterpolation
                  )
                }
              />
            }
            label="Subject Aware Interpolation"
            sx={{ mb: 1, width: "100%" }}
          />
        </>
      )}
    </Box>
  );
};

export default Dynamic;
