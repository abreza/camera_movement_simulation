import React, { FC, useEffect, useRef } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
} from "@mui/material";
import { Transition } from "./Transition";
import { SimulationSteps } from "./simulation/SimulationSteps";
import { GeneratorOptions } from "./dataset/GeneratorOptions";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  setSelectedView,
  setSimulationStepIndex,
} from "@/redux/slices/uiSlice";
import { importCameraFrames } from "@/redux/slices/cameraSlice";

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

export const Settings: FC<SettingsProps> = ({ open, onClose }) => {
  const dispatch = useAppDispatch();
  const { simulationStepIndex, selectedView } = useAppSelector(
    (state) => state.ui
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (simulationStepIndex === -1) {
      dispatch(setSelectedView("none"));
    }
  }, [simulationStepIndex, dispatch]);

  const handleGenerateRandomDataset = () => {
    dispatch(setSelectedView("generator"));
  };

  const handleRenderSimulation = () => {
    dispatch(setSelectedView("simulation"));
    dispatch(setSimulationStepIndex(0));
  };

  const handleImportFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          dispatch(importCameraFrames(data));
          onClose();
        } catch (error) {
          console.error("Error parsing JSON file:", error);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <Dialog
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={onClose}
      PaperProps={{
        style: {
          position: "fixed",
          left: 20,
          margin: 0,
        },
      }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Cinematic Camera Movement</DialogTitle>
      <DialogContent>
        {selectedView === "none" && (
          <Stack spacing={2} alignItems="center">
            <Button
              variant="contained"
              onClick={handleGenerateRandomDataset}
              fullWidth
            >
              Generate Random Dataset
            </Button>
            <Button
              variant="contained"
              onClick={handleRenderSimulation}
              fullWidth
            >
              Render a Simulation
            </Button>
            <Button variant="contained" onClick={handleImportFile} fullWidth>
              Import from File
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
              accept=".json"
            />
          </Stack>
        )}
        {selectedView === "generator" && (
          <GeneratorOptions
            onClose={() => dispatch(setSimulationStepIndex(-1))}
          />
        )}
        {selectedView === "simulation" && <SimulationSteps />}
      </DialogContent>
    </Dialog>
  );
};
