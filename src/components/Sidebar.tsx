"use client";

import React, { useState } from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemText,
  Select,
  MenuItem,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Stack,
} from "@mui/material";
import { Instruction, InstructionType, Subject } from "@/types/simulation";
import { Download } from "@mui/icons-material";

interface SidebarProps {
  open: boolean;
  subjects: Subject[];
  instructions: Instruction[];
  onClose: () => void;
  onAddInstruction: (instruction: Instruction) => void;
  renderSimulationData: () => void;
  downloadSimulationData: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  open,
  subjects,
  instructions,
  onClose,
  onAddInstruction,
  renderSimulationData,
  downloadSimulationData,
}) => {
  const [instructionType, setInstructionType] = useState(
    InstructionType.zoomIn
  );
  const [selectedSubjectIndex, setSelectedSubjectIndex] = useState(0);
  const [frameCount, setFrameCount] = useState<number>(100);

  const handleAddInstruction = () => {
    onAddInstruction({
      type: instructionType,
      subjectIndex: selectedSubjectIndex,
      frameCount,
    });
  };

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        width: 250,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 250,
          boxSizing: "border-box",
        },
      }}
    >
      <Box sx={{ overflow: "auto", p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Instructions
        </Typography>
        <List>
          {instructions.map((instruction, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={`${instruction.type} - Subject ${
                  instruction.subjectIndex + 1
                }`}
                secondary={`frames: ${instruction.frameCount}`}
              />
            </ListItem>
          ))}
        </List>
        <Select
          value={instructionType}
          onChange={(e) =>
            setInstructionType(e.target.value as InstructionType)
          }
          fullWidth
          sx={{ mb: 2 }}
        >
          <MenuItem value={InstructionType.zoomIn}>Zoom In</MenuItem>
          <MenuItem value={InstructionType.zoomOut}>Zoom Out</MenuItem>
          <MenuItem value={InstructionType.moveAround}>Move Around</MenuItem>
        </Select>
        <Select
          value={selectedSubjectIndex}
          onChange={(e) => setSelectedSubjectIndex(+e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        >
          {subjects.map((_, index) => (
            <MenuItem key={index} value={index}>{`Subject ${
              index + 1
            }`}</MenuItem>
          ))}
        </Select>
        <TextField
          type="number"
          label="Frames Count"
          value={frameCount}
          onChange={(e) => setFrameCount(Number(e.target.value))}
          fullWidth
          sx={{ mb: 2 }}
          InputProps={{ inputProps: { min: 100, step: 100 } }}
        />
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleAddInstruction}
          sx={{ mb: 2 }}
        >
          Add Instruction
        </Button>
        {instructions.length > 0 && (
          <Stack direction="row" alignItems="center">
            <IconButton color="warning" onClick={downloadSimulationData}>
              <Download />
            </IconButton>
            <Button
              variant="contained"
              color="warning"
              onClick={renderSimulationData}
              sx={{ flexGrow: 1 }}
            >
              Render
            </Button>
          </Stack>
        )}
      </Box>
    </Drawer>
  );
};

export default Sidebar;
