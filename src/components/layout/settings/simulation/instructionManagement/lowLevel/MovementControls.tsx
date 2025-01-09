import React, { FC } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from "@mui/material";
import { Scale } from "@/service/simulation/instruction/types";

interface MovementControlProps {
  type: string | undefined;
  scale?: Scale;
  onTypeChange: (value: any) => void;
  onScaleChange?: (value: Scale | undefined) => void;
  options: any[];
  label: string;
  allowEmpty?: boolean;
  StartAdornmentComponent?: FC<any>;
}

export const MovementControl: FC<MovementControlProps> = ({
  type,
  scale,
  onTypeChange,
  onScaleChange,
  options,
  label,
  allowEmpty = true,
  StartAdornmentComponent,
}) => (
  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
    <FormControl fullWidth size="small">
      <InputLabel>{label}</InputLabel>
      <Select
        value={type ?? ""}
        onChange={(e) => onTypeChange(e.target.value || undefined)}
        label={label}
        startAdornment={
          StartAdornmentComponent && <StartAdornmentComponent easing={type} />
        }
        renderValue={(value) => value}
      >
        {allowEmpty && (
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
        )}
        {options.map((option) => (
          <MenuItem key={option} value={option}>
            {StartAdornmentComponent && (
              <StartAdornmentComponent easing={option} />
            )}
            {option}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
    {type && type !== "" && onScaleChange && (
      <FormControl fullWidth size="small">
        <InputLabel>{`${label} Scale`}</InputLabel>
        <Select
          value={scale ?? ""}
          onChange={(e) =>
            onScaleChange((e.target.value as Scale) || undefined)
          }
          label={`${label} Scale`}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {Object.values(Scale).map((scaleOption) => (
            <MenuItem key={scaleOption} value={scaleOption}>
              {scaleOption}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    )}
  </Stack>
);
