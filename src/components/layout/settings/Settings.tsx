import React, { FC, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  Stack,
  Typography,
  Alert,
  Collapse,
  Box,
  IconButton,
  alpha,
  Divider,
  Fade,
} from "@mui/material";
import {
  Close as CloseIcon,
  MovieFilter as MovieIcon,
  Casino as RandomIcon,
  TheatersOutlined as RenderIcon,
  FileUploadOutlined as ImportIcon,
  SwapHoriz as TranslateIcon,
  DirectionsCar as CsvCameraIcon,
  Videocam as SimCameraIcon,
} from "@mui/icons-material";
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
import { importRideDataThunk } from "@/redux/thunks/simulationThunks";
import { processRideData, RideDataSource } from "@/service/ride/process";
import { toast } from "react-toastify";

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

const downloadCsv = (csvString: string, filename: string) => {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color?: string;
  variant?: "primary" | "secondary" | "subtle";
}

const ActionCard: FC<ActionCardProps> = ({
  icon,
  title,
  description,
  onClick,
  color = "#E8753A",
  variant = "secondary",
}) => (
  <Box
    onClick={onClick}
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 2,
      p: 2,
      borderRadius: 2,
      cursor: "pointer",
      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      border: `1px solid ${alpha("#FFFFFF", variant === "primary" ? 0.1 : 0.05)}`,
      backgroundColor:
        variant === "primary"
          ? alpha(color, 0.08)
          : alpha("#000000", 0.15),
      "&:hover": {
        backgroundColor:
          variant === "primary"
            ? alpha(color, 0.15)
            : alpha("#FFFFFF", 0.05),
        borderColor: alpha(color, 0.3),
        transform: "translateY(-1px)",
        boxShadow: `0 8px 24px ${alpha("#000000", 0.3)}`,
        "& .action-icon": {
          transform: "scale(1.1)",
          color: color,
        },
      },
      "&:active": {
        transform: "translateY(0)",
      },
    }}
  >
    <Box
      className="action-icon"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 42,
        height: 42,
        borderRadius: 1.5,
        backgroundColor: alpha(color, 0.1),
        color: alpha(color, 0.8),
        flexShrink: 0,
        transition: "all 0.25s ease",
        "& svg": { fontSize: 20 },
      }}
    >
      {icon}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, color: "text.primary", lineHeight: 1.3 }}
      >
        {title}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: "text.secondary", display: "block", mt: 0.25 }}
      >
        {description}
      </Typography>
    </Box>
  </Box>
);

export const Settings: FC<SettingsProps> = ({ open, onClose }) => {
  const dispatch = useAppDispatch();
  const { simulationStepIndex, selectedView } = useAppSelector(
    (state) => state.ui
  );

  const [importError, setImportError] = useState<string | null>(null);
  const [isLocalhost, setIsLocalhost] = useState<boolean>(false);

  const inferenceFileInputRef = useRef<HTMLInputElement>(null);
  const translateFileInputRef = useRef<HTMLInputElement>(null);
  const rideFileInputRef = useRef<HTMLInputElement>(null);
  const rideImportModeRef = useRef<RideDataSource>(RideDataSource.CSV);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsLocalhost(
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
      );
    }
  }, []);

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

  const handleImportRideFile = (mode: RideDataSource) => {
    rideImportModeRef.current = mode;
    rideFileInputRef.current?.click();
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

  const handleRideFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvText = e.target?.result as string;
          if (!csvText || csvText.trim().length === 0) {
            throw new Error("CSV file is empty or could not be parsed.");
          }
          const processedData = processRideData(
            rideImportModeRef.current,
            csvText
          );
          if (
            rideImportModeRef.current === RideDataSource.SIMULATION &&
            processedData.csvData
          ) {
            downloadCsv(processedData.csvData, "simulated_ride_camera.csv");
          }
          dispatch(importRideDataThunk(processedData));
          setImportError(null);
          onClose();
        } catch (error) {
          const errorMessage =
            (error as Error).message || "An unknown error occurred.";
          console.error("Error processing RIDE file:", error);
          setImportError(errorMessage);
          toast.error(`Import failed: ${errorMessage}`);
        }
      };
      reader.onerror = () => {
        const errorMessage = "Failed to read the file.";
        setImportError(errorMessage);
        toast.error(errorMessage);
      };
      reader.readAsText(file);
    }
    if (event.target) {
      event.target.value = "";
    }
  };

  const getDialogTitle = () => {
    switch (selectedView) {
      case "generator":
        return "Dataset Generator";
      case "simulation":
        return "Build Simulation";
      default:
        return "";
    }
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
            top: 20,
            bottom: 20,
            margin: 0,
            maxHeight: "calc(100vh - 40px)",
            display: "flex",
            flexDirection: "column",
          },
        }}
        maxWidth="sm"
        fullWidth
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 3,
            pt: 2.5,
            pb: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `linear-gradient(135deg, ${alpha("#E8753A", 0.2)} 0%, ${alpha("#4EA8DE", 0.15)} 100%)`,
                border: `1px solid ${alpha("#E8753A", 0.2)}`,
              }}
            >
              <MovieIcon sx={{ fontSize: 18, color: "#E8753A" }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ lineHeight: 1.2, color: "text.primary" }}>
                {selectedView === "none"
                  ? "Camera Studio"
                  : getDialogTitle()}
              </Typography>
              {selectedView === "none" && (
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Cinematic movement simulation
                </Typography>
              )}
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: "text.secondary",
              "&:hover": { color: "text.primary" },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Divider sx={{ opacity: 0.5 }} />

        {/* Content */}
        <DialogContent
          sx={{
            flex: 1,
            overflow: "auto",
            "&::-webkit-scrollbar": { width: 5 },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: alpha("#FFFFFF", 0.1),
              borderRadius: 3,
            },
          }}
        >
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
            <Fade in timeout={300}>
              <Stack spacing={2.5}>
                {/* Primary Actions */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, pl: 0.5 }}>
                    Create
                  </Typography>
                  <Stack spacing={1}>
                    <ActionCard
                      icon={<RenderIcon />}
                      title="Build Simulation"
                      description="Configure subjects, movements & camera instructions"
                      onClick={handleRenderSimulation}
                      color="#E8753A"
                      variant="primary"
                    />
                    <ActionCard
                      icon={<RandomIcon />}
                      title="Generate Dataset"
                      description="Batch-generate random cinematography data"
                      onClick={handleGenerateRandomDataset}
                      color="#4EA8DE"
                    />
                  </Stack>
                </Box>

                {/* Import Actions */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, pl: 0.5 }}>
                    Import
                  </Typography>
                  <Stack spacing={1}>
                    <ActionCard
                      icon={<ImportIcon />}
                      title="Import Inference File"
                      description="Load a JSON file with trajectory data"
                      onClick={handleImportInferenceFile}
                      color="#6BCB77"
                    />
                  </Stack>
                </Box>

                {isLocalhost && (
                  <>
                    {/* CSV Import */}
                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{ mb: 1.5, pl: 0.5 }}
                      >
                        CSV Import
                      </Typography>
                      <Stack spacing={1}>
                        <ActionCard
                          icon={<CsvCameraIcon />}
                          title="Use CSV Camera"
                          description="Import camera data from CSV file"
                          onClick={() =>
                            handleImportRideFile(RideDataSource.CSV)
                          }
                          color="#9B59B6"
                        />
                        <ActionCard
                          icon={<SimCameraIcon />}
                          title="Simulate from CSV"
                          description="Generate camera trajectory from CSV subject data"
                          onClick={() =>
                            handleImportRideFile(RideDataSource.SIMULATION)
                          }
                          color="#9B59B6"
                        />
                      </Stack>
                    </Box>

                    {/* Translate */}
                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{ mb: 1.5, pl: 0.5 }}
                      >
                        Tools
                      </Typography>
                      <ActionCard
                        icon={<TranslateIcon />}
                        title="Process Translate File"
                        description="Convert cinematography prompts to instructions"
                        onClick={handleTranslateFile}
                        color="#F39C12"
                      />
                    </Box>
                  </>
                )}
              </Stack>
            </Fade>
          )}

          {selectedView === "generator" && (
            <GeneratorOptions
              onClose={() => dispatch(setSelectedView("none"))}
            />
          )}
          {selectedView === "simulation" && <SimulationSteps />}
        </DialogContent>

        {/* Hidden file inputs */}
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
        <input
          type="file"
          ref={rideFileInputRef}
          style={{ display: "none" }}
          onChange={handleRideFileChange}
          accept=".csv"
        />
      </Dialog>
    </>
  );
};
