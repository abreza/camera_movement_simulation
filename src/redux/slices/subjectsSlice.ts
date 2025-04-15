import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Subject, SubjectFrame, SubjectInfo } from "@/service/subjects/types";

interface SubjectsState {
  subjects: Subject[];
  subjectFrames: SubjectFrame[][];
  subjectsInfo: SubjectInfo[];
  movements: Record<string, string>;
}

const initialState: SubjectsState = {
  subjects: [],
  subjectFrames: [],
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
    setSubjectFrames: (state, action: PayloadAction<SubjectFrame[][]>) => {
      state.subjectFrames = action.payload;
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
  setSubjectFrames,
  setSubjectsInfo,
  setMovements,
  resetSubjectsState,
} = subjectsSlice.actions;

export default subjectsSlice.reducer;
