import React, { FC, useState, useEffect } from "react";
import {
  Stepper,
  Step,
  StepLabel,
  Button,
  Stack,
  Box,
  Alert,
} from "@mui/material";
import { SubjectGeneration } from "./SubjectGeneration";
import MovementSelection from "./MovementSelection";
import { InstructionManagement } from "./instructionManagement/InstructionManagement";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setSimulationStepIndex } from "@/redux/slices/uiSlice";

export const SimulationSteps: FC = () => {
  const dispatch = useAppDispatch();
  const activeStep = useAppSelector((state) => state.ui.simulationStepIndex);
  const subjectsInfo = useAppSelector((state) => state.subjects.subjectsInfo);

  const steps = [
    "Generate Subjects",
    "Select Movements",
    "Manage Instructions",
  ];

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setErrorMessage(null);
  }, [activeStep]);

  const handleNext = () => {
    if (activeStep === 0 && subjectsInfo.length === 0) {
      setErrorMessage("Please generate at least one subject before proceeding");
      return;
    }

    dispatch(setSimulationStepIndex(activeStep + 1));
  };

  const handleBack = () => {
    if (activeStep === 0) {
      dispatch(setSimulationStepIndex(-1));
    } else {
      dispatch(setSimulationStepIndex(activeStep - 1));
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return <SubjectGeneration />;
      case 1:
        return <MovementSelection />;
      case 2:
        return <InstructionManagement />;
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
    </>
  );
};

export default SimulationSteps;
