import React, { FC, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@mui/material";
import { Transition } from "./Transition";
import { InitialOptions } from "./InitialOptions";
import { SimulationSteps } from "./simulation/SimulationSteps";
import { GeneratorOptions } from "./dataset/GeneratorOptions";
import {
  CinematographyInstruction,
  ObjectClass,
  Subject,
} from "@/types/simulation";
import {
  generateRandomDataset,
  GenerateRandomDatasetOptions,
} from "@/service/dataset/generator";

interface SettingsProps {
  open: boolean;
  subjects: Subject[];
  instructions: CinematographyInstruction[];
  onClose: () => void;
  onAddInstruction: (instruction: CinematographyInstruction) => void;
  onEditInstruction: (
    index: number,
    instruction: CinematographyInstruction
  ) => void;
  onDeleteInstruction: (index: number) => void;
  onGenerateSubjects: (
    count: number,
    probabilityFactors: Record<ObjectClass, number>
  ) => void;
  renderSimulationData: () => void;
  downloadSimulationData: () => void;
}

export const Settings: FC<SettingsProps> = ({
  open,
  subjects,
  instructions,
  onClose,
  onAddInstruction,
  onEditInstruction,
  onDeleteInstruction,
  onGenerateSubjects,
  renderSimulationData,
  downloadSimulationData,
}) => {
  const [activeStep, setActiveStep] = useState(-1);
  const [showSimulationSteps, setShowSimulationSteps] = useState(false);
  const [showGeneratorOptions, setShowGeneratorOptions] = useState(false);

  const handleGenerateRandomDataset = () => {
    setShowGeneratorOptions(true);
  };

  const handleGenerateDataset = (options: GenerateRandomDatasetOptions) => {
    generateRandomDataset(options);
    setShowGeneratorOptions(false);
    onClose();
  };

  const handleRenderSimulation = () => {
    setShowSimulationSteps(true);
    setActiveStep(0);
  };

  return (
    <Dialog
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={onClose}
      aria-describedby="alert-dialog-slide-description"
      PaperProps={{
        style: {
          position: "fixed",
          left: 20,
          margin: 0,
        },
      }}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Cinematic Camera Movement</DialogTitle>
      <DialogContent>
        {activeStep === -1 && !showGeneratorOptions && (
          <InitialOptions
            onGenerateRandomDataset={handleGenerateRandomDataset}
            onRenderSimulation={handleRenderSimulation}
          />
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
            subjects={subjects}
            instructions={instructions}
            onAddInstruction={onAddInstruction}
            onEditInstruction={onEditInstruction}
            onDeleteInstruction={onDeleteInstruction}
            onGenerateSubjects={onGenerateSubjects}
            renderSimulationData={renderSimulationData}
            downloadSimulationData={downloadSimulationData}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
