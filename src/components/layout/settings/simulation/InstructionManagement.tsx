import React, { FC, useState } from "react";
import {
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import { Edit, Delete, Download } from "@mui/icons-material";
import {
  CameraAngle,
  CameraMovement,
  CinematographyInstruction,
  MovementEasing,
  ShotType,
  Subject,
} from "@/types/simulation";

interface InstructionManagementProps {
  subjects: Subject[];
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
  subjects,
  instructions,
  onAddInstruction,
  onEditInstruction,
  onDeleteInstruction,
  onClose,
  renderSimulationData,
  downloadSimulationData,
}) => {
  const [cameraMovement, setCameraMovement] = useState<CameraMovement>(
    CameraMovement.ShortZoomIn
  );
  const [frameCount, setFrameCount] = useState<number>(100);
  const [initialCameraAngle, setInitialCameraAngle] = useState<
    CameraAngle | undefined
  >(CameraAngle.LowAngle);
  const [initialShotType, setInitialShotType] = useState<ShotType | undefined>(
    ShotType.MediumShot
  );
  const [movementEasing, setMovementEasing] = useState<MovementEasing>(
    MovementEasing.Linear
  );
  const [selectedSubjectIndex, setSelectedSubjectIndex] = useState<
    number | undefined
  >(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleAddOrUpdateInstruction = () => {
    const instruction: CinematographyInstruction = {
      cameraMovement,
      frameCount,
      initialCameraAngle,
      initialShotType,
      movementEasing,
      subjectIndex: selectedSubjectIndex,
    };

    if (editingIndex !== null) {
      onEditInstruction(editingIndex, instruction);
      setEditingIndex(null);
    } else {
      onAddInstruction(instruction);
    }

    // Reset form
    setCameraMovement(CameraMovement.ShortZoomIn);
    setFrameCount(100);
    setInitialCameraAngle(CameraAngle.LowAngle);
    setInitialShotType(ShotType.MediumShot);
    setMovementEasing(MovementEasing.Linear);
    setSelectedSubjectIndex(0);
  };

  const handleEdit = (index: number) => {
    const instruction = instructions[index];
    setCameraMovement(instruction.cameraMovement);
    setFrameCount(instruction.frameCount);
    setInitialCameraAngle(instruction.initialCameraAngle);
    setInitialShotType(instruction.initialShotType);
    setMovementEasing(instruction.movementEasing);
    setSelectedSubjectIndex(instruction.subjectIndex);
    setEditingIndex(index);
  };

  return (
    <>
      <List dense>
        {instructions.map((instruction, index) => (
          <ListItem key={index}>
            <ListItemText
              primary={`${instruction.cameraMovement} - ${
                instruction.initialCameraAngle || "N/A"
              } - ${instruction.initialShotType || "N/A"}`}
              secondary={`Subject ${
                instruction.subjectIndex !== undefined
                  ? instruction.subjectIndex + 1
                  : "N/A"
              }, Frames: ${instruction.frameCount}, Easing: ${
                instruction.movementEasing
              }`}
            />
            <IconButton size="small" onClick={() => handleEdit(index)}>
              <Edit fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => onDeleteInstruction(index)}>
              <Delete fontSize="small" />
            </IconButton>
          </ListItem>
        ))}
      </List>
      <Select
        value={cameraMovement}
        onChange={(e) => setCameraMovement(e.target.value as CameraMovement)}
        fullWidth
        sx={{ mb: 2 }}
        size="small"
      >
        {Object.values(CameraMovement).map((movement) => (
          <MenuItem key={movement} value={movement}>
            {movement}
          </MenuItem>
        ))}
      </Select>
      <Select
        value={initialCameraAngle}
        onChange={(e) => setInitialCameraAngle(e.target.value as CameraAngle)}
        fullWidth
        sx={{ mb: 2 }}
        size="small"
      >
        <MenuItem value={undefined}>No initial camera angle</MenuItem>
        {Object.values(CameraAngle).map((angle) => (
          <MenuItem key={angle} value={angle}>
            {angle}
          </MenuItem>
        ))}
      </Select>
      <Select
        value={initialShotType}
        onChange={(e) => setInitialShotType(e.target.value as ShotType)}
        fullWidth
        sx={{ mb: 2 }}
        size="small"
      >
        <MenuItem value={undefined}>No initial shot type</MenuItem>
        {Object.values(ShotType).map((type) => (
          <MenuItem key={type} value={type}>
            {type}
          </MenuItem>
        ))}
      </Select>
      <Select
        value={movementEasing}
        onChange={(e) => setMovementEasing(e.target.value as MovementEasing)}
        fullWidth
        sx={{ mb: 2 }}
        size="small"
      >
        {Object.values(MovementEasing).map((easing) => (
          <MenuItem key={easing} value={easing}>
            {easing}
          </MenuItem>
        ))}
      </Select>
      <Select
        value={selectedSubjectIndex}
        onChange={(e) =>
          setSelectedSubjectIndex(
            e.target.value === "undefined" ? undefined : +e.target.value
          )
        }
        fullWidth
        sx={{ mb: 2 }}
        size="small"
      >
        <MenuItem value="undefined">No subject</MenuItem>
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
        size="small"
      />
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={handleAddOrUpdateInstruction}
        sx={{ mb: 2 }}
        size="small"
      >
        {editingIndex !== null ? "Update Instruction" : "Add Instruction"}
      </Button>
      {instructions.length > 0 && (
        <Stack direction="row" alignItems="center">
          <IconButton
            color="warning"
            onClick={downloadSimulationData}
            size="small"
          >
            <Download fontSize="small" />
          </IconButton>
          <Button
            variant="contained"
            color="warning"
            onClick={() => {
              onClose();
              renderSimulationData();
            }}
            sx={{ flexGrow: 1 }}
            size="small"
          >
            Render
          </Button>
        </Stack>
      )}
    </>
  );
};
