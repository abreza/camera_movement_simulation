import React, { FC } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from "@mui/material";
import {
  CameraTranslationMovement,
  CameraRotationMovement,
  CameraZoomMovement,
  Scale,
} from "@/service/simulation/instruction/types";

interface MovementControlProps {
  type: string | undefined;
  scale?: Scale;
  onTypeChange: (value: any) => void;
  onScaleChange?: (value: Scale | undefined) => void;
  options: any[];
  label: string;
  allowEmpty?: boolean;
}

export const MovementControl: FC<MovementControlProps> = ({
  type,
  scale,
  onTypeChange,
  onScaleChange,
  options,
  label,
  allowEmpty = true,
}) => (
  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
    <FormControl fullWidth size="small">
      <InputLabel>{label}</InputLabel>
      <Select
        value={type ?? ""}
        onChange={(e) => onTypeChange(e.target.value || undefined)}
        label={label}
      >
        {allowEmpty && (
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
        )}
        {options.map((option) => (
          <MenuItem key={option} value={option}>
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

interface MovementControlsProps {
  translationType: CameraTranslationMovement | undefined;
  setTranslationType: (type: CameraTranslationMovement | undefined) => void;
  translationScale: Scale | undefined;
  setTranslationScale: (scale: Scale | undefined) => void;
  rotationType: CameraRotationMovement | undefined;
  setRotationType: (type: CameraRotationMovement | undefined) => void;
  rotationScale: Scale | undefined;
  setRotationScale: (scale: Scale | undefined) => void;
  zoomType: CameraZoomMovement | undefined;
  setZoomType: (type: CameraZoomMovement | undefined) => void;
  zoomScale: Scale | undefined;
  setZoomScale: (scale: Scale | undefined) => void;
}

export const MovementControls: FC<MovementControlsProps> = ({
  translationType,
  setTranslationType,
  translationScale,
  setTranslationScale,
  rotationType,
  setRotationType,
  rotationScale,
  setRotationScale,
  zoomType,
  setZoomType,
  zoomScale,
  setZoomScale,
}) => (
  <>
    <MovementControl
      type={translationType}
      scale={translationScale}
      onTypeChange={setTranslationType}
      onScaleChange={setTranslationScale}
      options={Object.values(CameraTranslationMovement)}
      label="Translation Movement"
      allowEmpty={true}
    />
    <MovementControl
      type={rotationType}
      scale={rotationScale}
      onTypeChange={setRotationType}
      onScaleChange={setRotationScale}
      options={Object.values(CameraRotationMovement)}
      label="Rotation Movement"
      allowEmpty={true}
    />
    <MovementControl
      type={zoomType}
      scale={zoomScale}
      onTypeChange={setZoomType}
      onScaleChange={setZoomScale}
      options={Object.values(CameraZoomMovement)}
      label="Zoom Movement"
      allowEmpty={true}
    />
  </>
);

export default MovementControls;
