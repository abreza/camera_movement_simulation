import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  CameraVerticalAngle,
  DynamicMode,
  InstructionDynamic,
  LockedMovement,
  LockedRotation,
  MovementEasing,
  ShotSize,
  SimulationInstruction,
  SubjectFraming,
  SubjectView,
} from "@/service/simulation/instruction/types";
import { defaultSimulationInstruction } from "@/service/simulation/instruction/constants";

interface FormState {
  currentInstruction: SimulationInstruction;
  editingIndex: number | null;
}

const initialState: FormState = {
  currentInstruction: { ...defaultSimulationInstruction },
  editingIndex: null,
};

export const formSlice = createSlice({
  name: "form",
  initialState,
  reducers: {
    setCurrentInstruction: (
      state,
      action: PayloadAction<SimulationInstruction>
    ) => {
      state.currentInstruction = action.payload;
    },
    setEditingIndex: (state, action: PayloadAction<number | null>) => {
      state.editingIndex = action.payload;
    },
    resetForm: {
      reducer: (
        state,
        action: PayloadAction<SimulationInstruction | undefined>
      ) => {
        state.currentInstruction = action.payload
          ? { ...action.payload }
          : { ...defaultSimulationInstruction };
        state.editingIndex = null;
      },
      prepare: (instruction?: SimulationInstruction) => ({
        payload: instruction,
      }),
    },
    setFrameCount: (state, action: PayloadAction<number>) => {
      state.currentInstruction.frameCount = action.payload;
    },
    setDynamicEasing: (state, action: PayloadAction<MovementEasing>) => {
      state.currentInstruction.dynamic.easing = action.payload;
    },
    setSubjectIndex: (state, action: PayloadAction<number | undefined>) => {
      state.currentInstruction.subjectIndex = action.payload;
    },
    setSubjectAwareInterpolation: (state, action: PayloadAction<boolean>) => {
      if (state.currentInstruction.dynamic.type === DynamicMode.Interpolation) {
        state.currentInstruction.dynamic.subjectAwareInterpolation =
          action.payload;
      }
    },
    setAllFramesVisibility: (state, action: PayloadAction<boolean>) => {
      if (!state.currentInstruction.constraints) {
        state.currentInstruction.constraints = {};
      }
      state.currentInstruction.constraints.allFramesVisibility = action.payload;
    },
    setStaticDistance: (state, action: PayloadAction<boolean | undefined>) => {
      if (!state.currentInstruction.constraints) {
        state.currentInstruction.constraints = {};
      }
      state.currentInstruction.constraints.staticDistance = action.payload;
    },
    setStaticCameraSubjectRotation: (
      state,
      action: PayloadAction<boolean | undefined>
    ) => {
      if (!state.currentInstruction.constraints) {
        state.currentInstruction.constraints = {};
      }
      state.currentInstruction.constraints.staticCameraSubjectRotation =
        action.payload;
    },
    setLockedPosition: (state, action: PayloadAction<LockedMovement>) => {
      if (!state.currentInstruction.constraints) {
        state.currentInstruction.constraints = {};
      }
      state.currentInstruction.constraints.lockedMovement = action.payload;
    },
    setLockedRotation: (state, action: PayloadAction<LockedRotation>) => {
      if (!state.currentInstruction.constraints) {
        state.currentInstruction.constraints = {};
      }
      state.currentInstruction.constraints.lockedRotation = action.payload;
    },
    setImportance: (state, action: PayloadAction<number>) => {
      if (!state.currentInstruction.constraints) {
        state.currentInstruction.constraints = {};
      }
      state.currentInstruction.constraints.importance = action.payload;
    },
    setMaxAccelerate: (state, action: PayloadAction<number | undefined>) => {
      if (!state.currentInstruction.constraints) {
        state.currentInstruction.constraints = {};
      }
      state.currentInstruction.constraints.maxAccelerate = action.payload;
    },
    setMaxSpeed: (state, action: PayloadAction<number | undefined>) => {
      if (!state.currentInstruction.constraints) {
        state.currentInstruction.constraints = {};
      }
      state.currentInstruction.constraints.maxSpeed = action.payload;
    },
    setInitialCameraAngle: (
      state,
      action: PayloadAction<CameraVerticalAngle | undefined>
    ) => {
      state.currentInstruction.initialSetup.cameraAngle = action.payload;
    },
    setInitialShotSize: (
      state,
      action: PayloadAction<ShotSize | undefined>
    ) => {
      state.currentInstruction.initialSetup.shotSize = action.payload;
    },
    setInitialSubjectView: (
      state,
      action: PayloadAction<SubjectView | undefined>
    ) => {
      state.currentInstruction.initialSetup.subjectView = action.payload;
    },
    setInitialSubjectFraming: (
      state,
      action: PayloadAction<SubjectFraming | undefined>
    ) => {
      state.currentInstruction.initialSetup.subjectFraming = action.payload;
    },
    setEndCameraAngle: (
      state,
      action: PayloadAction<CameraVerticalAngle | undefined>
    ) => {
      if (
        state.currentInstruction.dynamic.type === DynamicMode.Interpolation &&
        !state.currentInstruction.dynamic.endSetup
      ) {
        state.currentInstruction.dynamic.endSetup = {};
      }
      if (state.currentInstruction.dynamic.type === DynamicMode.Interpolation) {
        state.currentInstruction.dynamic.endSetup.cameraAngle = action.payload;
      }
    },
    setEndShotSize: (state, action: PayloadAction<ShotSize | undefined>) => {
      if (
        state.currentInstruction.dynamic.type === DynamicMode.Interpolation &&
        !state.currentInstruction.dynamic.endSetup
      ) {
        state.currentInstruction.dynamic.endSetup = {};
      }
      if (state.currentInstruction.dynamic.type === DynamicMode.Interpolation) {
        state.currentInstruction.dynamic.endSetup.shotSize = action.payload;
      }
    },
    setEndSubjectView: (
      state,
      action: PayloadAction<SubjectView | undefined>
    ) => {
      if (
        state.currentInstruction.dynamic.type === DynamicMode.Interpolation &&
        !state.currentInstruction.dynamic.endSetup
      ) {
        state.currentInstruction.dynamic.endSetup = {};
      }
      if (state.currentInstruction.dynamic.type === DynamicMode.Interpolation) {
        state.currentInstruction.dynamic.endSetup.subjectView = action.payload;
      }
    },
    setEndSubjectFraming: (
      state,
      action: PayloadAction<SubjectFraming | undefined>
    ) => {
      if (
        state.currentInstruction.dynamic.type === DynamicMode.Interpolation &&
        !state.currentInstruction.dynamic.endSetup
      ) {
        state.currentInstruction.dynamic.endSetup = {};
      }
      if (state.currentInstruction.dynamic.type === DynamicMode.Interpolation) {
        state.currentInstruction.dynamic.endSetup.subjectFraming =
          action.payload;
      }
    },
    setDynamic: (state, action: PayloadAction<InstructionDynamic>) => {
      state.currentInstruction.dynamic = action.payload;
    },
    setDynamicType: (state, action: PayloadAction<DynamicMode>) => {
      state.currentInstruction.dynamic.type = action.payload;
    },
  },
});

export const {
  setCurrentInstruction,
  setEditingIndex,
  resetForm,
  setFrameCount,
  setDynamicEasing,
  setSubjectIndex,
  setSubjectAwareInterpolation,
  setAllFramesVisibility,
  setStaticDistance,
  setStaticCameraSubjectRotation,
  setLockedPosition,
  setLockedRotation,
  setImportance,
  setMaxAccelerate,
  setMaxSpeed,
  setInitialCameraAngle,
  setInitialShotSize,
  setInitialSubjectView,
  setInitialSubjectFraming,
  setEndCameraAngle,
  setEndShotSize,
  setEndSubjectView,
  setEndSubjectFraming,
  setDynamic,
  setDynamicType,
} = formSlice.actions;

export default formSlice.reducer;
