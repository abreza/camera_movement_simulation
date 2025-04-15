import React, { FC, useState, useEffect } from "react";
import { Box, Tab, Tabs, Alert } from "@mui/material";
import { CinematographyPrompt } from "@/service/simulation/instruction/types";
import { TextPromptTab } from "./textPrompt/TextPromptTab";
import LowLevelTab from "./lowLevel/LowLevelTab";
import { HighLevelTab } from "./highLevel/HighLevelTab";
import { defaultCinematographyPrompt } from "@/service/simulation/instruction/high-level/constant";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  addInstruction,
  editInstruction,
  deleteInstruction,
} from "@/redux/slices/instructionsSlice";
import { resetForm, setEditingIndex } from "@/redux/slices/formSlice";
import { toast } from "react-toastify";

export const InstructionManagement: FC = () => {
  const dispatch = useAppDispatch();
  const subjectsInfo = useAppSelector((state) => state.subjects.subjectsInfo);
  const instructions = useAppSelector(
    (state) => state.instructions.instructions
  );
  const reduxCinematographyPrompt = useAppSelector(
    (state) => state.instructions.cinematographyPrompt
  );
  const currentInstruction = useAppSelector(
    (state) => state.form.currentInstruction
  );
  const editingIndex = useAppSelector((state) => state.form.editingIndex);

  const [activeTab, setActiveTab] = useState(0);
  const [cinematographyPrompt, setCinematographyPromptLocal] =
    useState<CinematographyPrompt>(
      reduxCinematographyPrompt || defaultCinematographyPrompt
    );

  useEffect(() => {
    if (subjectsInfo.length === 0 && activeTab > 0) {
      setActiveTab(0);
      toast.error(
        "Please generate subjects first before configuring instructions"
      );
    }
  }, [subjectsInfo, activeTab]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    if (subjectsInfo.length === 0 && newValue > 0) {
      toast.error(
        "Please generate subjects first before configuring instructions"
      );
      return;
    }
    setActiveTab(newValue);
  };

  const handleAddOrUpdateInstruction = () => {
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

  const handleEdit = (index: number) => {
    dispatch(resetForm(instructions[index]));
    dispatch(setEditingIndex(index));
    setActiveTab(2);
  };

  const handleDelete = (index: number) => {
    dispatch(deleteInstruction(index));
  };

  return (
    <Box>
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Tab
          label="Text Prompt"
          sx={{ px: 1, py: 0.5, fontSize: 12, fontWeight: 700 }}
        />
        <Tab
          label="Cinematography Language"
          sx={{ px: 1, py: 0.5, fontSize: 12, fontWeight: 700 }}
        />
        <Tab
          label="Simulation Instructions"
          sx={{ px: 1, py: 0.5, fontSize: 12, fontWeight: 700 }}
        />
      </Tabs>

      <Box sx={{ pt: 2 }}>
        {activeTab === 0 ? (
          <TextPromptTab />
        ) : activeTab === 1 ? (
          <HighLevelTab />
        ) : (
          <LowLevelTab />
        )}
      </Box>
    </Box>
  );
};
