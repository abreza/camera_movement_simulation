import { useState, useRef, useEffect, useCallback } from "react";
import { handleDownloadSimulationData } from "@/utils/simulationUtils";
import {
  CameraParameters,
  CinematographyInstruction,
  SubjectInfo,
} from "@/types/simulation";
import * as THREE from "three";
import { Renderer } from "@/service/rendering/Renderer";
import { calculateCameraPositions } from "@/service/camera";

const useSimulation = (initSubjectsInfo: SubjectInfo[]) => {
  const cameraViewRef = useRef<HTMLDivElement>(null);
  const worldViewRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);

  const [instructions, setInstructions] = useState<CinematographyInstruction[]>(
    []
  );
  const [subjectsInfo, setSubjectsInfo] =
    useState<SubjectInfo[]>(initSubjectsInfo);
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
    setSubjectsInfo(initSubjectsInfo);
  }, [initSubjectsInfo]);

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

  const handleImportCameraFrames = (
    importedCameraFrames: CameraParameters[]
  ) => {
    setCameraFrames(importedCameraFrames);
    setInstructions([]);
    setSubjectsInfo([]);
    setIsRendering(true);
  };

  const addSubject = (subjectInfo: SubjectInfo) => {
    setSubjectsInfo((prevSubjects) => [...prevSubjects, subjectInfo]);
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
    if (subjectsInfo.length > 0) {
      rendererRef.current?.initSubjects(subjectsInfo);
    }
  }, [subjectsInfo]);

  const render = useCallback(() => {
    if (!rendererRef.current) return;
    const frame = cameraFrames[currentFrame];
    rendererRef.current.updateScene(
      frame.position,
      frame.rotation,
      frame.focalLength,
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
