import React, { FC } from "react";
import {
  Box,
  Button,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { Download } from "@mui/icons-material";
import { InstructionList } from "./components/InstructionList";
import { SetupControls } from "./components/SetupControls";
import { GeneralSettings } from "./GeneralSettings";
import { Dynamic } from "./Dynamic";
import { useAppSelector, useAppDispatch } from "@/redux/hooks";
import { resetForm, setEditingIndex } from "@/redux/slices/formSlice";
import {
  renderSimulationDataThunk,
  downloadSimulationDataThunk,
} from "@/redux/thunks/simulationThunks";
import { setSidebarOpen } from "@/redux/slices/uiSlice";
import {
  addInstruction,
  editInstruction,
} from "@/redux/slices/instructionsSlice";
import { toast } from "react-toastify";

export const LowLevelTab: FC = () => {
  const dispatch = useAppDispatch();
  const instructions = useAppSelector(
    (state) => state.instructions.instructions
  );
  const editingIndex = useAppSelector((state) => state.form.editingIndex);
  const currentInstruction = useAppSelector(
    (state) => state.form.currentInstruction
  );

  const handleAddOrUpdate = () => {
    if (
      !currentInstruction.initialSetup.cameraAngle ||
      !currentInstruction.initialSetup.shotSize
    ) {
      toast.error("Please set camera angle and shot size in initial setup");
      return;
    }

    if (
      currentInstruction.dynamic.type === "interpolation" &&
      !currentInstruction.dynamic.endSetup?.cameraAngle &&
      !currentInstruction.dynamic.endSetup?.shotSize
    ) {
      toast.error(
        "Please set at least one end setup parameter for interpolation"
      );
      return;
    }

    if (editingIndex !== null) {
      dispatch(
        editInstruction({
          index: editingIndex,
          instruction: currentInstruction,
        })
      );
      dispatch(setEditingIndex(null));
    } else {
      dispatch(addInstruction(currentInstruction));
    }

    dispatch(resetForm());
    toast.success("Instruction added successfully");
  };

  const handleRender = () => {
    dispatch(renderSimulationDataThunk());
    dispatch(setSidebarOpen(false));
  };

  const handleDownload = () => {
    dispatch(downloadSimulationDataThunk());
  };

  return (
    <Box>
      <InstructionList />

      <SetupControls isInitial={true} />

      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
        Dynamic
      </Typography>

      <Dynamic />

      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
        General Settings
      </Typography>
      <GeneralSettings />

      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={handleAddOrUpdate}
        sx={{ mb: 2 }}
        size="small"
      >
        {editingIndex !== null ? "Update Instruction" : "Add Instruction"}
      </Button>

      {instructions.length > 0 && (
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton
            color="primary"
            onClick={handleDownload}
            size="small"
            aria-label="Download simulation data"
          >
            <Download fontSize="small" />
          </IconButton>
          <Button
            variant="contained"
            color="warning"
            onClick={handleRender}
            sx={{ flexGrow: 1 }}
            size="small"
          >
            Render
          </Button>
        </Stack>
      )}
    </Box>
  );
};

export default LowLevelTab;
