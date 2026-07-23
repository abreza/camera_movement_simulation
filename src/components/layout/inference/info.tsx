"use client";
import { FC, useEffect, useState } from "react";

import {
  Box,
  Typography,
  Collapse,
  Stack,
  ToggleButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  alpha,
  Chip,
  IconButton,
} from "@mui/material";

import {
  KeyboardArrowUp as MinimizeIcon,
  KeyboardArrowDown as MaximizeIcon,
  RouteOutlined as TrajectoryIcon,
} from "@mui/icons-material";

import {
  setCurrentFrame,
  setIsRendering,
  setCameraFrames,
  setSelectedBatchIndex,
} from "@/redux/slices/cameraSlice";

import * as THREE from "three";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setSubjectsInfo } from "@/redux/slices/subjectsSlice";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`prompt-tabpanel-${index}`}
      aria-labelledby={`prompt-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

export const InferenceInfo: FC<{}> = () => {
  const [selectedTrajectoryMode, setSelectedTrajectoryMode] =
    useState<string>("prompt_generation");
  const [trajectoryBoxMinimized, setTrajectoryBoxMinimized] = useState(false);
  const [selectedPromptTab, setSelectedPromptTab] = useState(0);

  const dispatch = useAppDispatch();
  const selectedBatchIndex = useAppSelector(
    (state) => state.camera.selectedBatchIndex
  );
  const totalBatches = useAppSelector((state) => state.camera.totalBatches);
  const sourceData = useAppSelector((state) => state.camera.sourceData);

  useEffect(() => {
    if (sourceData?.currentTrajectoryMode) {
      setSelectedTrajectoryMode(sourceData.currentTrajectoryMode);
    }
  }, [sourceData]);

  const inferenceSubjects = useAppSelector(
    (state) => state.camera.inferenceSubjects
  );

  useEffect(() => {
    if (inferenceSubjects) {
      dispatch(setSubjectsInfo(inferenceSubjects[selectedBatchIndex]));
    }
  }, [inferenceSubjects, selectedBatchIndex, dispatch]);

  const convertInferenceTrajectory = (
    trajectoryData: number[][],
    batchIndex: number = 0
  ): any[] => {
    if (
      Array.isArray(trajectoryData[0]) &&
      Array.isArray(trajectoryData[0][0])
    ) {
      if (batchIndex >= trajectoryData.length) {
        batchIndex = 0;
      }
      return trajectoryData[batchIndex].map((frame: any) => ({
        position: new THREE.Vector3(frame[0], frame[1], frame[2]),
        rotation: new THREE.Euler(frame[3], frame[4], frame[5]),
        focalLength: 50,
        aspectRatio: 16 / 9,
      }));
    }
    return trajectoryData.map((frame) => ({
      position: new THREE.Vector3(frame[0], frame[1], frame[2]),
      rotation: new THREE.Euler(frame[3], frame[4], frame[5]),
      focalLength: 50,
      aspectRatio: 16 / 9,
    }));
  };

  const handleTrajectoryModeChange = (mode: string) => {
    if (mode && sourceData?.trajectories?.[mode]) {
      setSelectedTrajectoryMode(mode);
      const trajectoryData = sourceData.trajectories[mode];
      const convertedFrames = convertInferenceTrajectory(
        trajectoryData,
        selectedBatchIndex
      );
      dispatch(setCameraFrames(convertedFrames));
      dispatch(setCurrentFrame(0));
      dispatch(setIsRendering(true));
      if (sourceData) {
        sourceData.currentTrajectoryMode = mode;
      }
    }
  };

  const handleBatchSelectionChange = (event: any) => {
    const newBatchIndex = event.target.value as number;
    dispatch(setSelectedBatchIndex(newBatchIndex));
    dispatch(setCurrentFrame(0));
    dispatch(setIsRendering(true));
    setSelectedTrajectoryMode("prompt_generation");
  };

  const handlePromptTabChange = (
    event: React.SyntheticEvent,
    newValue: number
  ) => {
    setSelectedPromptTab(newValue);
  };

  const hasRawPrompt = sourceData.batch_data?.raw_prompt;
  const hasTextPrompt = sourceData.batch_data?.text_prompts;
  const hasBothPrompts = hasRawPrompt && hasTextPrompt;

  const getCurrentRawPrompt = () => {
    if (!hasRawPrompt) return null;
    return sourceData.batch_data.raw_prompt[selectedBatchIndex];
  };

  const getCurrentTextPrompt = () => {
    if (!hasTextPrompt) return null;
    return sourceData.batch_data.text_prompts[selectedBatchIndex];
  };

  const codeBlockStyle = {
    maxHeight: "140px",
    overflowY: "auto" as const,
    p: 1.5,
    backgroundColor: alpha("#000000", 0.35),
    borderRadius: 1.5,
    fontSize: "0.72rem",
    fontFamily: "'JetBrains Mono', monospace",
    color: alpha("#FFFFFF", 0.75),
    border: `1px solid ${alpha("#FFFFFF", 0.04)}`,
    mt: 1,
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
    "&::-webkit-scrollbar": { width: 4 },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: alpha("#FFFFFF", 0.1),
      borderRadius: 2,
    },
  };

  return (
    <Box
      sx={{
        position: "fixed",
        top: 16,
        right: 16,
        bgcolor: alpha("#1A1A2E", 0.95),
        backdropFilter: "blur(16px)",
        borderRadius: 2.5,
        border: `1px solid ${alpha("#FFFFFF", 0.08)}`,
        boxShadow: `0 16px 64px ${alpha("#000000", 0.5)}`,
        zIndex: 10,
        maxWidth: 520,
        minWidth: 280,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.25,
          cursor: "pointer",
          transition: "background-color 0.15s ease",
          "&:hover": {
            backgroundColor: alpha("#FFFFFF", 0.03),
          },
        }}
        onClick={() => setTrajectoryBoxMinimized(!trajectoryBoxMinimized)}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TrajectoryIcon
            sx={{ fontSize: 16, color: "#E8753A", opacity: 0.8 }}
          />
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              fontSize: "0.72rem",
              color: "text.primary",
              letterSpacing: "0.06em",
            }}
          >
            Trajectory Details
          </Typography>
        </Box>
        <IconButton size="small" sx={{ color: "text.secondary", p: 0.5 }}>
          {trajectoryBoxMinimized ? (
            <MaximizeIcon fontSize="small" />
          ) : (
            <MinimizeIcon fontSize="small" />
          )}
        </IconButton>
      </Box>

      <Collapse in={!trajectoryBoxMinimized}>
        <Box
          sx={{
            px: 2,
            pb: 2,
            pt: 0.5,
            borderTop: `1px solid ${alpha("#FFFFFF", 0.05)}`,
          }}
        >
          <Stack spacing={2}>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 600,
                  mb: 1,
                  display: "block",
                }}
              >
                Mode
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.75,
                }}
              >
                {Object.keys(sourceData.trajectories).map((mode) => (
                  <ToggleButton
                    key={mode}
                    value={mode}
                    selected={selectedTrajectoryMode === mode}
                    onChange={() => handleTrajectoryModeChange(mode)}
                    size="small"
                    sx={{
                      minWidth: "fit-content",
                      px: 1.5,
                      py: 0.4,
                      fontSize: "0.68rem",
                      textTransform: "none",
                      borderRadius: "6px !important",
                      border: `1px solid ${alpha("#FFFFFF", 0.08)} !important`,
                    }}
                  >
                    {mode.replace(/_/g, " ")}
                  </ToggleButton>
                ))}
              </Box>
            </Box>
            {totalBatches > 1 && (
              <FormControl fullWidth size="small">
                <InputLabel>Simulation</InputLabel>
                <Select
                  value={selectedBatchIndex}
                  label="Simulation"
                  onChange={handleBatchSelectionChange}
                >
                  {Array.from({ length: totalBatches }, (_, i) => (
                    <MenuItem key={i} value={i}>
                      Simulation {i + 1}
                      {sourceData.batch_data?.raw_prompt?.[i]?.movement?.type
                        ? ` — ${sourceData.batch_data.raw_prompt[i].movement.type}`
                        : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <Stack direction="row" spacing={1}>
              {sourceData.dataset_type && (
                <Chip
                  label={sourceData.dataset_type}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: "0.68rem" }}
                />
              )}
              {sourceData.model_type && (
                <Chip
                  label={sourceData.model_type}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: "0.68rem" }}
                />
              )}
            </Stack>
            {(hasRawPrompt || hasTextPrompt) && (
              <Box>
                {hasBothPrompts ? (
                  <>
                    <Tabs
                      value={selectedPromptTab}
                      onChange={handlePromptTabChange}
                      variant="fullWidth"
                      sx={{
                        minHeight: 32,
                        "& .MuiTab-root": {
                          minHeight: 32,
                          py: 0.5,
                          fontSize: "0.7rem",
                        },
                      }}
                    >
                      <Tab label="Raw Prompt" />
                      <Tab label="Text Prompt" />
                    </Tabs>
                    <TabPanel value={selectedPromptTab} index={0}>
                      <Box sx={codeBlockStyle}>
                        {JSON.stringify(getCurrentRawPrompt(), null, 2)}
                      </Box>
                    </TabPanel>
                    <TabPanel value={selectedPromptTab} index={1}>
                      <Box sx={codeBlockStyle}>{getCurrentTextPrompt()}</Box>
                    </TabPanel>
                  </>
                ) : (
                  <>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        fontWeight: 600,
                        display: "block",
                        mb: 0.5,
                      }}
                    >
                      Prompt
                    </Typography>
                    {hasRawPrompt && (
                      <Box sx={codeBlockStyle}>
                        {JSON.stringify(getCurrentRawPrompt(), null, 2)}
                      </Box>
                    )}
                    {hasTextPrompt && (
                      <Box sx={codeBlockStyle}>{getCurrentTextPrompt()}</Box>
                    )}
                  </>
                )}
              </Box>
            )}
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
};
