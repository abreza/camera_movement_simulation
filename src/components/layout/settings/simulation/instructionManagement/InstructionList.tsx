import React, { FC } from "react";
import { IconButton, List, ListItem, ListItemText } from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import { CinematographyInstruction } from "@/service/simulation/instruction/types";

interface InstructionListProps {
  instructions: CinematographyInstruction[];
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

export const InstructionList: FC<InstructionListProps> = ({
  instructions,
  onEdit,
  onDelete,
}) => (
  <List dense>
    {instructions.map((instruction, index) => (
      <ListItem key={index}>
        <ListItemText
          primary={`${instruction.initialSetup?.cameraAngle} - ${instruction.initialSetup?.shotSize}`}
          secondary={`Subject ${
            instruction.subjectIndex !== undefined
              ? instruction.subjectIndex + 1
              : "N/A"
          }
          Frames: ${instruction.frameCount}, Easing: ${
            instruction.movementEasing
          }`}
        />
        <IconButton size="small" onClick={() => onEdit(index)}>
          <Edit fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={() => onDelete(index)}>
          <Delete fontSize="small" />
        </IconButton>
      </ListItem>
    ))}
  </List>
);
