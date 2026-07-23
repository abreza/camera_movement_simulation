import React, { FC, useState, useEffect } from "react";
import {
  Button,
  Stack,
  Box,
  Alert,
  Typography,
  alpha,
  Fade,
} from "@mui/material";
import {
  PersonAdd as SubjectsIcon,
  DirectionsRun as MovementIcon,
  Videocam as InstructionsIcon,
  Check as CheckIcon,
  ArrowBack as BackIcon,
  ArrowForward as ForwardIcon,
} from "@mui/icons-material";
import { SubjectGeneration } from "./SubjectGeneration";
import MovementSelection from "./MovementSelection";
import { InstructionManagement } from "./instructionManagement/InstructionManagement";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setSimulationStepIndex } from "@/redux/slices/uiSlice";

const STEPS = [
  {
    label: "Subjects",
    description: "Generate 3D subjects",
    icon: <SubjectsIcon sx={{ fontSize: 18 }} />,
  },
  {
    label: "Movements",
    description: "Assign motion paths",
    icon: <MovementIcon sx={{ fontSize: 18 }} />,
  },
  {
    label: "Instructions",
    description: "Camera setup",
    icon: <InstructionsIcon sx={{ fontSize: 18 }} />,
  },
];

interface StepIndicatorProps {
  index: number;
  label: string;
  description: string;
  icon: React.ReactNode;
  isActive: boolean;
  isCompleted: boolean;
  isLast: boolean;
}

const StepIndicator: FC<StepIndicatorProps> = ({
  index,
  label,
  icon,
  isActive,
  isCompleted,
  isLast,
}) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      flex: isLast ? "none" : 1,
    }}
  >
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          backgroundColor: isActive
            ? "#E8753A"
            : isCompleted
              ? alpha("#6BCB77", 0.15)
              : alpha("#FFFFFF", 0.06),
          border: `1.5px solid ${isActive
            ? "#E8753A"
            : isCompleted
              ? alpha("#6BCB77", 0.4)
              : alpha("#FFFFFF", 0.1)
            }`,
          color: isActive
            ? "#FFF"
            : isCompleted
              ? "#6BCB77"
              : alpha("#FFFFFF", 0.35),
          boxShadow: isActive
            ? `0 4px 16px ${alpha("#E8753A", 0.35)}`
            : "none",
        }}
      >
        {isCompleted ? <CheckIcon sx={{ fontSize: 16 }} /> : icon}
      </Box>
      <Typography
        variant="caption"
        sx={{
          fontWeight: isActive ? 700 : 500,
          color: isActive
            ? "text.primary"
            : isCompleted
              ? "#6BCB77"
              : "text.secondary",
          transition: "all 0.2s ease",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Typography>
    </Box>
    {!isLast && (
      <Box
        sx={{
          flex: 1,
          height: 1.5,
          mx: 1.5,
          borderRadius: 1,
          backgroundColor: isCompleted
            ? alpha("#6BCB77", 0.3)
            : alpha("#FFFFFF", 0.06),
          transition: "background-color 0.3s ease",
        }}
      />
    )}
  </Box>
);

export const SimulationSteps: FC = () => {
  const dispatch = useAppDispatch();
  const activeStep = useAppSelector((state) => state.ui.simulationStepIndex);
  const subjectsInfo = useAppSelector((state) => state.subjects.subjectsInfo);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setErrorMessage(null);
  }, [activeStep]);

  const handleNext = () => {
    if (activeStep === 0 && subjectsInfo.length === 0) {
      setErrorMessage(
        "Please generate at least one subject before proceeding"
      );
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
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 3,
          p: 1.5,
          borderRadius: 2,
          backgroundColor: alpha("#000000", 0.2),
          border: `1px solid ${alpha("#FFFFFF", 0.04)}`,
        }}
      >
        {STEPS.map((step, index) => (
          <StepIndicator
            key={step.label}
            index={index}
            {...step}
            isActive={activeStep === index}
            isCompleted={activeStep > index}
            isLast={index === STEPS.length - 1}
          />
        ))}
      </Box>

      {errorMessage && (
        <Fade in>
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            onClose={() => setErrorMessage(null)}
          >
            {errorMessage}
          </Alert>
        </Fade>
      )}

      <Box sx={{ minHeight: "350px" }}>{renderStepContent()}</Box>

      <Stack
        direction="row"
        spacing={1.5}
        justifyContent="space-between"
        sx={{
          mt: 3,
          pt: 2,
          borderTop: `1px solid ${alpha("#FFFFFF", 0.06)}`,
        }}
      >
        <Button
          variant="outlined"
          onClick={handleBack}
          color={activeStep === 0 ? "error" : "primary"}
          startIcon={activeStep === 0 ? undefined : <BackIcon />}
          size="small"
        >
          {activeStep === 0 ? "Cancel" : "Back"}
        </Button>

        {activeStep < 2 && (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={activeStep === 0 && subjectsInfo.length === 0}
            endIcon={<ForwardIcon />}
            size="small"
          >
            Continue
          </Button>
        )}
      </Stack>
    </Box>
  );
};

export default SimulationSteps;
