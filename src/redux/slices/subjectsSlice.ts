import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Subject, SubjectFrame, SubjectInfo } from "@/service/subjects/types";

interface SubjectsState {
  subjects: Subject[];
  subjectsInfo: SubjectInfo[];
  movements: Record<string, string>;
}

const initialState: SubjectsState = {
  subjects: [],
  subjectsInfo: [],
  movements: {},
};

export const subjectsSlice = createSlice({
  name: "subjects",
  initialState,
  reducers: {
    setSubjects: (state, action: PayloadAction<Subject[]>) => {
      state.subjects = action.payload;
    },
    setSubjectsInfo: (state, action: PayloadAction<SubjectInfo[]>) => {
      state.subjectsInfo = action.payload;
    },
    setMovements: (state, action: PayloadAction<Record<string, string>>) => {
      state.movements = action.payload;
    },
    resetSubjectsState: (state) => {
      return initialState;
    },
  },
});

export const {
  setSubjects,
  setSubjectsInfo,
  setMovements,
  resetSubjectsState,
} = subjectsSlice.actions;

export default subjectsSlice.reducer;
