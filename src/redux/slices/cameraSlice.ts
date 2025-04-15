import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import * as THREE from "three";
import { CameraParameters } from "@/service/simulation/instruction/types";

interface CameraState {
  cameraFrames: CameraParameters[];
  currentFrame: number;
  fps: number;
  isRendering: boolean;
}

const initialState: CameraState = {
  cameraFrames: [
    {
      position: new THREE.Vector3(5, 5, 15),
      rotation: new THREE.Euler(0, 0, 0),
      focalLength: 50,
      aspectRatio: 16 / 9,
    },
  ],
  currentFrame: 0,
  fps: 30,
  isRendering: false,
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
    importCameraFrames: (state, action: PayloadAction<CameraParameters[]>) => {
      state.cameraFrames = action.payload;
      state.isRendering = true;
    },
    resetCameraState: (state) => {
      state.cameraFrames = initialState.cameraFrames;
      state.currentFrame = 0;
      state.isRendering = false;
    },
  },
});

export const {
  setCameraFrames,
  setCurrentFrame,
  setFps,
  setIsRendering,
  importCameraFrames,
  resetCameraState,
} = cameraSlice.actions;

export default cameraSlice.reducer;
