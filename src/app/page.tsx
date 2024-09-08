"use client";

import { FC, useState } from "react";
import { Box, Slider, TextField, Button, Stack, Fab } from "@mui/material";
import useSimulation from "@/hooks/useSimulation";
import { Settings as SettingsIcon } from "@mui/icons-material";
import { Settings } from "@/components/layout/settings/Settings";
import { generateSubjects } from "@/service/subjects/generateSubjects";
import { ObjectClass, Subject } from "@/types/simulation";

const CameraMovementSimulation: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const {
    cameraViewRef,
    worldViewRef,
    instructions,
    handleAddInstruction,
    handleEditInstruction,
    handleDeleteInstruction,
    renderSimulationData,
    downloadSimulationData,
    isRendering,
    setIsRendering,
    currentFrame,
    cameraFrames,
    fps,
    setFps,
    setCurrentFrame,
  } = useSimulation(subjects);

  const handleGenerateSubjects = (
    count: number,
    probabilityFactors: Record<ObjectClass, number>
  ) => {
    const newSubjects = generateSubjects(count, probabilityFactors);
    setSubjects(newSubjects);
  };

  const handleSliderChange = (_: Event, value: number | number[]) => {
    setIsRendering(false);
    setCurrentFrame(value as number);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Settings
        open={sidebarOpen}
        subjects={subjects}
        instructions={instructions}
        onClose={() => setSidebarOpen(false)}
        onAddInstruction={handleAddInstruction}
        onEditInstruction={handleEditInstruction}
        onDeleteInstruction={handleDeleteInstruction}
        onGenerateSubjects={handleGenerateSubjects}
        renderSimulationData={renderSimulationData}
        downloadSimulationData={downloadSimulationData}
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
            onChange={(e) => setFps(Number(e.target.value))}
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
            onClick={() => setIsRendering(!isRendering)}
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
        onClick={() => setSidebarOpen(true)}
      >
        <SettingsIcon />
      </Fab>
    </Box>
  );
};

export default CameraMovementSimulation;
