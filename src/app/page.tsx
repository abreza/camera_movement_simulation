"use client";

import { FC, useRef, useEffect, useCallback } from "react";
import { Box, Slider, TextField, Button, Stack, Fab } from "@mui/material";
import { Settings as SettingsIcon } from "@mui/icons-material";
import { Settings } from "@/components/layout/settings/Settings";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setSidebarOpen } from "@/redux/slices/uiSlice";
import {
  setCurrentFrame,
  setFps,
  setIsRendering,
} from "@/redux/slices/cameraSlice";
import { Renderer } from "@/service/rendering/Renderer";
import { SubjectFrameInfo } from "@/service/subjects/types";

const CameraMovementSimulation: FC = () => {
  const dispatch = useAppDispatch();

  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const cameraFrames = useAppSelector((state) => state.camera.cameraFrames);
  const currentFrame = useAppSelector((state) => state.camera.currentFrame);
  const fps = useAppSelector((state) => state.camera.fps);
  const isRendering = useAppSelector((state) => state.camera.isRendering);
  const subjectsInfo = useAppSelector((state) => state.subjects.subjectsInfo);

  const worldViewRef = useRef<HTMLDivElement>(null);
  const cameraViewRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);

  useEffect(() => {
    if (cameraViewRef.current && worldViewRef.current) {
      rendererRef.current = new Renderer(
        cameraViewRef.current,
        worldViewRef.current
      );
    }

    return () => {
      if (rendererRef.current) {
        rendererRef.current.unmount();
      }
    };
  }, []);

  useEffect(() => {
    if (subjectsInfo.length > 0 && rendererRef.current) {
      rendererRef.current.initSubjects(subjectsInfo);
    }
  }, [subjectsInfo]);

  const render = useCallback(() => {
    if (!rendererRef.current) return;
    const frame = cameraFrames[currentFrame];

    const subjectFrameInfo: SubjectFrameInfo[] = subjectsInfo.map(
      ({ subject, frames }) => ({
        subject,
        frame: frames?.[currentFrame],
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

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Settings
        open={sidebarOpen}
        onClose={() => dispatch(setSidebarOpen(false))}
      />
      <Box ref={worldViewRef} sx={{ height: "calc(100vh - 200px)" }}></Box>
      <Box
        ref={cameraViewRef}
        sx={{
          position: "fixed",
          bottom: 20,
          right: 20,
          width: "20%",
          height: "20%",
          border: "2px solid #ccc",
          borderRadius: 2,
          overflow: "hidden",
          boxShadow: 3,
          display: cameraFrames.length > 1 ? "block" : "none",
        }}
      ></Box>
      {cameraFrames.length > 1 && (
        <Stack
          sx={{
            position: "fixed",
            top: 100,
            width: "100%",
            p: 3,
          }}
          direction="row"
          alignItems="center"
          spacing={2}
        >
          <TextField
            type="number"
            label="FPS"
            value={fps}
            onChange={(e) => dispatch(setFps(Number(e.target.value)))}
            inputProps={{ min: 1, max: 60 }}
            sx={{ width: 100 }}
            size="small"
            color="primary"
          />
          <Slider
            value={currentFrame}
            onChange={handleSliderChange}
            min={0}
            max={cameraFrames.length - 1}
            valueLabelDisplay="auto"
            sx={{ flexGrow: 1 }}
          />
          <Button
            variant="contained"
            onClick={() => dispatch(setIsRendering(!isRendering))}
          >
            {isRendering ? "Pause" : "Play"}
          </Button>
        </Stack>
      )}
      <Fab
        sx={{
          position: "absolute",
          bottom: 16,
          left: 16,
        }}
        onClick={() => dispatch(setSidebarOpen(true))}
      >
        <SettingsIcon />
      </Fab>
    </Box>
  );
};

export default CameraMovementSimulation;
