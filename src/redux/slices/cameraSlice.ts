import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import * as THREE from "three";
import { CameraParameters } from "@/service/simulation/instruction/types";
import { ObjectClass, SubjectInfo } from "@/service/subjects/types";

interface CameraState {
  cameraFrames: CameraParameters[];
  currentFrame: number;
  fps: number;
  isRendering: boolean;
  sourceData: any | null;
  batchTrajectories: { [key: string]: number[][][] } | null;
  selectedBatchIndex: number;
  totalBatches: number;
  inferenceSubjects: SubjectInfo[][];
}

const DEFAULT_CAMERA_CONFIG = {
  focalLength: 50,
  aspectRatio: 16 / 9,
} as const;

const DEFAULT_FPS = 15;

const createCameraParameters = (
  position: [number, number, number] = [0, 0, 0],
  rotation: [number, number, number] = [0, 0, 0]
): CameraParameters => ({
  position: new THREE.Vector3(...position),
  rotation: new THREE.Euler(...rotation, "XYZ"),
  ...DEFAULT_CAMERA_CONFIG,
});

const createDefaultCameraParameters = (): CameraParameters =>
  createCameraParameters([5, 5, 15]);

const extractFrameData = (
  frame: any
): [[number, number, number], [number, number, number]] => {
  if (!frame)
    return [
      [0, 0, 0],
      [0, 0, 0],
    ];
  return [
    [frame[0], frame[1], frame[2]],
    [frame[3], frame[4], frame[5]],
  ];
};

const convertTrajectoryToParameters = (
  trajectory: number[][]
): CameraParameters[] =>
  trajectory.map((frame) => {
    const [position, rotation] = extractFrameData(frame);
    rotation[2] = 0;
    return createCameraParameters(position, rotation);
  });

const getBatchTrajectory = (
  trajectoryData: number[][] | number[][][],
  batchIndex: number
): number[][] => {
  const isBatchData =
    Array.isArray(trajectoryData[0]) && Array.isArray(trajectoryData[0][0]);

  if (!isBatchData) {
    return trajectoryData as number[][];
  }

  const batchData = trajectoryData as number[][][];
  const validIndex = batchIndex < batchData.length ? batchIndex : 0;
  return batchData[validIndex];
};

const convertInferenceTrajectory = (
  trajectoryData: number[][] | number[][][],
  isBatch: boolean = false,
  batchIndex: number = 0
): CameraParameters[] => {
  const trajectory = isBatch
    ? getBatchTrajectory(trajectoryData, batchIndex)
    : (trajectoryData as number[][]);

  return convertTrajectoryToParameters(trajectory);
};

const createSubjectInfo = (
  subjectTrajectory: number[][],
  subjectVolume: number[],
  batchIndex: number
): SubjectInfo => ({
  subject: {
    id: `inference-subject-batch-${batchIndex}`,
    class: ObjectClass.Car,
    dimensions: {
      width: subjectVolume[0],
      height: subjectVolume[1],
      depth: subjectVolume[2],
    },
  },
  frames: subjectTrajectory.map((frame) => {
    const [position, rotation] = extractFrameData(frame);
    return {
      position: new THREE.Vector3(...position),
      rotation: new THREE.Euler(...rotation, "XYZ"),
    };
  }),
  movementType: "inference",
});

const processInferenceSubjects = (
  subjectTrajectories: number[][][],
  subjectVolumes: number[][][],
  totalBatches: number
): SubjectInfo[][] => {
  return Array.from({ length: totalBatches }, (_, i) => [
    createSubjectInfo(subjectTrajectories[i], subjectVolumes[i][0], i),
  ]);
};

const initialState: CameraState = {
  cameraFrames: [createDefaultCameraParameters()],
  currentFrame: 0,
  fps: 30,
  isRendering: false,
  sourceData: null,
  batchTrajectories: null,
  selectedBatchIndex: 0,
  totalBatches: 0,
  inferenceSubjects: [],
};

export const cameraSlice = createSlice({
  name: "camera",
  initialState,
  reducers: {
    setCameraFrames: (state, action: PayloadAction<CameraParameters[]>) => {
      state.cameraFrames = action.payload;
    },
    setCurrentFrame: (state, action: PayloadAction<number>) => {
      state.currentFrame = action.payload;
    },
    setFps: (state, action: PayloadAction<number>) => {
      state.fps = action.payload;
    },
    setIsRendering: (state, action: PayloadAction<boolean>) => {
      state.isRendering = action.payload;
    },
    setSelectedBatchIndex: (state, action: PayloadAction<number>) => {
      state.selectedBatchIndex = action.payload;

      if (state.batchTrajectories && state.sourceData?.batch_data) {
        const trajectoryData = state.batchTrajectories["prompt_generation"];

        if (trajectoryData) {
          state.cameraFrames = convertInferenceTrajectory(
            trajectoryData,
            true,
            action.payload
          );
        }
      }
    },
    importCameraFrames: (state, action: PayloadAction<any>) => {
      const inferenceData = action.payload;
      const { batch_data } = inferenceData;

      const trajectoryData = inferenceData.trajectories["prompt_generation"];

      if (trajectoryData) {
        state.batchTrajectories = inferenceData.trajectories;
        state.totalBatches = trajectoryData.length;
        state.selectedBatchIndex = 0;
        state.cameraFrames = convertInferenceTrajectory(
          trajectoryData,
          true,
          0
        );
      }

      if (batch_data.subject_trajectory && batch_data.subject_volume) {
        state.inferenceSubjects = processInferenceSubjects(
          batch_data.subject_trajectory,
          batch_data.subject_volume,
          state.totalBatches
        );
      }

      state.sourceData = inferenceData;
      state.fps = DEFAULT_FPS;
      state.isRendering = true;
    },
    resetCameraState: (state) => {
      Object.assign(state, {
        ...initialState,
        cameraFrames: [createDefaultCameraParameters()],
      });
    },
  },
});

export const {
  setCameraFrames,
  setCurrentFrame,
  setFps,
  setIsRendering,
  setSelectedBatchIndex,
  importCameraFrames,
  resetCameraState,
} = cameraSlice.actions;

export default cameraSlice.reducer;
