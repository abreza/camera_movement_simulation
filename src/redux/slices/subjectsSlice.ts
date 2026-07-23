import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Subject, SubjectFrame, SubjectInfo } from "@/service/subjects/types";
import * as THREE from "three";

interface SubjectsState {
  subjects: Subject[];
  subjectsInfo: SubjectInfo[];
  movements: Record<string, string>;
  placingSubject: Subject | null;
  placementPreviewPosition: { x: number; y: number; z: number; rotationY?: number } | null;
}

const initialState: SubjectsState = {
  subjects: [],
  subjectsInfo: [],
  movements: {},
  placingSubject: null,
  placementPreviewPosition: null,
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
    startPlacingSubject: (state, action: PayloadAction<Subject>) => {
      state.placingSubject = action.payload;
      state.placementPreviewPosition = null;
    },
    updatePlacementPreview: (
      state,
      action: PayloadAction<{ x: number; y: number; z: number; rotationY?: number } | null>
    ) => {
      state.placementPreviewPosition = action.payload;
    },
    confirmSubjectPlacement: (
      state,
      action: PayloadAction<{ x: number; y: number; z: number; rotationY?: number }>
    ) => {
      const subject = state.placingSubject;
      if (!subject) return;

      const pos = action.payload;
      const rotY = action.payload.rotationY || 0;

      const initialFrame: SubjectFrame = {
        position: new THREE.Vector3(pos.x, pos.y + subject.dimensions.height / 2, pos.z),
        rotation: new THREE.Euler(0, rotY, 0),
      };

      const frames: SubjectFrame[] = Array.from({ length: 30 }, () => ({
        position: initialFrame.position.clone(),
        rotation: initialFrame.rotation.clone(),
      }));

      state.subjects.push(subject);
      state.subjectsInfo.push({
        subject,
        frames,
        movementType: "static",
      });
      state.movements[subject.id] = "static";

      state.placingSubject = null;
      state.placementPreviewPosition = null;
    },
    cancelPlacement: (state) => {
      state.placingSubject = null;
      state.placementPreviewPosition = null;
    },
    removeSubject: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.subjects = state.subjects.filter((s) => s.id !== id);
      state.subjectsInfo = state.subjectsInfo.filter(
        (si) => si.subject.id !== id
      );
      delete state.movements[id];
    },
    updateSubjectPosition: (
      state,
      action: PayloadAction<{
        id: string;
        position: { x: number; y: number; z: number };
      }>
    ) => {
      const { id, position } = action.payload;
      const info = state.subjectsInfo.find((si) => si.subject.id === id);
      if (info && info.frames) {
        const subject = info.subject;
        const newPos = new THREE.Vector3(
          position.x,
          position.y + subject.dimensions.height / 2,
          position.z
        );
        info.frames.forEach((frame) => {
          frame.position = newPos.clone();
        });
      }
    },
    resetSubjectsState: () => {
      return initialState;
    },
  },
});

export const {
  setSubjects,
  setSubjectsInfo,
  setMovements,
  startPlacingSubject,
  updatePlacementPreview,
  confirmSubjectPlacement,
  cancelPlacement,
  removeSubject,
  updateSubjectPosition,
  resetSubjectsState,
} = subjectsSlice.actions;

export default subjectsSlice.reducer;
