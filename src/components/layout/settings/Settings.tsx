import React, { FC, useEffect, useState, useRef } from "react";
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
import {
  CameraParameters,
  SimulationInstruction,
} from "@/service/simulation/instruction/types";
import { ObjectClass, SubjectInfo } from "@/service/subjects/types";
import {
  GenerateDatasetConfig,
  generateRandomDataset,
} from "@/service/dataset/generate";

interface SettingsProps {
  open: boolean;
  subjectsInfo: SubjectInfo[];
  instructions: SimulationInstruction[];
  onClose: () => void;
  onAddInstruction: (instruction: SimulationInstruction) => void;
  onEditInstruction: (
    index: number,
    instruction: SimulationInstruction
  ) => void;
  onDeleteInstruction: (index: number) => void;
  onGenerateSubjects: (
    count: number,
    probabilityFactors: Record<ObjectClass, number>
  ) => void;
  onUpdateMovements: (movements: Record<string, string>) => void;
  renderSimulationData: () => void;
  downloadSimulationData: () => void;
  onImportCameraFrames: (cameraFrames: CameraParameters[]) => void;
}

export const Settings: FC<SettingsProps> = ({
  open,
  subjectsInfo,
  instructions,
  onClose,
  onAddInstruction,
  onEditInstruction,
  onDeleteInstruction,
  onGenerateSubjects,
  onUpdateMovements,
  renderSimulationData,
  downloadSimulationData,
  onImportCameraFrames,
}) => {
  const [activeStep, setActiveStep] = useState(-1);
  const [showSimulationSteps, setShowSimulationSteps] = useState(false);
  const [showGeneratorOptions, setShowGeneratorOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeStep === -1) {
      setShowSimulationSteps(false);
    }
  }, [activeStep]);

  const handleGenerateRandomDataset = () => {
    setShowGeneratorOptions(true);
  };

  const handleGenerateDataset = (options: GenerateDatasetConfig) => {
    generateRandomDataset(options);
    setShowGeneratorOptions(false);
    onClose();
  };

  const handleRenderSimulation = () => {
    setShowSimulationSteps(true);
    setActiveStep(0);
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
          onImportCameraFrames(data);
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
        {activeStep === -1 && !showGeneratorOptions && (
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
        {showGeneratorOptions && (
          <GeneratorOptions
            onGenerate={handleGenerateDataset}
            onClose={() => setShowGeneratorOptions(false)}
          />
        )}
        {showSimulationSteps && (
          <SimulationSteps
            activeStep={activeStep}
            setActiveStep={setActiveStep}
            subjectsInfo={subjectsInfo}
            instructions={instructions}
            onAddInstruction={onAddInstruction}
            onEditInstruction={onEditInstruction}
            onDeleteInstruction={onDeleteInstruction}
            onGenerateSubjects={onGenerateSubjects}
            onUpdateMovements={onUpdateMovements}
            renderSimulationData={renderSimulationData}
            downloadSimulationData={downloadSimulationData}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
