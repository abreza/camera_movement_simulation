import { useState, useRef, useEffect, useCallback } from "react";
import { handleDownloadSimulationData } from "@/utils/simulationUtils";
import {
  CinematographyInstruction,
  Subject,
  CameraFrame,
} from "@/types/simulation";
import * as THREE from "three";
import { Renderer } from "@/service/rendering/Renderer";
import { calculateCameraPositions } from "@/service/camera/calculatePositions";

const useSimulation = (initSubjects: Subject[]) => {
  const cameraViewRef = useRef<HTMLDivElement>(null);
  const worldViewRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);

  const [instructions, setInstructions] = useState<CinematographyInstruction[]>(
    []
  );
  const [subjects, setSubjects] = useState<Subject[]>(initSubjects);
  const [cameraFrames, setCameraFrames] = useState<CameraFrame[]>([
    {
      position: new THREE.Vector3(5, 5, 15),
      angle: new THREE.Euler(0, 0, 0),
      focalLength: 50,
    },
  ]);
  const [isRendering, setIsRendering] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [fps, setFps] = useState(30);

  useEffect(() => {
    setSubjects(initSubjects);
  }, [initSubjects]);

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

  const handleAddInstruction = (instruction: CinematographyInstruction) => {
    setInstructions((prevInstructions) => [...prevInstructions, instruction]);
  };

  const handleEditInstruction = (
    index: number,
    instruction: CinematographyInstruction
  ) => {
    setInstructions((prevInstructions) => {
      const newInstructions = [...prevInstructions];
      newInstructions[index] = instruction;
      return newInstructions;
    });
  };

  const handleDeleteInstruction = (index: number) => {
    setInstructions((prevInstructions) =>
      prevInstructions.filter((_, i) => i !== index)
    );
  };

  const handleImportCameraFrames = (importedCameraFrames: CameraFrame[]) => {
    setCameraFrames(importedCameraFrames);
    setInstructions([]);
    setSubjects([]);
    setIsRendering(true);
  };

  const addSubject = (subject: Subject) => {
    setSubjects((prevSubjects) => [...prevSubjects, subject]);
  };

  const simulate = () => {
    const frames = calculateCameraPositions(subjects, instructions);
    setCameraFrames(frames);
  };

  const renderSimulationData = () => {
    simulate();
    setIsRendering(true);
  };

  const render = useCallback(() => {
    if (!rendererRef.current) return;
    const frame = cameraFrames[currentFrame];
    rendererRef.current.updateScene(
      frame.position,
      frame.angle,
      frame.focalLength,
      subjects
    );
    rendererRef.current.render();
  }, [cameraFrames, currentFrame, subjects]);

  useEffect(() => {
    const renderInterval = setInterval(() => {
      render();
    }, 10);
    const frameCountInterval = setInterval(() => {
      if (isRendering) {
        setCurrentFrame((prevFrame) => {
          if (prevFrame < cameraFrames.length - 1) {
            return prevFrame + 1;
          } else {
            return 0;
          }
        });
      }
    }, 1000 / fps);

    return () => {
      clearInterval(renderInterval);
      clearInterval(frameCountInterval);
    };
  }, [render, isRendering, fps, cameraFrames.length]);

  const downloadSimulationData = () => {
    simulate();
    const simulationData = {
      subjects,
      instructions,
      cameraFrames,
    };
    handleDownloadSimulationData(simulationData);
  };

  return {
    cameraViewRef,
    worldViewRef,
    instructions,
    subjects,
    handleAddInstruction,
    handleEditInstruction,
    handleDeleteInstruction,
    handleImportCameraFrames,
    addSubject,
    renderSimulationData,
    downloadSimulationData,
    isRendering,
    setIsRendering,
    currentFrame,
    cameraFrames,
    fps,
    setFps,
    setCurrentFrame,
  };
};

export default useSimulation;
