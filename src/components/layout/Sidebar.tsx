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
import {
  Subject,
  CinematographyInstruction,
  CameraAngle,
  ShotType,
  CameraMovement,
  MovementEasing,
} from "@/types/simulation";
import { Download } from "@mui/icons-material";

interface SidebarProps {
  open: boolean;
  subjects: Subject[];
  instructions: CinematographyInstruction[];
  onClose: () => void;
  onAddInstruction: (instruction: CinematographyInstruction) => void;
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

  const handleAddInstruction = () => {
    onAddInstruction({
      cameraMovement,
      frameCount,
      initialCameraAngle,
      initialShotType,
      movementEasing,
      subjectIndex: selectedSubjectIndex,
    });
  };

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        width: 300,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 300,
          boxSizing: "border-box",
        },
      }}
    >
      <Box sx={{ overflow: "auto", p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Cinematography Instructions
        </Typography>
        <List>
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
            </ListItem>
          ))}
        </List>
        <Select
          value={cameraMovement}
          onChange={(e) => setCameraMovement(e.target.value as CameraMovement)}
          fullWidth
          sx={{ mb: 2 }}
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
              onClick={() => {
                onClose();
                renderSimulationData();
              }}
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
