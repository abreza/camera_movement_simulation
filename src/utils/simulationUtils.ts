import { Subject, Instruction, CameraFrame } from "@/types/simulation";
import * as THREE from "three";

interface SimulationData {
  subjects: Subject[];
  instructions: Instruction[];
  cameraFrames: CameraFrame[];
}

export const handleDownloadSimulationData = (
  simulationData: SimulationData
): void => {
  const jsonData = JSON.stringify(
    simulationData,
    (key, value) => {
      if (value instanceof THREE.Vector3) {
        return { x: value.x, y: value.y, z: value.z };
      }
      return value;
    },
    2
  );

  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "simulation_data.json";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
