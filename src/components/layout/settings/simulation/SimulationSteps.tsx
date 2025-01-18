import React, { FC } from "react";
import { Stepper, Step, StepLabel, Button, Stack } from "@mui/material";
import { SubjectGeneration } from "./SubjectGeneration";
import MovementSelection from "./MovementSelection";
import { InstructionManagement } from "./instructionManagement/InstructionManagement";
import { SimulationInstruction } from "@/service/simulation/instruction/types";
import { ObjectClass, SubjectInfo } from "@/service/subjects/types";

interface SimulationStepsProps {
  activeStep: number;
  setActiveStep: React.Dispatch<React.SetStateAction<number>>;
  subjectsInfo: SubjectInfo[];
  instructions: SimulationInstruction[];
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
  onUpdateMovements,
  renderSimulationData,
  downloadSimulationData,
  onClose,
}) => {
  const steps = [
    "Generate Subjects",
    "Select Movements",
    "Manage Instructions",
  ];

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <SubjectGeneration
            onGenerateSubjects={onGenerateSubjects}
            handleNext={handleNext}
          />
        );
      case 1:
        return (
          <MovementSelection
            subjectsInfo={subjectsInfo}
            onUpdateMovements={onUpdateMovements}
            handleNext={handleNext}
          />
        );
      case 2:
        return (
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
        );
      default:
        return null;
    }
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
      {renderStepContent()}
      <Stack
        direction="row"
        spacing={2}
        justifyContent="space-between"
        sx={{ mt: 1 }}
      >
        <Button onClick={handleBack}>
          {activeStep === 0 ? "Cancel" : "Back"}
        </Button>
        {activeStep < 2 && (
          <Button
            onClick={handleNext}
            disabled={activeStep === 0 && subjectsInfo.length === 0}
          >
            Next
          </Button>
        )}
      </Stack>
    </>
  );
};
