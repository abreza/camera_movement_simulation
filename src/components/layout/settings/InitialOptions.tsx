import React, { FC } from "react";
import { Button, Stack } from "@mui/material";

interface InitialOptionsProps {
  onGenerateRandomDataset: () => void;
  onRenderSimulation: () => void;
}

export const InitialOptions: FC<InitialOptionsProps> = ({
  onGenerateRandomDataset,
  onRenderSimulation,
}) => {
  return (
    <Stack spacing={2} alignItems="center">
      <Button variant="contained" onClick={onGenerateRandomDataset} fullWidth>
        Generate Random Dataset
      </Button>
      <Button variant="contained" onClick={onRenderSimulation} fullWidth>
        Render a Simulation
      </Button>
    </Stack>
  );
};
