import React, { FC, useEffect, useRef, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  Alert,
  Collapse,
  Box,
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
import {
  processInputData,
  generateAndDownloadFile,
} from "@/service/translate-file";

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

export const Settings: FC<SettingsProps> = ({ open, onClose }) => {
  const dispatch = useAppDispatch();
  const { simulationStepIndex, selectedView } = useAppSelector(
    (state) => state.ui
  );

  const [importError, setImportError] = useState<string | null>(null);

  const inferenceFileInputRef = useRef<HTMLInputElement>(null);
  const translateFileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImportInferenceFile = () => {
    inferenceFileInputRef.current?.click();
  };

  const handleTranslateFile = () => {
    translateFileInputRef.current?.click();
  };

  const handleInferenceFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);

          if (data.trajectories && data.batch_data) {
            dispatch(importCameraFrames(data));
            setImportError(null);
            onClose();
          } else {
            throw new Error(
              "Invalid inference file format. Expected 'trajectories' and 'batch_data' fields."
            );
          }
        } catch (error) {
          console.error("Error parsing inference file:", error);
          setImportError(
            (error as Error).message || "Error parsing inference file"
          );
        }
      };
      reader.readAsText(file);
    }

    event.target.value = "";
  };

  const handleTranslateFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);

          if (
            Array.isArray(data) &&
            data.every((item) => item.custom_id && item.response)
          ) {
            const processedData = processInputData(data);
            generateAndDownloadFile(processedData);
            setImportError(null);
          } else {
            throw new Error("Invalid translate file format");
          }
        } catch (error) {
          console.error("Error processing translate file:", error);
          setImportError(
            (error as Error).message || "Error processing translate file"
          );
        }
      };
      reader.readAsText(file);
    }

    event.target.value = "";
  };

  return (
    <>
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
          <Collapse in={!!importError}>
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setImportError(null)}
            >
              {importError}
            </Alert>
          </Collapse>

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
              <Button
                variant="contained"
                onClick={handleImportInferenceFile}
                fullWidth
                color="primary"
              >
                Import Inference File
              </Button>
              <Box sx={{ border: "1px solid #ccc", p: 2 }}>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleTranslateFile}
                  fullWidth
                >
                  Process Translate File
                </Button>
                <Typography variant="caption" color="text.secondary">
                  Upload a JSON file to translate cinematography prompts and
                  download the results
                </Typography>
              </Box>
              <input
                type="file"
                ref={inferenceFileInputRef}
                style={{ display: "none" }}
                onChange={handleInferenceFileChange}
                accept=".json"
              />
              <input
                type="file"
                ref={translateFileInputRef}
                style={{ display: "none" }}
                onChange={handleTranslateFileChange}
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
    </>
  );
};
