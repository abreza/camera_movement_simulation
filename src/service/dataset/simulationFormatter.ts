import { CameraParameters } from "../simulation/instruction/types";
import { SubjectInfo } from "../subjects/types";
import { SimulationData } from "./types";
import {
  ParameterDictionary,
  updateParameterDictionary,
  createParameterReference,
} from "./parameterDictionary";

type SubjectCompressed = {
  i: string;
  c: string;
  d: number[];
  a?: number[];
  f: number[][];
  m: string;
};

function compressFormatSubjectInfo(
  subjectsInfo: SubjectInfo[]
): SubjectCompressed[] {
  return subjectsInfo.map(({ subject, frames, movementType }) => {
    const formattedInfo: SubjectCompressed = {
      i: subject.id,
      c: subject.class,
      d: [
        subject.dimensions.width,
        subject.dimensions.height,
        subject.dimensions.depth,
      ],
      f:
        frames?.map((frame) => [
          frame.position.x,
          frame.position.y,
          frame.position.z,
          frame.rotation.x,
          frame.rotation.y,
          frame.rotation.z,
        ]) || [],
      m: movementType,
    };

    if (subject.attentionBox) {
      formattedInfo.a = [
        subject.attentionBox.position.x,
        subject.attentionBox.position.y,
        subject.attentionBox.position.z,
        subject.attentionBox.dimensions.width,
        subject.attentionBox.dimensions.height,
        subject.attentionBox.dimensions.depth,
      ];
    }

    return formattedInfo;
  });
}

function compressCameraFrames(cameraFrames: CameraParameters[]): number[][] {
  return cameraFrames.map((frame) => [
    frame.position.x,
    frame.position.y,
    frame.position.z,
    frame.rotation.x,
    frame.rotation.y,
    frame.rotation.z,
    frame.focalLength,
    frame.aspectRatio,
  ]);
}

export function formatSimulationData(
  data: SimulationData,
  existingParameters: ParameterDictionary = { keys: [], values: [] }
): {
  formattedData: any;
  parameterDictionary: ParameterDictionary;
} {
  let parameterDictionary = updateParameterDictionary(
    data.cinematographyPrompts,
    existingParameters,
    "cinematography"
  );
  parameterDictionary = updateParameterDictionary(
    data.simulationInstructions,
    parameterDictionary,
    "simulation"
  );

  const cinematographyRef = createParameterReference(
    data.cinematographyPrompts,
    parameterDictionary,
    "cinematography"
  );

  const simulationRef = createParameterReference(
    data.simulationInstructions,
    parameterDictionary,
    "simulation"
  );

  const formattedData = [
    cinematographyRef,
    simulationRef,
    compressFormatSubjectInfo(roundFloats(data.subjectsInfo)),
    compressCameraFrames(roundFloats(data.cameraFrames)),
  ];

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
