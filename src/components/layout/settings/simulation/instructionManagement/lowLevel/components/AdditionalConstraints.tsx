import React, { FC } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  FormControlLabel,
  Switch,
  Stack,
  Slider,
  TextField,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  setStaticDistance,
  setStaticCameraSubjectRotation,
  setImportance,
  setFrameCount,
  setMaxAccelerate,
  setMaxSpeed,
} from "@/redux/slices/formSlice";

export const AdditionalConstraints: FC = () => {
  const dispatch = useAppDispatch();
  const { constraints, frameCount } = useAppSelector(
    (state) => state.form.currentInstruction
  );

  const staticDistance = constraints?.staticDistance;
  const staticCameraSubjectRotation = constraints?.staticCameraSubjectRotation;
  const importance = constraints?.importance || 1;
  const maxAccelerate = constraints?.maxAccelerate;
  const maxSpeed = constraints?.maxSpeed;

  return (
    <Accordion sx={{ my: 2 }}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="additional-constraints-content"
        id="additional-constraints-header"
      >
        <Typography variant="subtitle2">Additional Constraints</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <FormControlLabel
          control={
            <Switch
              checked={staticDistance || false}
              onChange={() => dispatch(setStaticDistance(!staticDistance))}
            />
          }
          label="Static Distance"
          sx={{ mb: 1, width: "100%" }}
        />

        <FormControlLabel
          control={
            <Switch
              checked={staticCameraSubjectRotation || false}
              onChange={(e) =>
                dispatch(setStaticCameraSubjectRotation(e.target.checked))
              }
            />
          }
          label="Static Camera-Subject Rotation"
          sx={{ mb: 1, width: "100%" }}
        />

        <Typography variant="body2" sx={{ mt: 2 }}>
          Importance
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Slider
            value={importance}
            onChange={(_, newValue) =>
              dispatch(setImportance(newValue as number))
            }
            step={1}
            min={1}
            max={10}
            sx={{ flexGrow: 1 }}
          />
          <Typography>{importance}</Typography>
        </Stack>

        <TextField
          type="number"
          label="Max Acceleration (m/s²)"
          value={maxAccelerate || ""}
          onChange={(e) => dispatch(setMaxAccelerate(Number(e.target.value)))}
          fullWidth
          sx={{ mb: 2 }}
          size="small"
          InputProps={{ inputProps: { min: 0, step: 0.1 } }}
          helperText="Maximum acceleration allowed (optional)"
        />

        <TextField
          type="number"
          label="Max Speed (m/s)"
          value={maxSpeed || ""}
          onChange={(e) => dispatch(setMaxSpeed(Number(e.target.value)))}
          fullWidth
          sx={{ mb: 2 }}
          size="small"
          InputProps={{ inputProps: { min: 0, step: 0.1 } }}
          helperText="Maximum speed allowed (optional)"
        />

        <TextField
          type="number"
          label="Frame Count"
          value={frameCount}
          onChange={(e) => dispatch(setFrameCount(Number(e.target.value)))}
          fullWidth
          sx={{ mb: 2 }}
          size="small"
          InputProps={{ inputProps: { min: 100, step: 100 } }}
          helperText="Number of frames for this instruction (minimum 100)"
        />
      </AccordionDetails>
    </Accordion>
  );
};

export default AdditionalConstraints;
