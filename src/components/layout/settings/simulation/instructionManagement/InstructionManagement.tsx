import React, { FC, useState, useEffect } from "react";
import { Box, Tab, Tabs, Alert, Snackbar } from "@mui/material";
import {
  CinematographyPrompt,
  SimulationInstruction,
} from "@/service/simulation/instruction/types";
import { SubjectInfo } from "@/service/subjects/types";
import { TextPromptTab } from "./textPrompt/TextPromptTab";
import LowLevelTab from "./lowLevel/LowLevelTab";
import { useInstructionForm } from "../../../../../hooks/useInstructionForm";
import { HighLevelTab } from "./highLevel/HighLevelTab";
import { translatePromptToSimulationInstruction } from "@/service/simulation/instruction/high-level/translator";
import { defaultCinematographyPrompt } from "@/service/simulation/instruction/high-level/constant";

export interface InstructionManagementProps {
  subjectsInfo: SubjectInfo[];
  instructions: SimulationInstruction[];
  onAddInstruction: (instruction: SimulationInstruction) => void;
  onEditInstruction: (
    index: number,
    instruction: SimulationInstruction
  ) => void;
  onDeleteInstruction: (index: number) => void;
  onClose: () => void;
  renderSimulationData: () => void;
  downloadSimulationData: () => void;
}

export const InstructionManagement: FC<InstructionManagementProps> = ({
  subjectsInfo,
  instructions,
  onAddInstruction,
  onEditInstruction,
  onDeleteInstruction,
  onClose,
  renderSimulationData,
  downloadSimulationData,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [cinematographyPrompt, setCinematographyPrompt] =
    useState<CinematographyPrompt>(defaultCinematographyPrompt);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const { formState, setters, resetForm } = useInstructionForm();

  useEffect(() => {
    if (subjectsInfo.length === 0 && activeTab > 0) {
      setActiveTab(0);
      setSnackbarMessage(
        "Please generate subjects first before configuring instructions"
      );
      setSnackbarOpen(true);
    }
  }, [subjectsInfo, activeTab]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    if (subjectsInfo.length === 0 && newValue > 0) {
      setSnackbarMessage(
        "Please generate subjects first before configuring instructions"
      );
      setSnackbarOpen(true);
      return;
    }
    setActiveTab(newValue);
  };

  const handleAddOrUpdateInstruction = () => {
    if (
      !formState.initialSetup.cameraAngle ||
      !formState.initialSetup.shotSize
    ) {
      setSnackbarMessage(
        "Please set camera angle and shot size in initial setup"
      );
      setSnackbarOpen(true);
      return;
    }

    if (
      formState.dynamic.type === "interpolation" &&
      !formState.dynamic.endSetup?.cameraAngle &&
      !formState.dynamic.endSetup?.shotSize
    ) {
      setSnackbarMessage(
        "Please set at least one end setup parameter for interpolation"
      );
      setSnackbarOpen(true);
      return;
    }

    if (editingIndex !== null) {
      onEditInstruction(editingIndex, formState);
      setEditingIndex(null);
    } else {
      onAddInstruction(formState);
    }

    resetForm();
    setSnackbarMessage("Instruction added successfully");
    setSnackbarOpen(true);
  };

  const handleEdit = (index: number) => {
    resetForm(instructions[index]);
    setEditingIndex(index);

    setActiveTab(2);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
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
          <TextPromptTab
            onTranslateSuccess={(cinPrompt) => {
              setCinematographyPrompt(cinPrompt);
              setActiveTab(1);
            }}
          />
        ) : activeTab === 1 ? (
          <HighLevelTab
            cinematographyPrompt={cinematographyPrompt}
            setCinematographyPrompt={setCinematographyPrompt}
            onTranslate={(cinematographyPrompt: CinematographyPrompt) => {
              try {
                const instruction =
                  translatePromptToSimulationInstruction(cinematographyPrompt);
                resetForm(instruction);
                setActiveTab(2);
              } catch (error) {
                console.error("Translation error:", error);
                setSnackbarMessage(
                  "Error translating to low-level instructions"
                );
                setSnackbarOpen(true);
              }
            }}
          />
        ) : (
          <LowLevelTab
            instructions={instructions}
            formState={formState}
            setters={setters}
            onEdit={handleEdit}
            onDelete={onDeleteInstruction}
            onAddOrUpdate={handleAddOrUpdateInstruction}
            editingIndex={editingIndex}
            subjectsInfo={subjectsInfo}
            onRender={renderSimulationData}
            onClose={onClose}
            onDownload={downloadSimulationData}
          />
        )}
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={
            snackbarMessage.includes("error") ||
            snackbarMessage.includes("Please")
              ? "error"
              : "success"
          }
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default InstructionManagement;
