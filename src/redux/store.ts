import { configureStore } from "@reduxjs/toolkit";
import cameraReducer from "./slices/cameraSlice";
import subjectsReducer from "./slices/subjectsSlice";
import instructionsReducer from "./slices/instructionsSlice";
import uiReducer from "./slices/uiSlice";
import formReducer from "./slices/formSlice";

export const store = configureStore({
  reducer: {
    camera: cameraReducer,
    subjects: subjectsReducer,
    instructions: instructionsReducer,
    ui: uiReducer,
    form: formReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
