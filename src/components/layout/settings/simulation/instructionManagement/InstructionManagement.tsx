import React, { FC, useState } from "react";
import { Box, Tab, Tabs } from "@mui/material";
import { CinematographyInstruction } from "@/service/simulation/instruction/types";
import { SubjectInfo } from "@/service/subjects/types";
import { TextPromptTab } from "./textPrompt/TextPromptTab";
import LowLevelTab from "./lowLevel/LowLevelTab";
import { useInstructionForm } from "./lowLevel/useInstructionForm";
import { HighLevelTab } from "./highLevel/HighLevelTab";

export interface InstructionManagementProps {
  subjectsInfo: SubjectInfo[];
  instructions: CinematographyInstruction[];
  onAddInstruction: (instruction: CinematographyInstruction) => void;
  onEditInstruction: (
    index: number,
    instruction: CinematographyInstruction
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
  const [activeTab, setActiveTab] = useState(2);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const { formState, setters, resetForm } = useInstructionForm();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleTranslateInstruction = () => {
    setActiveTab(1);
  };

  const handleAddOrUpdateInstruction = () => {
    const instruction: CinematographyInstruction = {
      frameCount: formState.frameCount,
      movementEasing: formState.movementEasing,
      subjectIndex: formState.selectedSubjectIndex,
      subjectAwareInterpolation: formState.subjectAwareInterpolation,
      initialSetup: {
        cameraAngle: formState.initialCameraAngle,
        shotSize: formState.initialShotSize,
        subjectView: formState.initialSubjectView,
        subjectFraming: formState.initialSubjectFraming,
      },
      endSetup:
        formState.endCameraAngle ||
        formState.endShotSize ||
        formState.endSubjectView ||
        formState.endSubjectFraming
          ? {
              cameraAngle: formState.endCameraAngle,
              shotSize: formState.endShotSize,
              subjectView: formState.endSubjectView,
              subjectFraming: formState.endSubjectFraming,
            }
          : undefined,
      constraints: {
        allFramesVisibility: formState.visibilityConstraint,
        distance: formState.distanceType
          ? { type: formState.distanceType, scale: formState.distanceScale }
          : undefined,
        staticPosition: { x: false, y: false, z: false },
        staticRotation: { x: false, y: false, z: false },
        importance: 1,
      },
    };

    if (editingIndex !== null) {
      onEditInstruction(editingIndex, instruction);
      setEditingIndex(null);
    } else {
      onAddInstruction(instruction);
    }

    resetForm();
  };

  const handleEdit = (index: number) => {
    const instruction = instructions[index];
    setters.setFrameCount(instruction.frameCount);
    setters.setMovementEasing(instruction.movementEasing);
    setters.setSelectedSubjectIndex(instruction.subjectIndex);
    setters.setVisibilityConstraint(
      instruction.constraints?.allFramesVisibility
    );

    setters.setInitialCameraAngle(instruction.initialSetup?.cameraAngle);
    setters.setInitialShotSize(instruction.initialSetup?.shotSize);
    setters.setInitialSubjectView(instruction.initialSetup?.subjectView);
    setters.setInitialSubjectFraming(instruction.initialSetup?.subjectFraming);

    setters.setEndCameraAngle(instruction.endSetup?.cameraAngle);
    setters.setEndShotSize(instruction.endSetup?.shotSize);
    setters.setEndSubjectView(instruction.endSetup?.subjectView);
    setters.setEndSubjectFraming(instruction.endSetup?.subjectFraming);

    setters.setDistanceType(instruction.constraints?.distance?.type);
    setters.setDistanceScale(instruction.constraints?.distance?.scale);
    setters.setSubjectAwareInterpolation(instruction.subjectAwareInterpolation);

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
          <TextPromptTab onTranslate={handleTranslateInstruction} />
        ) : activeTab === 1 ? (
          <HighLevelTab onTranslate={handleTranslateInstruction} />
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
