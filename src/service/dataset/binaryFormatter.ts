import { CameraParameters } from "../simulation/instruction/types";
import { SubjectInfo } from "../subjects/types";
import { SimulationData } from "./types";
import {
  createParameterReference,
  ParameterDictionary,
  updateParameterDictionary,
} from "./parameterDictionary";

const BINARY_VERSION = 1;

function floatToInt16(value: number): number {
  return Math.round(value * 1000);
}

function writeString(view: DataView, offset: number, str: string): number {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  view.setUint16(offset, bytes.length);
  offset += 2;
  for (let i = 0; i < bytes.length; i++) {
    view.setUint8(offset + i, bytes[i]);
  }
  return offset + bytes.length;
}

function writeVector3(
  view: DataView,
  offset: number,
  vector: { x: number; y: number; z: number }
): number {
  view.setInt16(offset, floatToInt16(vector.x));
  view.setInt16(offset + 2, floatToInt16(vector.y));
  view.setInt16(offset + 4, floatToInt16(vector.z));
  return offset + 6;
}

function writeDimensions(
  view: DataView,
  offset: number,
  dimensions: { width: number; height: number; depth: number }
): number {
  view.setInt16(offset, floatToInt16(dimensions.width));
  view.setInt16(offset + 2, floatToInt16(dimensions.height));
  view.setInt16(offset + 4, floatToInt16(dimensions.depth));
  return offset + 6;
}

function formatSubjectInfoToBinary(
  view: DataView,
  offset: number,
  subjectsInfo: SubjectInfo[]
): number {
  view.setUint16(offset, subjectsInfo.length);
  offset += 2;

  for (const info of subjectsInfo) {
    const { subject, frames } = info;

    offset = writeString(view, offset, subject.id);
    offset = writeString(view, offset, subject.class);

    offset = writeDimensions(view, offset, subject.dimensions);

    view.setUint8(offset, subject.attentionBox ? 1 : 0);
    offset += 1;
    if (subject.attentionBox) {
      offset = writeVector3(view, offset, subject.attentionBox.position);
      offset = writeDimensions(view, offset, subject.attentionBox.dimensions);
    }

    view.setUint16(offset, frames?.length || 0);
    offset += 2;
    if (frames) {
      for (const frame of frames) {
        offset = writeVector3(view, offset, frame.position);
        offset = writeVector3(view, offset, frame.rotation);
      }
    }
  }

  return offset;
}

function formatCameraFramesToBinary(
  view: DataView,
  offset: number,
  cameraFrames: CameraParameters[]
): number {
  view.setUint16(offset, cameraFrames.length);
  offset += 2;

  for (const frame of cameraFrames) {
    offset = writeVector3(view, offset, frame.position);
    offset = writeVector3(view, offset, frame.rotation);
    view.setInt16(offset, floatToInt16(frame.focalLength));
    view.setInt16(offset + 2, floatToInt16(frame.aspectRatio));
    offset += 4;
  }

  return offset;
}

function writeParameterReferences(
  view: DataView,
  offset: number,
  refs: string
): number {
  const references = refs.split(",");
  view.setUint16(offset, references.length);
  offset += 2;

  for (const ref of references) {
    const [keyIndex, valueIndex] = ref.split(":").map(Number);
    view.setUint16(offset, keyIndex);
    view.setUint16(offset + 2, valueIndex);
    offset += 4;
  }

  return offset;
}

export function formatSimulationDataToBinary(
  data: SimulationData,
  cinematographyRef: string,
  simulationRef: string
): ArrayBuffer {
  let totalSize = 4;

  totalSize += 2 + cinematographyRef.split(",").length * 4;
  totalSize += 2 + simulationRef.split(",").length * 4;

  totalSize += 1000 * data.subjectsInfo.length;

  totalSize += 2 + data.cameraFrames.length * (6 + 6 + 4);

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  let offset = 0;

  view.setUint32(offset, BINARY_VERSION);
  offset += 4;

  offset = writeParameterReferences(view, offset, cinematographyRef);
  offset = writeParameterReferences(view, offset, simulationRef);

  offset = formatSubjectInfoToBinary(view, offset, data.subjectsInfo);

  offset = formatCameraFramesToBinary(view, offset, data.cameraFrames);

  return buffer.slice(0, offset);
}

export function formatSimulationData(
  data: SimulationData,
  existingParameters: ParameterDictionary = { keys: [], values: [] }
): {
  binaryData: ArrayBuffer;
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

  const binaryData = formatSimulationDataToBinary(
    data,
    cinematographyRef,
    simulationRef
  );

  return {
    binaryData,
    parameterDictionary,
  };
}
