// src/redux/slices/uiSlice.ts
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
}

const initialState: UIState = {
  sidebarOpen: false,
  simulationStepIndex: -1,
  selectedView: "none",
  generatingDataset: false,
  progress: 0,
  progressPhase: "generating",
  generatorOptions: {
    simulationCount: 1000,
    subjectCount: 1,
    instructionCount: 1,
    minFrameCount: 30,
    maxFrameCount: 300,
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
  resetUIState,
} = uiSlice.actions;

export default uiSlice.reducer;
