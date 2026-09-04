import { CameraParameters } from "../simulation/instruction/types";
import { SubjectInfo } from "../subjects/types";
import { SimulationData } from "./types";
import {
  ParameterDictionary,
  updateParameterDictionary,
  createParameterReference,
  createParameterDictionary,
} from "./parameterDictionary";

export const DATASET_FLOAT_FACTOR = 1000;

export function quantizeFloatForDataset(
  value: number,
  factor = DATASET_FLOAT_FACTOR
): number {
  return Math.round(value * factor) / factor;
}

const quantizeDimensions = (
  dimensions: SubjectInfo["subject"]["dimensions"]
) => ({
  width: quantizeFloatForDataset(dimensions.width),
  height: quantizeFloatForDataset(dimensions.height),
  depth: quantizeFloatForDataset(dimensions.depth),
});

/**
 * Returns the exact floating-point geometry represented by the integer-packed
 * dataset format.  Endpoint labels must be derived from these poses, not the
 * higher-precision solver output, or a pose on a classifier boundary can be
 * stored under a label that no longer describes it after decoding.
 */
export function quantizeSubjectInfoForDataset(
  subjectsInfo: SubjectInfo[]
): SubjectInfo[] {
  return subjectsInfo.map(({ subject, frames, movementType }) => ({
    subject: {
      ...subject,
      dimensions: quantizeDimensions(subject.dimensions),
      ...(subject.attentionBox
        ? {
            attentionBox: {
              dimensions: quantizeDimensions(subject.attentionBox.dimensions),
              position: subject.attentionBox.position.clone().set(
                quantizeFloatForDataset(subject.attentionBox.position.x),
                quantizeFloatForDataset(subject.attentionBox.position.y),
                quantizeFloatForDataset(subject.attentionBox.position.z)
              ),
            },
          }
        : {}),
    },
    frames: frames?.map((frame) => ({
      position: frame.position.clone().set(
        quantizeFloatForDataset(frame.position.x),
        quantizeFloatForDataset(frame.position.y),
        quantizeFloatForDataset(frame.position.z)
      ),
      rotation: frame.rotation.clone().set(
        quantizeFloatForDataset(frame.rotation.x),
        quantizeFloatForDataset(frame.rotation.y),
        quantizeFloatForDataset(frame.rotation.z),
        frame.rotation.order
      ),
    })),
    movementType,
  }));
}

export function quantizeCameraFramesForDataset(
  cameraFrames: CameraParameters[]
): CameraParameters[] {
  return cameraFrames.map((frame) => ({
    position: frame.position.clone().set(
      quantizeFloatForDataset(frame.position.x),
      quantizeFloatForDataset(frame.position.y),
      quantizeFloatForDataset(frame.position.z)
    ),
    rotation: frame.rotation.clone().set(
      quantizeFloatForDataset(frame.rotation.x),
      quantizeFloatForDataset(frame.rotation.y),
      quantizeFloatForDataset(frame.rotation.z),
      frame.rotation.order
    ),
    focalLength: quantizeFloatForDataset(frame.focalLength),
    aspectRatio: quantizeFloatForDataset(frame.aspectRatio),
  }));
}

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
  existingParameters: ParameterDictionary = createParameterDictionary()
): {
  formattedData: any;
  parameterDictionary: ParameterDictionary;
} {
  if (
    data.cinematographyPrompts.length !== 1 ||
    data.simulationInstructions.length !== 1 ||
    data.subjectsInfo.length !== 1
  ) {
    throw new Error(
      "Dataset samples must contain exactly one cinematography prompt, one simulation instruction, and one subject."
    );
  }

  const expectedFrameCount = data.simulationInstructions[0].frameCount;
  const subjectFrameCount = data.subjectsInfo[0].frames?.length ?? 0;
  if (
    !Number.isInteger(expectedFrameCount) ||
    expectedFrameCount <= 0 ||
    data.cameraFrames.length !== expectedFrameCount ||
    subjectFrameCount !== expectedFrameCount
  ) {
    throw new Error(
      `Dataset sample frame counts disagree: instruction=${expectedFrameCount}, camera=${data.cameraFrames.length}, subject=${subjectFrameCount}.`
    );
  }

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

  const quantizedSubjectsInfo = quantizeSubjectInfoForDataset(
    data.subjectsInfo
  );
  const quantizedCameraFrames = quantizeCameraFramesForDataset(
    data.cameraFrames
  );
  const formattedData = [
    cinematographyRef,
    simulationRef,
    compressFormatSubjectInfo(roundFloats(quantizedSubjectsInfo)),
    compressCameraFrames(roundFloats(quantizedCameraFrames)),
  ];

  return {
    formattedData,
    parameterDictionary,
  };
}

export function roundFloats(
  obj: any,
  factor = DATASET_FLOAT_FACTOR
): any {
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
