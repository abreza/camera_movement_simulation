import React, { FC, useState } from "react";
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
import {
  DynamicMode,
  SetupConfig,
} from "@/service/simulation/instruction/types";

const isSetupConfigEmpty = (config: SetupConfig | undefined): boolean => {
  if (!config) return true;
  return Object.values(config).every((value) => {
    if (typeof value === "object" && value !== null) {
      return Object.keys(value).length === 0;
    }
    return value === undefined;
  });
};

const getSimulationErrorMessage = (error: unknown, fallback: string): string => {
  if (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
};

export const LowLevelTab: FC = () => {
  const dispatch = useAppDispatch();
  const [isPending, setIsPending] = useState(false);
  const instructions = useAppSelector(
    (state) => state.instructions.instructions
  );
  const editingIndex = useAppSelector((state) => state.form.editingIndex);
  const currentInstruction = useAppSelector(
    (state) => state.form.currentInstruction
  );

  const handleAddOrUpdate = () => {
    if (
      !currentInstruction.setup.config.cameraAngle ||
      !currentInstruction.setup.config.shotSize
    ) {
      toast.error(
        "Please define at least Camera Angle and Shot Size for the main setup."
      );
      return;
    }

    if (
      currentInstruction.dynamic.type === DynamicMode.Interpolation &&
      isSetupConfigEmpty(currentInstruction.dynamic.complementSetup)
    ) {
      toast.error(
        "For interpolation movement, please define at least one property in the complement setup."
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
    toast.success(
      `Instruction ${editingIndex !== null ? "updated" : "added"} successfully`
    );
  };

  const handleRender = async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      await dispatch(renderSimulationDataThunk()).unwrap();
      dispatch(setSidebarOpen(false));
    } catch (error) {
      toast.error(getSimulationErrorMessage(error, "Unable to render simulation."));
    } finally {
      setIsPending(false);
    }
  };

  const handleDownload = async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      await dispatch(downloadSimulationDataThunk()).unwrap();
    } catch (error) {
      toast.error(getSimulationErrorMessage(error, "Unable to download simulation."));
    } finally {
      setIsPending(false);
    }
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
        disabled={isPending}
        sx={{ mb: 2 }}
        size="small"
      >
        {editingIndex !== null ? "Update Instruction" : "Add Instruction"}
      </Button>

      {instructions.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <IconButton
            color="primary"
            onClick={handleDownload}
            disabled={isPending}
            size="small"
            aria-label="Download simulation data"
          >
            <Download fontSize="small" />
          </IconButton>
          <Button
            variant="contained"
            color="warning"
            onClick={handleRender}
            disabled={isPending}
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
