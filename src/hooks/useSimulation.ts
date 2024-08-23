import { useState, useRef, useEffect } from "react";
import { handleDownloadSimulationData } from "@/utils/simulationUtils";
import {
  CinematographyInstruction,
  Subject,
  CameraFrame,
} from "@/types/simulation";
import * as THREE from "three";
import { Renderer } from "@/service/Renderer";
import { calculateCameraPositions } from "@/service/PositionCalculator";
import { INITIAL_SUBJECTS } from "@/app/constants";

const useSimulation = () => {
  const cameraViewRef = useRef<HTMLDivElement>(null);
  const worldViewRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);

  const [instructions, setInstructions] = useState<CinematographyInstruction[]>(
    []
  );
  const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [cameraFrames, setCameraFrames] = useState<CameraFrame[]>([]);
  const [isRendering, setIsRendering] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);

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

  const addSubject = (subject: Subject) => {
    setSubjects((prevSubjects) => [...prevSubjects, subject]);
  };

  const simulate = () => {
    const initialPosition = new THREE.Vector3(0, 0, 10);
    const initialLookAt = new THREE.Vector3(0, 0, 0);
    const frames = calculateCameraPositions(
      subjects,
      instructions,
      initialPosition,
      initialLookAt
    );
    setCameraFrames(frames);
    setCurrentFrame(0);
  };

  useEffect(() => {
    if (!rendererRef.current) return;

    const initialPosition = new THREE.Vector3(0, 0, 10);
    const initialLookAt = new THREE.Vector3(0, 0, 0);
    const initialFocalLength = 50;

    rendererRef.current.updateScene(
      initialPosition,
      initialLookAt,
      initialFocalLength,
      subjects
    );
    rendererRef.current.render();

    const frames = calculateCameraPositions(
      subjects,
      instructions,
      initialPosition,
      initialLookAt,
      initialFocalLength
    );
    setCameraFrames(frames);
    setCurrentFrame(0);
  }, [subjects, instructions]);

  const renderSimulationData = () => {
    if (!isRendering || !rendererRef.current || cameraFrames.length === 0)
      return;

    const frame = cameraFrames[currentFrame];
    rendererRef.current.updateScene(
      frame.position,
      frame.lookAt,
      frame.focalLength,
      subjects
    );
    rendererRef.current.render();

    setCurrentFrame((prevFrame) => {
      if (prevFrame < cameraFrames.length - 1) {
        return prevFrame + 1;
      } else {
        setIsRendering(false);
        return 0;
      }
    });
  };

  useEffect(() => {
    if (isRendering) {
      const animationId = requestAnimationFrame(renderSimulationData);
      return () => cancelAnimationFrame(animationId);
    }
  }, [isRendering, currentFrame]);

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
    addSubject,
    renderSimulationData: () => {
      simulate();
      setIsRendering(true);
    },
    downloadSimulationData,
  };
};

export default useSimulation;
