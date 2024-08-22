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
} from "@mui/material";
import { Instruction, InstructionType } from "@/types/instruction";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onAddInstruction: (instruction: Instruction) => void;
  onSimulate: () => void;
  onDownload: () => void;
  instructions: Instruction[];
  frameCount: number;
  setFrameCount: (frameCount: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  open,
  onClose,
  onAddInstruction,
  onSimulate,
  onDownload,
  instructions,
  frameCount,
  setFrameCount,
}) => {
  const [instructionType, setInstructionType] =
    useState<InstructionType>("zoomIn");
  const [subject, setSubject] = useState<string>("1");
  const [duration, setDuration] = useState<number>(2000);

  const handleAddInstruction = () => {
    onAddInstruction({
      type: instructionType,
      subject,
      duration,
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
                primary={`${instruction.type} - Subject ${instruction.subject}`}
                secondary={`Duration: ${instruction.duration}ms`}
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
          <MenuItem value="zoomIn">Zoom In</MenuItem>
          <MenuItem value="zoomOut">Zoom Out</MenuItem>
          <MenuItem value="moveAround">Move Around</MenuItem>
        </Select>
        <Select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        >
          <MenuItem value="1">Subject 1</MenuItem>
          <MenuItem value="2">Subject 2</MenuItem>
          <MenuItem value="3">Subject 3</MenuItem>
        </Select>
        <TextField
          type="number"
          label="Duration (ms)"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
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
        <TextField
          type="number"
          label="Frame Count"
          value={frameCount}
          onChange={(e) => setFrameCount(Number(e.target.value))}
          fullWidth
          sx={{ mb: 2 }}
          InputProps={{ inputProps: { min: 1, step: 1 } }}
        />
        <Button
          variant="contained"
          color="success"
          fullWidth
          onClick={onSimulate}
          sx={{ mb: 2 }}
        >
          Simulate
        </Button>
        <Button
          variant="contained"
          color="warning"
          fullWidth
          onClick={onDownload}
        >
          Download JSON
        </Button>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
