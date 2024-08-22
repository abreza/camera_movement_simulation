"use client";

import { FC, useState } from "react";
import { Box } from "@mui/material";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import useSimulation from "@/hooks/useSimulation";
import { INITIAL_SUBJECTS } from "./constants";

const CameraMovementSimulation: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    cameraViewRef,
    worldViewRef,
    instructions,
    subjects,
    handleAddInstruction,
    renderSimulationData,
    downloadSimulationData,
  } = useSimulation();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar
        open={sidebarOpen}
        subjects={subjects}
        instructions={instructions}
        onClose={() => setSidebarOpen(false)}
        onAddInstruction={handleAddInstruction}
        renderSimulationData={renderSimulationData}
        downloadSimulationData={downloadSimulationData}
      />
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Box ref={cameraViewRef} sx={{ height: "calc(100vh - 64px)" }}></Box>
      </Box>
      <Box
        ref={worldViewRef}
        sx={{
          position: "fixed",
          bottom: 20,
          right: 20,
          width: 288,
          height: 288,
          border: "2px solid #ccc",
          borderRadius: 2,
          overflow: "hidden",
          boxShadow: 3,
        }}
      ></Box>
    </Box>
  );
};

export default CameraMovementSimulation;
