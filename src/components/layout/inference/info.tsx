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
  Button,
  Tabs,
  Tab,
} from "@mui/material";

import {
  ArrowDropUp as MinimizeIcon,
  ArrowDropDown as MaximizeIcon,
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
      return trajectoryData[batchIndex].map((frame: any) => {
        return {
          position: new THREE.Vector3(frame[0], frame[1], frame[2]),
          rotation: new THREE.Euler(frame[3], frame[4], frame[5]),
          focalLength: 50,
          aspectRatio: 16 / 9,
        };
      });
    }

    return trajectoryData.map((frame) => {
      return {
        position: new THREE.Vector3(frame[0], frame[1], frame[2]),
        rotation: new THREE.Euler(frame[3], frame[4], frame[5]),
        focalLength: 50,
        aspectRatio: 16 / 9,
      };
    });
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

  // Check if both prompts exist
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

  return (
    <Box
      sx={{
        position: "fixed",
        top: 20,
        right: 20,
        bgcolor: "background.paper",
        borderRadius: 2,
        boxShadow: 3,
        zIndex: 10,
        maxWidth: 600,
        minWidth: 300,
      }}
    >
      <Button
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1,
          borderBottom: trajectoryBoxMinimized
            ? "none"
            : "1px solid rgba(0,0,0,0.12)",
          width: "100%",
        }}
        onClick={() => setTrajectoryBoxMinimized(!trajectoryBoxMinimized)}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Trajectory Details
        </Typography>
        {trajectoryBoxMinimized ? <MaximizeIcon /> : <MinimizeIcon />}
      </Button>

      <Collapse in={!trajectoryBoxMinimized}>
        <Box sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Trajectory Mode
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  alignItems: "center",
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
                      px: 2,
                      py: 0.5,
                      fontSize: "0.75rem",
                      textTransform: "none",
                      flex: "0 0 auto",
                    }}
                  >
                    {mode.replace(/_/g, " ")}
                  </ToggleButton>
                ))}
              </Box>
            </Box>

            {totalBatches > 1 && (
              <Box>
                <FormControl fullWidth size="small">
                  <InputLabel>Simulation</InputLabel>
                  <Select
                    value={selectedBatchIndex}
                    label="Simulation"
                    onChange={handleBatchSelectionChange}
                  >
                    {Array.from({ length: totalBatches }, (_, i) => (
                      <MenuItem key={i} value={i}>
                        Simulation {i + 1}-{" "}
                        {sourceData.batch_data?.raw_prompt?.[i].movement.type ||
                          " "}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
          </Stack>

          <Box mt={2}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2">
                <strong>Dataset Type:</strong> {sourceData.dataset_type}
              </Typography>
              <Typography variant="body2">
                <strong>Model Type:</strong> {sourceData.model_type}
              </Typography>
            </Stack>

            {(hasRawPrompt || hasTextPrompt) && (
              <Box mt={1}>
                {hasBothPrompts ? (
                  <>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Prompt:</strong>
                    </Typography>
                    <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                      <Tabs
                        value={selectedPromptTab}
                        onChange={handlePromptTabChange}
                        variant="fullWidth"
                      >
                        <Tab label="Raw Prompt" />
                        <Tab label="Text Prompt" />
                      </Tabs>
                    </Box>
                    <TabPanel value={selectedPromptTab} index={0}>
                      <pre
                        style={{
                          maxHeight: "150px",
                          overflowY: "auto",
                          padding: 8,
                          background: "rgba(0,0,0,0.05)",
                          borderRadius: 4,
                          fontSize: "0.8rem",
                          margin: 0,
                          marginTop: 8,
                        }}
                      >
                        {JSON.stringify(getCurrentRawPrompt(), null, 2)}
                      </pre>
                    </TabPanel>
                    <TabPanel value={selectedPromptTab} index={1}>
                      <Box
                        sx={{
                          maxHeight: "150px",
                          overflowY: "auto",
                          p: 1,
                          background: "rgba(0,0,0,0.05)",
                          borderRadius: 1,
                          fontSize: "0.8rem",
                          mt: 1,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {getCurrentTextPrompt()}
                      </Box>
                    </TabPanel>
                  </>
                ) : (
                  <>
                    <Typography variant="body2">
                      <strong>Prompt:</strong>
                    </Typography>
                    {hasRawPrompt && (
                      <pre
                        style={{
                          maxHeight: "150px",
                          overflowY: "auto",
                          padding: 8,
                          background: "rgba(0,0,0,0.05)",
                          borderRadius: 4,
                          fontSize: "0.8rem",
                          margin: 0,
                          marginTop: 4,
                        }}
                      >
                        {JSON.stringify(getCurrentRawPrompt(), null, 2)}
                      </pre>
                    )}
                    {hasTextPrompt && (
                      <Box
                        sx={{
                          maxHeight: "150px",
                          overflowY: "auto",
                          p: 1,
                          background: "rgba(0,0,0,0.05)",
                          borderRadius: 1,
                          fontSize: "0.8rem",
                          mt: 0.5,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {getCurrentTextPrompt()}
                      </Box>
                    )}
                  </>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
};
