import React, { FC, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  Stepper,
  Step,
  StepLabel,
  Stack,
} from "@mui/material";
import { Transition } from "./Transition";
import { SubjectGeneration } from "./SubjectGeneration";
import { InstructionManagement } from "./InstructionManagement";
import {
  CinematographyInstruction,
  ObjectClass,
  Subject,
} from "@/types/simulation";

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
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const steps = ["Generate Subjects", "Manage Instructions"];

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
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        {activeStep === 0 ? (
          <SubjectGeneration
            onGenerateSubjects={onGenerateSubjects}
            handleNext={handleNext}
          />
        ) : (
          <InstructionManagement
            subjects={subjects}
            instructions={instructions}
            onAddInstruction={onAddInstruction}
            onEditInstruction={onEditInstruction}
            onDeleteInstruction={onDeleteInstruction}
            onClose={onClose}
            renderSimulationData={renderSimulationData}
            downloadSimulationData={downloadSimulationData}
          />
        )}
        <Stack
          direction="row"
          spacing={2}
          justifyContent="space-between"
          sx={{ mt: 1 }}
        >
          <Button onClick={handleBack} disabled={activeStep === 0}>
            Back
          </Button>
          {activeStep === 0 && (
            <Button onClick={handleNext} disabled={subjects.length === 0}>
              Next
            </Button>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
