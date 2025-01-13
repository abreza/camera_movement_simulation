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

interface AdditionalConstraintsProps {
  staticDistance?: boolean;
  setStaticDistance: (staticDistance?: boolean) => void;
  staticCameraSubjectRotation?: boolean;
  setStaticCameraSubjectRotation: (value?: boolean) => void;
  importance: number;
  setImportance: (value: number) => void;
  frameCount: number;
  setFrameCount: (count: number) => void;
  maxAccelerate?: number;
  setMaxAccelerate: (value: number) => void;
  maxSpeed?: number;
  setMaxSpeed: (value: number) => void;
}

export const AdditionalConstraints: FC<AdditionalConstraintsProps> = ({
  staticDistance,
  setStaticDistance,
  staticCameraSubjectRotation,
  setStaticCameraSubjectRotation,
  importance,
  setImportance,
  frameCount,
  setFrameCount,
  maxAccelerate,
  setMaxAccelerate,
  maxSpeed,
  setMaxSpeed,
}) => {
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
              onChange={() => setStaticDistance(!staticDistance)}
            />
          }
          label="Static Distance"
          sx={{ mb: 1, width: "100%" }}
        />

        <FormControlLabel
          control={
            <Switch
              checked={staticCameraSubjectRotation || false}
              onChange={(e) => setStaticCameraSubjectRotation(e.target.checked)}
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
            onChange={(_, newValue) => setImportance(newValue as number)}
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
          onChange={(e) => setMaxAccelerate(Number(e.target.value))}
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
          onChange={(e) => setMaxSpeed(Number(e.target.value))}
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
          onChange={(e) => setFrameCount(Number(e.target.value))}
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
