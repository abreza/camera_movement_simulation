import { createAsyncThunk } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { ObjectClass, SubjectFrame } from "@/service/subjects/types";
import { generateSubjects } from "@/service/subjects/generateSubjects";
import { generateFrames } from "@/service/subjects/generateFrames";
import { calculateCameraPositions } from "@/service/simulation/optimization";
import { handleDownloadSimulationData } from "@/utils/simulationUtils";
import {
  setSubjects,
  setSubjectFrames,
  setSubjectsInfo,
  setMovements,
} from "../slices/subjectsSlice";
import { setCameraFrames, setIsRendering } from "../slices/cameraSlice";

const processFramesForRedux = (frames: SubjectFrame[][]) => {
  return frames;
};

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
      const { subjects } = state.subjects;

      dispatch(setMovements(movements));

      const newFrames = generateFrames(subjects, movements);
      const processedFrames = processFramesForRedux(newFrames);
      dispatch(setSubjectFrames(processedFrames));

      const newSubjectsInfo = subjects.map((subject, index) => ({
        subject,
        frames: newFrames[index],
      }));

      dispatch(setSubjectsInfo(newSubjectsInfo));

      return processedFrames;
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
