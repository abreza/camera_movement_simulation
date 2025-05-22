import React, { FC, useState, useEffect } from "react";
import { Box, Tab, Tabs } from "@mui/material";
import { TextPromptTab } from "./textPrompt/TextPromptTab";
import LowLevelTab from "./lowLevel/LowLevelTab";
import { HighLevelTab } from "./highLevel/HighLevelTab";
import { useAppSelector } from "@/redux/hooks";
import { toast } from "react-toastify";

export const InstructionManagement: FC = () => {
  const subjectsInfo = useAppSelector((state) => state.subjects.subjectsInfo);

  const [activeTab, setActiveTab] = useState(0);

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
          <HighLevelTab onNavigateToLowLevel={() => setActiveTab(2)} />
        ) : (
          <LowLevelTab />
        )}
      </Box>
    </Box>
  );
};
