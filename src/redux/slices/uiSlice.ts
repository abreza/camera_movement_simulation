import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { GenerateDatasetConfig } from "@/service/dataset/generate";

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
    subjectCount: 1,
    instructionCount: 1,
    minFrameCount: 30,
    maxFrameCount: 300,
    movementDistribution: {
      circular: 1,
      zigzag: 1,
      linear: 1,
      spiral: 1,
      static: 1,
      figureEight: 1,
      wave: 1,
      pendulum: 1,
      orbital: 1,
      bounce: 1,
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
