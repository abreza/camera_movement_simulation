import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  DATASET_INSTRUCTION_COUNT,
  DATASET_SUBJECT_COUNT,
  GenerateDatasetConfig,
  MAX_DATASET_FRAME_COUNT,
  MIN_DATASET_FRAME_COUNT,
} from "@/service/dataset/generate";

interface UIState {
  sidebarOpen: boolean;
  simulationStepIndex: number;
  selectedView: "none" | "simulation" | "generator";
  generatingDataset: boolean;
  progress: number;
  progressPhase: "generating" | "zipping";
  generatorOptions: GenerateDatasetConfig;
  showCameraPath: boolean;
  showSubjectPaths: boolean;
}

const initialState: UIState = {
  sidebarOpen: false,
  simulationStepIndex: -1,
  selectedView: "none",
  generatingDataset: false,
  progress: 0,
  progressPhase: "generating",
  showCameraPath: true,
  showSubjectPaths: true,
  generatorOptions: {
    simulationCount: 1000,
    subjectCount: DATASET_SUBJECT_COUNT,
    instructionCount: DATASET_INSTRUCTION_COUNT,
    minFrameCount: MIN_DATASET_FRAME_COUNT,
    maxFrameCount: MAX_DATASET_FRAME_COUNT,
    movementDistribution: {
      circular: 1,
      zigzag: 1,
      linear: 1,
      spiral: 1,
      static: 1,
      figureEight: 1,
      wave: 1,
    },
    noiseConfig: {
      applyNoise: false,
      positionAmplitude: 0.1,
      rotationAmplitude: 0.02,
      frequency: 0.5,
    },
  },
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setSimulationStepIndex: (state, action: PayloadAction<number>) => {
      state.simulationStepIndex = action.payload;
      if (action.payload >= 0) {
        state.selectedView = "simulation";
      }
    },
    setSelectedView: (
      state,
      action: PayloadAction<"none" | "simulation" | "generator">
    ) => {
      state.selectedView = action.payload;
    },
    setGeneratingDataset: (state, action: PayloadAction<boolean>) => {
      state.generatingDataset = action.payload;
    },
    setProgress: (state, action: PayloadAction<number>) => {
      state.progress = action.payload;
    },
    setProgressPhase: (
      state,
      action: PayloadAction<"generating" | "zipping">
    ) => {
      state.progressPhase = action.payload;
    },
    setGeneratorOptions: (
      state,
      action: PayloadAction<Partial<GenerateDatasetConfig>>
    ) => {
      state.generatorOptions = {
        ...state.generatorOptions,
        ...action.payload,
        subjectCount: DATASET_SUBJECT_COUNT,
        instructionCount: DATASET_INSTRUCTION_COUNT,
      };
    },
    setShowCameraPath: (state, action: PayloadAction<boolean>) => {
      state.showCameraPath = action.payload;
    },
    setShowSubjectPaths: (state, action: PayloadAction<boolean>) => {
      state.showSubjectPaths = action.payload;
    },
    resetUIState: (state) => {
      state.simulationStepIndex = -1;
      state.selectedView = "none";
      state.generatingDataset = false;
      state.progress = 0;
    },
  },
});

export const {
  setSidebarOpen,
  setSimulationStepIndex,
  setSelectedView,
  setGeneratingDataset,
  setProgress,
  setProgressPhase,
  setGeneratorOptions,
  setShowCameraPath,
  setShowSubjectPaths,
  resetUIState,
} = uiSlice.actions;

export default uiSlice.reducer;
