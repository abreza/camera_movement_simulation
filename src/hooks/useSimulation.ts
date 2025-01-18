import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { handleDownloadSimulationData } from "@/utils/simulationUtils";
import {
  CameraParameters,
  SimulationInstruction,
} from "@/service/simulation/instruction/types";
import * as THREE from "three";
import { Renderer } from "@/service/rendering/Renderer";
import { calculateCameraPositions } from "@/service/simulation/optimization";
import { ObjectClass, Subject, SubjectFrame } from "@/service/subjects/types";
import { generateSubjects } from "@/service/subjects/generateSubjects";
import { generateFrames } from "@/service/subjects/generateFrames";

const useSimulation = () => {
  const cameraViewRef = useRef<HTMLDivElement>(null);
  const worldViewRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);

  const [instructions, setInstructions] = useState<SimulationInstruction[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectFrames, setSubjectFrames] = useState<SubjectFrame[][]>([]);

  const subjectsInfo = useMemo(
    () =>
      subjects.map((subject, index) => ({
        subject,
        frames: subjectFrames[index],
      })),
    [subjects, subjectFrames]
  );

  const [cameraFrames, setCameraFrames] = useState<CameraParameters[]>([
    {
      position: new THREE.Vector3(5, 5, 15),
      rotation: new THREE.Euler(0, 0, 0),
      focalLength: 50,
      aspectRatio: 16 / 9,
    },
  ]);
  const [isRendering, setIsRendering] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [fps, setFps] = useState(30);

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

  const handleGenerateSubjects = (
    count: number,
    probabilityFactors: Record<ObjectClass, number>
  ) => {
    const newSubjects = generateSubjects(count, probabilityFactors);
    setSubjects(newSubjects);
  };

  const handleUpdateMovements = (movements: Record<string, string>) => {
    const newFrames = generateFrames(subjects, movements);
    setSubjectFrames(newFrames);
  };

  const handleAddInstruction = (instruction: SimulationInstruction) => {
    setInstructions((prev) => [...prev, instruction]);
  };

  const handleEditInstruction = (
    index: number,
    instruction: SimulationInstruction
  ) => {
    setInstructions((prev) => {
      const newInstructions = [...prev];
      newInstructions[index] = instruction;
      return newInstructions;
    });
  };

  const handleDeleteInstruction = (index: number) => {
    setInstructions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImportCameraFrames = (
    importedCameraFrames: CameraParameters[]
  ) => {
    setCameraFrames(importedCameraFrames);
    setInstructions([]);
    setSubjects([]);
    setSubjectFrames([]);
    setIsRendering(true);
  };
  const simulate = () => {
    const frames = calculateCameraPositions(instructions, subjectsInfo);
    setCameraFrames(frames);
  };

  const renderSimulationData = () => {
    simulate();
    setIsRendering(true);
  };

  useEffect(() => {
    if (subjectsInfo.length > 0 && subjectFrames.length > 0) {
      rendererRef.current?.initSubjects(subjectsInfo);
    }
  }, [subjectsInfo]);

  const render = useCallback(() => {
    if (!rendererRef.current) return;
    const frame = cameraFrames[currentFrame];
    rendererRef.current.updateScene(
      frame,
      subjectsInfo.map(({ subject, frames }) => ({
        subject,
        frame: frames?.[currentFrame],
      }))
    );
    rendererRef.current.render();
  }, [cameraFrames, currentFrame, subjectsInfo]);

  useEffect(() => {
    const renderInterval = setInterval(() => {
      render();
    }, 10);
    const frameCountInterval = setInterval(() => {
      if (isRendering) {
        setCurrentFrame((prevFrame) =>
          prevFrame < cameraFrames.length - 1 ? prevFrame + 1 : 0
        );
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
      subjectsInfo,
      instructions,
      cameraFrames,
    };
    handleDownloadSimulationData(simulationData);
  };

  return {
    cameraViewRef,
    worldViewRef,
    instructions,
    subjectsInfo,
    handleGenerateSubjects,
    handleUpdateMovements,
    handleAddInstruction,
    handleEditInstruction,
    handleDeleteInstruction,
    handleImportCameraFrames,
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
