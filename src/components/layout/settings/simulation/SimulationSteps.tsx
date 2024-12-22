import React, { FC } from "react";
import { Stepper, Step, StepLabel, Button, Stack } from "@mui/material";
import { SubjectGeneration } from "./SubjectGeneration";
import { InstructionManagement } from "./InstructionManagement";
import { CinematographyInstruction, SubjectInfo } from "@/types/simulation";
import { ObjectClass } from "@/service/subjects/types";

interface SimulationStepsProps {
  activeStep: number;
  setActiveStep: React.Dispatch<React.SetStateAction<number>>;
  subjectsInfo: SubjectInfo[];
  instructions: CinematographyInstruction[];
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
  onClose: () => void;
}

export const SimulationSteps: FC<SimulationStepsProps> = ({
  activeStep,
  setActiveStep,
  subjectsInfo,
  instructions,
  onAddInstruction,
  onEditInstruction,
  onDeleteInstruction,
  onGenerateSubjects,
  renderSimulationData,
  downloadSimulationData,
  onClose,
}) => {
  const steps = ["Generate Subjects", "Manage Instructions"];

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  return (
    <>
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
          subjectsInfo={subjectsInfo}
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
        <Button onClick={handleBack}>
          {activeStep === 0 ? "Cancel" : "Back"}
        </Button>
        {activeStep === 0 && (
          <Button onClick={handleNext} disabled={subjectsInfo.length === 0}>
            Next
          </Button>
        )}
      </Stack>
    </>
  );
};
