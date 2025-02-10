import React, { FC, useState } from "react";
import { Box, Tab, Tabs } from "@mui/material";
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

  const { formState, setters, resetForm } = useInstructionForm();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAddOrUpdateInstruction = () => {
    if (editingIndex !== null) {
      onEditInstruction(editingIndex, formState);
      setEditingIndex(null);
    } else {
      onAddInstruction(formState);
    }

    resetForm();
  };

  const handleEdit = (index: number) => {
    resetForm(instructions[index]);
    setEditingIndex(index);
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

      <Box sx={{ pt: 1 }}>
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
              const instruction =
                translatePromptToSimulationInstruction(cinematographyPrompt);
              resetForm(instruction);
              setActiveTab(2);
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
    </Box>
  );
};

export default InstructionManagement;
