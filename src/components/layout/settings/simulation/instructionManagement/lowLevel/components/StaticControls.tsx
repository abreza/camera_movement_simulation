import React, { FC } from "react";
import {
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
} from "@mui/material";
import {
  LockedMovement,
  LockedRotation,
} from "@/service/simulation/instruction/types";

interface StaticControlsProps {
  lockedMovement: LockedMovement;
  setLockedPosition: (value: LockedMovement) => void;
  lockedRotation: LockedRotation;
  setLockedRotation: (value: LockedRotation) => void;
}

export const StaticControls: FC<StaticControlsProps> = ({
  lockedMovement,
  setLockedPosition,
  lockedRotation,
  setLockedRotation,
}) => {
  const handleStaticPositionChange = (key: keyof LockedMovement) => {
    setLockedPosition({
      ...lockedMovement,
      [key]: !lockedMovement[key],
    });
  };

  const handleStaticRotationChange = (key: keyof LockedRotation) => {
    setLockedRotation({
      ...lockedRotation,
      [key]: !lockedRotation[key],
    });
  };

  return (
    <>
      <Typography variant="body2" sx={{ mt: 2 }}>
        Locked Movement
      </Typography>
      <FormGroup row>
        {Object.keys(lockedMovement).map((posKey) => (
          <FormControlLabel
            key={posKey}
            control={
              <Checkbox
                checked={lockedMovement[posKey as keyof LockedMovement]}
                onChange={() =>
                  handleStaticPositionChange(posKey as keyof LockedMovement)
                }
              />
            }
            label={posKey}
            sx={{ mr: 2 }}
          />
        ))}
      </FormGroup>

      <Typography variant="body2" sx={{ mt: 2 }}>
        Locked Rotation
      </Typography>
      <FormGroup row>
        {Object.keys(lockedRotation).map((rotKey) => (
          <FormControlLabel
            key={rotKey}
            control={
              <Checkbox
                checked={lockedRotation[rotKey as keyof LockedRotation]}
                onChange={() =>
                  handleStaticRotationChange(rotKey as keyof LockedRotation)
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
