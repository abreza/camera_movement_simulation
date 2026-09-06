"use client";

import { FC, useRef, useEffect, useCallback, useState } from "react";
import {
  Box,
  Slider,
  TextField,
  Stack,
  Fab,
  Typography,
  alpha,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  SkipPrevious as SkipPrevIcon,
  SkipNext as SkipNextIcon,
  RouteOutlined as CameraPathIcon,
  DirectionsRunOutlined as SubjectPathIcon,
} from "@mui/icons-material";
import { Settings } from "@/components/layout/settings/Settings";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  setSidebarOpen,
  setShowCameraPath,
  setShowSubjectPaths,
} from "@/redux/slices/uiSlice";
import {
  setCurrentFrame,
  setFps,
  setIsRendering,
} from "@/redux/slices/cameraSlice";
import { Renderer } from "@/service/rendering/Renderer";
import { SubjectFrameInfo } from "@/service/subjects/types";
import { usePlacementBridge } from "@/hooks/usePlacementBridge";

import { InferenceInfo } from "@/components/layout/inference/info";

const CameraMovementSimulation: FC = () => {
  const dispatch = useAppDispatch();

  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const showCameraPath = useAppSelector((state) => state.ui.showCameraPath);
  const showSubjectPaths = useAppSelector((state) => state.ui.showSubjectPaths);
  const cameraFrames = useAppSelector((state) => state.camera.cameraFrames);
  const currentFrame = useAppSelector((state) => state.camera.currentFrame);
  const fps = useAppSelector((state) => state.camera.fps);
  const isRendering = useAppSelector((state) => state.camera.isRendering);
  const subjectsInfo = useAppSelector((state) => state.subjects.subjectsInfo);
  const sourceData = useAppSelector((state) => state.camera.sourceData);

  const worldViewRef = useRef<HTMLDivElement>(null);
  const cameraViewRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);

  // Keep renderer in state so hooks that depend on it can re-run
  // when it becomes available (useRef changes don't trigger re-renders).
  const [renderer, setRenderer] = useState<Renderer | null>(null);

  useEffect(() => {
    if (cameraViewRef.current && worldViewRef.current) {
      const r = new Renderer(cameraViewRef.current, worldViewRef.current);
      rendererRef.current = r;
      setRenderer(r);
    }
    return () => {
      if (rendererRef.current) {
        rendererRef.current.unmount();
        rendererRef.current = null;
        setRenderer(null);
      }
    };
  }, []);

  usePlacementBridge(renderer);

  useEffect(() => {
    if (cameraFrames.length > 0 && rendererRef.current) {
      rendererRef.current.sceneManager?.updateCameraFrames(cameraFrames);
    }
  }, [cameraFrames]);

  useEffect(() => {
    if (rendererRef.current && subjectsInfo) {
      rendererRef.current.updateSubjectTrajectories(subjectsInfo);
    }
  }, [subjectsInfo]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setCameraTrajectoryVisibility(showCameraPath);
    }
  }, [showCameraPath]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setSubjectTrajectoryVisibility(showSubjectPaths);
    }
  }, [showSubjectPaths]);

  const render = useCallback(() => {
    if (!rendererRef.current) return;
    const frame = cameraFrames[currentFrame];
    if (!frame) return;

    const subjectFrameInfo: SubjectFrameInfo[] = subjectsInfo.map(
      ({ subject, frames }) => ({
        subject,
        frame: frames?.[Math.min(currentFrame, frames.length - 1)],
      })
    );

    rendererRef.current.updateScene(frame, subjectFrameInfo);
    rendererRef.current.render();
  }, [cameraFrames, currentFrame, subjectsInfo]);

  useEffect(() => {
    const renderInterval = setInterval(() => {
      render();
    }, 10);

    const frameCountInterval = setInterval(() => {
      if (isRendering) {
        dispatch(
          setCurrentFrame(
            currentFrame < cameraFrames.length - 1 ? currentFrame + 1 : 0
          )
        );
      }
    }, 1000 / fps);

    return () => {
      clearInterval(renderInterval);
      clearInterval(frameCountInterval);
    };
  }, [render, isRendering, fps, cameraFrames.length, dispatch, currentFrame]);

  const handleSliderChange = (_: Event, value: number | number[]) => {
    dispatch(setIsRendering(false));
    dispatch(setCurrentFrame(value as number));
  };

  const hasFrames = cameraFrames.length > 1;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background:
          "linear-gradient(145deg, #0F0F1A 0%, #161628 50%, #0F0F1A 100%)",
      }}
    >
      <Settings
        open={sidebarOpen}
        onClose={() => dispatch(setSidebarOpen(false))}
      />
      <Box
        sx={{
          position: "fixed",
          top: 20,
          left: 20,
          zIndex: 10,
          display: "flex",
          gap: 1,
          backgroundColor: alpha("#1A1A2E", 0.6),
          backdropFilter: "blur(8px)",
          padding: "8px",
          borderRadius: "12px",
          border: `1px solid ${alpha("#FFFFFF", 0.08)}`,
        }}
      >
        <Tooltip title="Toggle Camera Path" placement="bottom">
          <IconButton
            size="small"
            onClick={() => dispatch(setShowCameraPath(!showCameraPath))}
            sx={{
              color: showCameraPath ? "#4EA8DE" : alpha("#FFFFFF", 0.3),
              backgroundColor: showCameraPath ? alpha("#4EA8DE", 0.1) : "transparent",
              "&:hover": {
                backgroundColor: showCameraPath ? alpha("#4EA8DE", 0.2) : alpha("#FFFFFF", 0.05),
              },
            }}
          >
            <CameraPathIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Toggle Subject Paths" placement="bottom">
          <IconButton
            size="small"
            onClick={() => dispatch(setShowSubjectPaths(!showSubjectPaths))}
            sx={{
              color: showSubjectPaths ? "#6BCB77" : alpha("#FFFFFF", 0.3),
              backgroundColor: showSubjectPaths ? alpha("#6BCB77", 0.1) : "transparent",
              "&:hover": {
                backgroundColor: showSubjectPaths ? alpha("#6BCB77", 0.2) : alpha("#FFFFFF", 0.05),
              },
            }}
          >
            <SubjectPathIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box ref={worldViewRef} sx={{ flex: 1, position: "relative" }} />
      <Box
        ref={cameraViewRef}
        sx={{
          position: "fixed",
          bottom: hasFrames ? 100 : 20,
          right: 20,
          width: "20%",
          height: "20%",
          border: `1.5px solid ${alpha("#FFFFFF", 0.12)}`,
          borderRadius: 2,
          overflow: "hidden",
          boxShadow: `0 8px 32px ${alpha("#000000", 0.5)}`,
          display: hasFrames ? "block" : "none",
          transition: "bottom 0.3s ease",
          zIndex: 5,
        }}
      />
      {sourceData?.trajectories && <InferenceInfo />}
      {hasFrames && (
        <Box
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: `linear-gradient(to top, ${alpha("#0F0F1A", 0.95)} 0%, ${alpha("#0F0F1A", 0.8)} 70%, transparent 100%)`,
            backdropFilter: "blur(8px)",
            px: 3,
            pb: 2,
            pt: 5,
          }}
        >
          <Box sx={{ px: 1, mb: 1 }}>
            <Slider
              value={currentFrame}
              onChange={handleSliderChange}
              min={0}
              max={cameraFrames.length - 1}
              sx={{
                "& .MuiSlider-thumb": {
                  width: 12,
                  height: 12,
                  "&:hover, &.Mui-active": {
                    width: 16,
                    height: 16,
                  },
                },
                "& .MuiSlider-rail": {
                  height: 3,
                },
                "& .MuiSlider-track": {
                  height: 3,
                },
              }}
            />
          </Box>
          <Stack
            direction="row"
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.68rem",
                minWidth: 100,
              }}
            >
              {currentFrame + 1}{" "}
              <span style={{ opacity: 0.4 }}>/ {cameraFrames.length}</span>
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
              <Tooltip title="Previous frame">
                <IconButton
                  size="small"
                  onClick={() => {
                    dispatch(setIsRendering(false));
                    dispatch(
                      setCurrentFrame(Math.max(0, currentFrame - 1))
                    );
                  }}
                  sx={{ color: "text.secondary" }}
                >
                  <SkipPrevIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton
                onClick={() => dispatch(setIsRendering(!isRendering))}
                sx={{
                  color: "#FFF",
                  backgroundColor: isRendering
                    ? alpha("#E8753A", 0.2)
                    : alpha("#E8753A", 0.9),
                  width: 40,
                  height: 40,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: isRendering
                      ? alpha("#E8753A", 0.3)
                      : "#E8753A",
                    transform: "scale(1.05)",
                  },
                }}
              >
                {isRendering ? (
                  <PauseIcon fontSize="small" />
                ) : (
                  <PlayIcon fontSize="small" />
                )}
              </IconButton>
              <Tooltip title="Next frame">
                <IconButton
                  size="small"
                  onClick={() => {
                    dispatch(setIsRendering(false));
                    dispatch(
                      setCurrentFrame(
                        Math.min(cameraFrames.length - 1, currentFrame + 1)
                      )
                    );
                  }}
                  sx={{ color: "text.secondary" }}
                >
                  <SkipNextIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", fontSize: "0.68rem" }}
              >
                FPS
              </Typography>
              <TextField
                type="number"
                value={fps}
                onChange={(e) => dispatch(setFps(Number(e.target.value)))}
                slotProps={{ htmlInput: { min: 1, max: 60 } }}
                sx={{
                  width: 56,
                  "& .MuiOutlinedInput-root": {
                    height: 28,
                    "& input": {
                      p: "4px 8px",
                      fontSize: "0.75rem",
                      fontFamily: "'JetBrains Mono', monospace",
                      textAlign: "center",
                    },
                  },
                }}
                size="small"
              />
            </Stack>
          </Stack>
        </Box>
      )}
      <Tooltip title="Open Settings" placement="right">
        <Fab
          size="medium"
          sx={{
            position: "fixed",
            bottom: hasFrames ? 100 : 20,
            left: 20,
            transition: "bottom 0.3s ease",
          }}
          onClick={() => dispatch(setSidebarOpen(true))}
        >
          <SettingsIcon />
        </Fab>
      </Tooltip>
    </Box>
  );
};

export default CameraMovementSimulation;
