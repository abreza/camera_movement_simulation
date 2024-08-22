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
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>(
    CameraAngle.EyeLevel
  );
  const [shotType, setShotType] = useState<ShotType>(ShotType.MediumShot);
  const [cameraMovement, setCameraMovement] = useState<CameraMovement>(
    CameraMovement.Pan
  );
  const [selectedSubjectIndex, setSelectedSubjectIndex] = useState(0);
  const [frameCount, setFrameCount] = useState<number>(100);

  const handleAddInstruction = () => {
    onAddInstruction({
      cameraAngle,
      shotType,
      cameraMovement,
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
                primary={`${instruction.cameraAngle} - ${instruction.shotType} - ${instruction.cameraMovement}`}
                secondary={`Subject ${instruction.subjectIndex + 1}, Frames: ${
                  instruction.frameCount
                }`}
              />
            </ListItem>
          ))}
        </List>
        <Select
          value={cameraAngle}
          onChange={(e) => setCameraAngle(e.target.value as CameraAngle)}
          fullWidth
          sx={{ mb: 2 }}
        >
          {Object.values(CameraAngle).map((angle) => (
            <MenuItem key={angle} value={angle}>
              {angle}
            </MenuItem>
          ))}
        </Select>
        <Select
          value={shotType}
          onChange={(e) => setShotType(e.target.value as ShotType)}
          fullWidth
          sx={{ mb: 2 }}
        >
          {Object.values(ShotType).map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </Select>
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
