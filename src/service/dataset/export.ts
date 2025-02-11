import { encode } from "msgpackr";
import {
  CinematographyPrompt,
  SimulationInstruction,
  CameraParameters,
} from "../simulation/instruction/types";
import { SubjectInfo } from "../subjects/types";

export interface SimulationData {
  subjectsInfo: SubjectInfo[];
  cinematographyPrompts: CinematographyPrompt[];
  simulationInstructions: SimulationInstruction[];
  cameraFrames: CameraParameters[];
}

function roundFloats(obj: any, factor = 1000): any {
  if (obj?.isVector3 || obj?.isEuler) {
    return roundFloats({ x: obj.x, y: obj.y, z: obj.z });
  } else if (typeof obj === "number") {
    return Math.round(obj * factor);
  } else if (Array.isArray(obj)) {
    return obj.map((item) => roundFloats(item, factor));
  } else if (obj && typeof obj === "object") {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = roundFloats(obj[key], factor);
    }
    return result;
  }

  return obj;
}

export const exportDataset = async (dataset: SimulationData[]) => {
  const datasetRounded = roundFloats(dataset);

  const binaryData = encode(datasetRounded);

  const blob = new Blob([binaryData], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cinematography_dataset.mpack";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
