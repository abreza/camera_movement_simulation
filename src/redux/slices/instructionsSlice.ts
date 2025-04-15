import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  CinematographyPrompt,
  SimulationInstruction,
} from "@/service/simulation/instruction/types";
import { defaultCinematographyPrompt } from "@/service/simulation/instruction/high-level/constant";

interface InstructionsState {
  instructions: SimulationInstruction[];
  cinematographyPrompt: CinematographyPrompt;
}

const initialState: InstructionsState = {
  instructions: [],
  cinematographyPrompt: defaultCinematographyPrompt,
};

export const instructionsSlice = createSlice({
  name: "instructions",
  initialState,
  reducers: {
    setInstructions: (
      state,
      action: PayloadAction<SimulationInstruction[]>
    ) => {
      state.instructions = action.payload;
    },
    addInstruction: (state, action: PayloadAction<SimulationInstruction>) => {
      state.instructions.push(action.payload);
    },
    editInstruction: (
      state,
      action: PayloadAction<{
        index: number;
        instruction: SimulationInstruction;
      }>
    ) => {
      const { index, instruction } = action.payload;
      if (index >= 0 && index < state.instructions.length) {
        state.instructions[index] = instruction;
      }
    },
    deleteInstruction: (state, action: PayloadAction<number>) => {
      state.instructions = state.instructions.filter(
        (_, index) => index !== action.payload
      );
    },
    setCinematographyPrompt: (
      state,
      action: PayloadAction<CinematographyPrompt>
    ) => {
      state.cinematographyPrompt = action.payload;
    },
    resetInstructionsState: (state) => {
      return initialState;
    },
  },
});

export const {
  setInstructions,
  addInstruction,
  editInstruction,
  deleteInstruction,
  setCinematographyPrompt,
  resetInstructionsState,
} = instructionsSlice.actions;

export default instructionsSlice.reducer;
