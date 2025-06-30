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
  Direction,
  MovementMode,
  Scale,
} from "@/service/simulation/instruction/types";
import SetupControls from "./components/SetupControls";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  setDynamicType,
  setDynamic,
  setDynamicEasing,
  setSubjectAwareInterpolation,
} from "@/redux/slices/formSlice";

export const Dynamic: FC = () => {
  const dispatch = useAppDispatch();
  const dynamic = useAppSelector(
    (state) => state.form.currentInstruction.dynamic
  );

  useEffect(() => {
    if (dynamic.type === DynamicMode.Simple) {
      if (!dynamic.direction) {
        dispatch(
          setDynamic({
            ...dynamic,
            direction: Direction.Right,
            movementMode: MovementMode.Transition,
            scale: Scale.Medium,
          })
        );
      }
    } else if (dynamic.type === DynamicMode.Interpolation) {
      if (!dynamic.complementSetup) {
        dispatch(
          setDynamic({
            ...dynamic,
            complementSetup: {},
            subjectAwareInterpolation: false,
          })
        );
      }
    }
  }, [dynamic.type, dispatch]);

  const handleDynamicTypeChange = (
    _: React.MouseEvent<HTMLElement>,
    newValue: DynamicMode | null
  ) => {
    if (newValue === null) return;
    dispatch(setDynamicType(newValue));
  };

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Movement Properties
      </Typography>

      <MovementControl
        type={dynamic.easing}
        onTypeChange={(value) => dispatch(setDynamicEasing(value))}
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
                dispatch(
                  setDynamic({
                    ...dynamic,
                    direction: e.target.value as Direction,
                  })
                )
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
                dispatch(
                  setDynamic({
                    ...dynamic,
                    movementMode: e.target.value as MovementMode,
                  })
                )
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
                dispatch(
                  setDynamic({
                    ...dynamic,
                    scale: e.target.value as Scale,
                  })
                )
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
          <SetupControls isInitial={false} />

          <FormControlLabel
            control={
              <Switch
                checked={dynamic.subjectAwareInterpolation || false}
                onChange={() =>
                  dispatch(
                    setSubjectAwareInterpolation(
                      !dynamic.subjectAwareInterpolation
                    )
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
