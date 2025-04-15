import React, { FC } from "react";
import { IconButton, List, ListItem, ListItemText } from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { deleteInstruction } from "@/redux/slices/instructionsSlice";
import { resetForm, setEditingIndex } from "@/redux/slices/formSlice";

export const InstructionList: FC = () => {
  const dispatch = useAppDispatch();
  const instructions = useAppSelector(
    (state) => state.instructions.instructions
  );

  const handleEdit = (index: number) => {
    dispatch(resetForm(instructions[index]));
    dispatch(setEditingIndex(index));
  };

  const handleDelete = (index: number) => {
    dispatch(deleteInstruction(index));
  };

  return (
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
              instruction.dynamic.easing
            }`}
          />
          <IconButton size="small" onClick={() => handleEdit(index)}>
            <Edit fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => handleDelete(index)}>
            <Delete fontSize="small" />
          </IconButton>
        </ListItem>
      ))}
    </List>
  );
};

export default InstructionList;
