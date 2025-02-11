import { CameraParameters } from "../simulation/instruction/types";
import { SubjectInfo } from "../subjects/types";
import { SimulationData } from "./types";
import {
  ParameterDictionary,
  updateParameterDictionary,
  createParameterReference,
} from "./parameterDictionary";

function formatSubjectInfoToString(subjectsInfo: SubjectInfo[]): string {
  const lines: string[] = [];

  for (const info of subjectsInfo) {
    const { subject, frames } = info;

    const basicInfo = `${subject.id},${subject.class}`;
    lines.push(basicInfo);

    const dimensions = `${subject.dimensions.width},${subject.dimensions.height},${subject.dimensions.depth}`;
    lines.push(dimensions);

    if (subject.attentionBox) {
      const { position, dimensions } = subject.attentionBox;
      const attentionBox = `${position.x},${position.y},${position.z},${dimensions.width},${dimensions.height},${dimensions.depth}`;
      lines.push(attentionBox);
    } else {
      lines.push("");
    }

    if (frames && frames.length > 0) {
      const frameData = frames
        .map(
          (frame) =>
            `${frame.position.x},${frame.position.y},${frame.position.z},` +
            `${frame.rotation.x},${frame.rotation.y},${frame.rotation.z}`
        )
        .join("|");
      lines.push(frameData);
    } else {
      lines.push("");
    }

    lines.push("---");
  }

  return lines.join("\n");
}

function formatCameraFramesToString(cameraFrames: CameraParameters[]): string {
  return cameraFrames
    .map(
      (frame) =>
        `${frame.position.x},${frame.position.y},${frame.position.z},` +
        `${frame.rotation.x},${frame.rotation.y},${frame.rotation.z},` +
        `${frame.focalLength},${frame.aspectRatio}`
    )
    .join("|");
}

export function formatSimulationData(
  data: SimulationData,
  existingParameters: ParameterDictionary = { keys: [], values: [] }
): {
  formattedData: string;
  parameterDictionary: ParameterDictionary;
} {
  const parameterDictionary = updateParameterDictionary(
    [...data.cinematographyPrompts, ...data.simulationInstructions],
    existingParameters
  );

  const cinematographyRef = createParameterReference(
    data.cinematographyPrompts,
    parameterDictionary
  );

  const simulationRef = createParameterReference(
    data.simulationInstructions,
    parameterDictionary
  );

  const formattedData = `${cinematographyRef}
*
${simulationRef}
*
${formatSubjectInfoToString(roundFloats(data.subjectsInfo))}
*
${formatCameraFramesToString(roundFloats(data.cameraFrames))}`;

  return {
    formattedData,
    parameterDictionary,
  };
}

export function roundFloats(obj: any, factor = 1000): any {
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
