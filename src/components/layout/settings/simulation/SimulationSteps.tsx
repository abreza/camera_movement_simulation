import React, { FC, useState, useEffect } from "react";
import {
  Stepper,
  Step,
  StepLabel,
  Button,
  Stack,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Box,
  Alert,
} from "@mui/material";
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

  const [confirmExitOpen, setConfirmExitOpen] = useState(false);
  const [confirmBackOpen, setConfirmBackOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setErrorMessage(null);
  }, [activeStep]);

  const handleNext = () => {
    if (activeStep === 0 && subjectsInfo.length === 0) {
      setErrorMessage("Please generate at least one subject before proceeding");
      return;
    }

    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    if (activeStep === 0) {
      setConfirmExitOpen(true);
    } else {
      if (activeStep === 2 && instructions.length > 0) {
        setConfirmBackOpen(true);
      } else {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
      }
    }
  };

  const handleConfirmExit = () => {
    setConfirmExitOpen(false);
    onClose();
  };

  const handleConfirmBack = () => {
    setConfirmBackOpen(false);
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
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {errorMessage && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="error">{errorMessage}</Alert>
        </Box>
      )}

      <Box sx={{ minHeight: "400px" }}>{renderStepContent()}</Box>

      <Stack
        direction="row"
        spacing={2}
        justifyContent="space-between"
        sx={{ mt: 3 }}
      >
        <Button
          variant="outlined"
          onClick={handleBack}
          color={activeStep === 0 ? "error" : "primary"}
        >
          {activeStep === 0 ? "Cancel" : "Back"}
        </Button>

        {activeStep < 2 && (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={activeStep === 0 && subjectsInfo.length === 0}
          >
            Next
          </Button>
        )}
      </Stack>

      <Dialog open={confirmExitOpen} onClose={() => setConfirmExitOpen(false)}>
        <DialogTitle>Confirm Exit</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to exit? Any unsaved changes will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmExitOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmExit} color="error">
            Exit
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmBackOpen} onClose={() => setConfirmBackOpen(false)}>
        <DialogTitle>Go Back</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Going back may require you to reconfigure instructions. Continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmBackOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmBack} color="warning">
            Go Back
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SimulationSteps;
