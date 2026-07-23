import { createAsyncThunk } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { ObjectClass, SubjectInfo } from "@/service/subjects/types";
import { generateSubjects } from "@/service/subjects/generateSubjects";
import { generateFrames } from "@/service/subjects/movements";
import { calculateCameraPositions } from "@/service/simulation/optimization";
import { handleDownloadSimulationData } from "@/utils/simulationUtils";
import {
  setSubjects,
  setSubjectsInfo,
  setMovements,
} from "../slices/subjectsSlice";
import {
  setCameraFrames,
  setIsRendering,
  setFps,
  clearInferenceData,
  setCurrentFrame,
} from "../slices/cameraSlice";
import { CameraParameters } from "@/service/simulation/instruction/types";
import { setSidebarOpen } from "../slices/uiSlice";
import * as THREE from "three";

export const generateSubjectsThunk = createAsyncThunk(
  "subjects/generateSubjects",
  async (
    {
      count,
      probabilityFactors,
    }: {
      count: number;
      probabilityFactors: Record<ObjectClass, number>;
    },
    { dispatch }
  ) => {
    try {
      const newSubjects = generateSubjects(count, probabilityFactors);

      dispatch(setSubjects(newSubjects));

      const newSubjectsInfo = newSubjects.map((subject) => ({
        subject,
        frames: [],
        movementType: "default",
      }));

      dispatch(setSubjectsInfo(newSubjectsInfo));

      return newSubjects;
    } catch (error) {
      console.error("Error generating subjects:", error);
      throw error;
    }
  }
);

export const updateMovementsThunk = createAsyncThunk(
  "subjects/updateMovements",
  async (movements: Record<string, string>, { dispatch, getState }) => {
    try {
      const state = getState() as RootState;
      const { subjects, subjectsInfo } = state.subjects;

      dispatch(setMovements(movements));

      const originPositions: Map<string, THREE.Vector3> = new Map();
      const originRotations: Map<string, THREE.Euler> = new Map();

      subjectsInfo.forEach((si) => {
        if (si.frames && si.frames.length > 0) {
          originPositions.set(si.subject.id, si.frames[0].position.clone());
          originRotations.set(si.subject.id, si.frames[0].rotation.clone());
        }
      });

      const subjectsToAnimate = subjects.length > 0 ? subjects : subjectsInfo.map(si => si.subject);
      const newFrames = generateFrames(subjectsToAnimate, movements);

      const newSubjectsInfo = subjectsToAnimate.map((subject, index) => {
        let frames = newFrames[index];

        const origin = originPositions.get(subject.id);
        const originRot = originRotations.get(subject.id);

        if (origin && originRot) {
          if (movements[subject.id] !== "static") {
            const startFrame = frames[0];
            const rotOffset = originRot.y - startFrame.rotation.y;

            frames = frames.map((f) => {
              const relPos = f.position.clone().sub(startFrame.position);

              relPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotOffset);

              return {
                position: origin.clone().add(relPos),
                rotation: new THREE.Euler(
                  f.rotation.x,
                  f.rotation.y + rotOffset,
                  f.rotation.z,
                  f.rotation.order
                ),
              };
            });
          } else {
            frames = frames.map(() => ({
              position: origin.clone(),
              rotation: originRot.clone(),
            }));
          }
        }

        return {
          subject,
          frames,
          movementType: movements[subject.id] || "default",
        };
      });

      dispatch(setSubjectsInfo(newSubjectsInfo));
    } catch (error) {
      console.error("Error updating movements:", error);
      throw error;
    }
  }
);

export const renderSimulationDataThunk = createAsyncThunk(
  "simulation/renderData",
  async (_, { dispatch, getState }) => {
    try {
      const state = getState() as RootState;
      const { instructions } = state.instructions;
      const { subjectsInfo } = state.subjects;

      const frames = calculateCameraPositions(instructions, subjectsInfo);

      dispatch(setCameraFrames(frames));
      dispatch(setIsRendering(true));

      return frames;
    } catch (error) {
      console.error("Error rendering simulation data:", error);
      throw error;
    }
  }
);

export const downloadSimulationDataThunk = createAsyncThunk(
  "simulation/downloadData",
  async (_, { dispatch, getState }) => {
    try {
      const state = getState() as RootState;
      const { instructions } = state.instructions;
      const { subjectsInfo } = state.subjects;

      const frames = calculateCameraPositions(instructions, subjectsInfo);

      dispatch(setCameraFrames(frames));

      const simulationData = {
        subjectsInfo,
        instructions,
        cameraFrames: frames,
      };

      handleDownloadSimulationData(simulationData);

      return simulationData;
    } catch (error) {
      console.error("Error downloading simulation data:", error);
      throw error;
    }
  }
);

export const importRideDataThunk = createAsyncThunk(
  "simulation/importRideData",
  async (
    rideData: {
      cameraFrames: CameraParameters[];
      subjectsInfo: SubjectInfo[];
    },
    { dispatch }
  ) => {
    try {
      dispatch(clearInferenceData());

      dispatch(setCameraFrames(rideData.cameraFrames));
      dispatch(setFps(30));
      dispatch(setIsRendering(true));
      dispatch(setCurrentFrame(0));

      const subjects = rideData.subjectsInfo.map((si) => si.subject);
      dispatch(setSubjects(subjects));
      dispatch(setSubjectsInfo(rideData.subjectsInfo));

      dispatch(setSidebarOpen(false));

      return rideData;
    } catch (error) {
      console.error("Error importing RIDE data:", error);
      throw error;
    }
  }
);
