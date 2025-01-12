import React, { FC } from "react";
import {
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
} from "@mui/material";
import {
  StaticPosition,
  StaticRotation,
} from "@/service/simulation/instruction/types";

interface StaticControlsProps {
  staticPosition: StaticPosition;
  setStaticPosition: (value: StaticPosition) => void;
  staticRotation: StaticRotation;
  setStaticRotation: (value: StaticRotation) => void;
}

export const StaticControls: FC<StaticControlsProps> = ({
  staticPosition,
  setStaticPosition,
  staticRotation,
  setStaticRotation,
}) => {
  const handleStaticPositionChange = (key: keyof StaticPosition) => {
    setStaticPosition({
      ...staticPosition,
      [key]: !staticPosition[key],
    });
  };

  const handleStaticRotationChange = (key: keyof StaticRotation) => {
    setStaticRotation({
      ...staticRotation,
      [key]: !staticRotation[key],
    });
  };

  return (
    <>
      <Typography variant="body2" sx={{ mt: 2 }}>
        Static Position
      </Typography>
      <FormGroup row>
        {Object.keys(staticPosition).map((posKey) => (
          <FormControlLabel
            key={posKey}
            control={
              <Checkbox
                checked={staticPosition[posKey as keyof StaticPosition]}
                onChange={() =>
                  handleStaticPositionChange(posKey as keyof StaticPosition)
                }
              />
            }
            label={posKey}
            sx={{ mr: 2 }}
          />
        ))}
      </FormGroup>

      <Typography variant="body2" sx={{ mt: 2 }}>
        Static Rotation
      </Typography>
      <FormGroup row>
        {Object.keys(staticRotation).map((rotKey) => (
          <FormControlLabel
            key={rotKey}
            control={
              <Checkbox
                checked={staticRotation[rotKey as keyof StaticRotation]}
                onChange={() =>
                  handleStaticRotationChange(rotKey as keyof StaticRotation)
                }
              />
            }
            label={rotKey}
            sx={{ mr: 2 }}
          />
        ))}
      </FormGroup>
    </>
  );
};
