"use client";

import { FC, useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import * as THREE from "three";
import { Instruction } from "@/types/instruction";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Slider";
import { PositionCalculator } from "@/service/PositionCalculator";
import { Renderer } from "@/service/Renderer";
import { InstructionManager } from "@/service/InstructionManager";

const CameraMovementSimulation: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [frameCount, setFrameCount] = useState(60);
  const appRef = useRef<{
    positionCalculator: PositionCalculator;
    renderer: Renderer;
    instructionManager: InstructionManager;
    isSimulating: boolean;
    simulationData: any[];
    currentFrame: number;
  } | null>(null);

  useEffect(() => {
    const positionCalculator = new PositionCalculator();
    const renderer = new Renderer();
    const instructionManager = new InstructionManager(positionCalculator);

    appRef.current = {
      positionCalculator,
      renderer,
      instructionManager,
      isSimulating: false,
      simulationData: [],
      currentFrame: 0,
    };

    setupInitialSubjects();
    animate();

    return () => {
      renderer.unmount();
    };
  }, []);

  const setupInitialSubjects = () => {
    if (appRef.current) {
      appRef.current.positionCalculator.addSubject(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 1, 1)
      );
      appRef.current.positionCalculator.addSubject(
        new THREE.Vector3(3, 0, 0),
        new THREE.Vector3(1, 1, 1)
      );
      appRef.current.positionCalculator.addSubject(
        new THREE.Vector3(-3, 0, 0),
        new THREE.Vector3(1, 1, 1)
      );
    }
  };

  const animate = () => {
    if (appRef.current) {
      const {
        isSimulating,
        simulationData,
        currentFrame,
        positionCalculator,
        renderer,
      } = appRef.current;

      if (isSimulating) {
        const frame = simulationData[currentFrame];
        updateSceneFromFrame(frame);
        appRef.current.currentFrame = (currentFrame + 1) % frameCount;
      } else {
        const cameraPosition = positionCalculator.getCameraPosition();
        const cameraLookAt = positionCalculator.getCameraLookAt();
        const subjects = positionCalculator.getSubjects();
        renderer.updateScene(cameraPosition, cameraLookAt, subjects);
      }

      renderer.render();
    }
    requestAnimationFrame(animate);
  };

  const updateSceneFromFrame = (frame: any) => {
    if (appRef.current) {
      const cameraPosition = new THREE.Vector3().fromArray(
        frame.cameraPosition
      );
      const cameraLookAt = new THREE.Vector3().fromArray(frame.cameraLookAt);
      const subjects = frame.subjects.map((subject: any) => ({
        position: new THREE.Vector3().fromArray(subject.position),
        size: new THREE.Vector3().fromArray(subject.size),
      }));

      appRef.current.renderer.updateScene(
        cameraPosition,
        cameraLookAt,
        subjects
      );
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleAddInstruction = (instruction: Instruction) => {
    setInstructions([...instructions, instruction]);
    if (appRef.current) {
      appRef.current.instructionManager.addInstruction(
        `${instruction.type},${instruction.subject},${instruction.duration}`
      );
    }
  };

  const handleSimulate = () => {
    if (appRef.current?.instructionManager.hasInstructions()) {
      if (frameCount < 1) {
        alert("Please enter a valid frame count (minimum 1)");
        return;
      }
      captureAllFrames();
    }
  };

  const captureAllFrames = () => {
    if (appRef.current) {
      appRef.current.simulationData = [];
      appRef.current.instructionManager.startSimulation();

      for (let i = 0; i < frameCount; i++) {
        const progress = i / (frameCount - 1);
        appRef.current.instructionManager.updateToProgress(progress);
        captureFrame(i);
      }

      appRef.current.isSimulating = true;
      appRef.current.currentFrame = 0;
    }
  };

  const captureFrame = (frameNumber: number) => {
    if (appRef.current) {
      const { positionCalculator } = appRef.current;
      const cameraPosition = positionCalculator.getCameraPosition();
      const cameraLookAt = positionCalculator.getCameraLookAt();
      const subjects = positionCalculator.getSubjects();

      appRef.current.simulationData.push({
        frame: frameNumber,
        cameraPosition: cameraPosition.toArray(),
        cameraLookAt: cameraLookAt.toArray(),
        subjects: subjects.map((subject) => ({
          position: subject.position.toArray(),
          size: subject.size.toArray(),
        })),
      });
    }
  };

  const handleDownload = () => {
    if (appRef.current) {
      const jsonData = JSON.stringify(appRef.current.simulationData, null, 2);
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "simulation_data.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Navbar toggleSidebar={toggleSidebar} />
      <Sidebar
        open={sidebarOpen}
        onClose={toggleSidebar}
        onAddInstruction={handleAddInstruction}
        onSimulate={handleSimulate}
        onDownload={handleDownload}
        instructions={instructions}
        frameCount={frameCount}
        setFrameCount={setFrameCount}
      />
      <Box component="main" sx={{ flexGrow: 1 }}>
        <div
          id="canvas-container"
          style={{ height: "calc(100vh - 64px)" }}
        ></div>
      </Box>
      <Box
        id="world-view-container"
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
