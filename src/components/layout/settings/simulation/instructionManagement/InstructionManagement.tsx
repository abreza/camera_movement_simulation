import React, { FC, useState, useEffect } from "react";
import { Box, Tab, Tabs, alpha } from "@mui/material";
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
      <Box
        sx={{
          mb: 2,
          backgroundColor: alpha("#000000", 0.2),
          borderRadius: 1.5,
          border: `1px solid ${alpha("#FFFFFF", 0.04)}`,
          p: 0.5,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            minHeight: 36,
            "& .MuiTabs-indicator": {
              height: "100%",
              borderRadius: 1,
              backgroundColor: alpha("#E8753A", 0.15),
              border: `1px solid ${alpha("#E8753A", 0.25)}`,
              zIndex: 0,
            },
            "& .MuiTab-root": {
              minHeight: 36,
              py: 0,
              px: 1,
              fontSize: "0.7rem",
              fontWeight: 600,
              zIndex: 1,
              color: "text.secondary",
              transition: "color 0.2s ease",
              "&.Mui-selected": {
                color: "#E8753A",
              },
            },
          }}
        >
          <Tab label="Text" />
          <Tab label="Cinematography" />
          <Tab label="Low-Level" />
        </Tabs>
      </Box>
      <Box>
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
