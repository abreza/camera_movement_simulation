import * as THREE from "three";
import {
  CinematographyInstruction,
  CameraAngle,
  ShotType,
  CameraMovement,
  MovementEasing,
} from "@/types/simulation";
import { calculateCameraPositions } from "@/service/camera/calculatePositions";
import { generateSubjects } from "../subjects/generateSubjects";

function getRandomEnum<T extends Record<string, unknown>>(
  anEnum: T
): T[keyof T] {
  const enumValues = Object.values(anEnum) as T[keyof T][];
  const randomIndex = Math.floor(Math.random() * enumValues.length);
  return enumValues[randomIndex];
}

export interface GenerateRandomDatasetOptions {
  simulationCount: number;
  subjectCount?: number;
  instructionCount?: number;
  minFrameCount?: number;
  maxFrameCount?: number;
  initialCameraPosition?: THREE.Vector3;
  initialCameraAngle?: THREE.Euler;
  initialFocalLength?: number;
}

interface Simulation {
  subjects: any[]; // Replace 'any' with your actual Subject type
  instructions: CinematographyInstruction[];
  cameraFrames: any[]; // Replace 'any' with your actual CameraFrame type
}

export function generateRandomDataset(
  options: GenerateRandomDatasetOptions
): void {
  const {
    simulationCount,
    subjectCount = Math.floor(Math.random() * 5) + 1,
    instructionCount = Math.floor(Math.random() * 5) + 1,
    minFrameCount = 30,
    maxFrameCount = 120,
    initialCameraPosition = new THREE.Vector3(0, 0, 10),
    initialCameraAngle = new THREE.Euler(0, 0, 0),
    initialFocalLength = 50,
  } = options;

  const simulations: Simulation[] = [];

  for (let s = 0; s < simulationCount; s++) {
    const randomSubjects = generateSubjects(subjectCount);

    const randomInstructions: CinematographyInstruction[] = [];
    for (let i = 0; i < instructionCount; i++) {
      randomInstructions.push({
        cameraMovement: getRandomEnum(CameraMovement),
        movementEasing: getRandomEnum(MovementEasing),
        frameCount:
          Math.floor(Math.random() * (maxFrameCount - minFrameCount + 1)) +
          minFrameCount,
        initialCameraAngle:
          Math.random() > 0.5 ? getRandomEnum(CameraAngle) : undefined,
        initialShotType:
          Math.random() > 0.5 ? getRandomEnum(ShotType) : undefined,
        subjectIndex:
          Math.random() > 0.5
            ? Math.floor(Math.random() * randomSubjects.length)
            : undefined,
      });
    }

    const randomCameraFrames = calculateCameraPositions(
      randomSubjects,
      randomInstructions,
      {
        position: initialCameraPosition,
        angle: initialCameraAngle,
        focalLength: initialFocalLength,
      }
    );

    simulations.push({
      subjects: randomSubjects,
      instructions: randomInstructions,
      cameraFrames: randomCameraFrames,
    });
  }

  const randomDataset = {
    simulations: simulations,
    metadata: {
      simulationCount,
      subjectCount,
      instructionCount,
      minFrameCount,
      maxFrameCount,
      initialCameraPosition: initialCameraPosition.toArray(),
      initialCameraAngle: initialCameraAngle.toArray(),
      initialFocalLength,
    },
  };

  const jsonString = JSON.stringify(
    randomDataset,
    (key, value) => {
      if (value instanceof THREE.Vector3) {
        return { x: value.x, y: value.y, z: value.z };
      }
      if (value instanceof THREE.Euler) {
        return { x: value.x, y: value.y, z: value.z };
      }
      return value;
    },
    2
  );

  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "random_simulation_dataset.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
