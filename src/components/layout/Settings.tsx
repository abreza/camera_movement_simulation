import { FC, forwardRef, ReactElement, Ref, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Slide,
  Stack,
  TextField,
} from "@mui/material";
import { TransitionProps } from "@mui/material/transitions";
import {
  CameraAngle,
  CameraMovement,
  CinematographyInstruction,
  MovementEasing,
  ShotType,
  Subject,
} from "@/types/simulation";
import { Download, Edit, Delete } from "@mui/icons-material";

const Transition = forwardRef(function Transition(
  props: TransitionProps & {
    children: ReactElement;
  },
  ref: Ref<unknown>
) {
  return <Slide direction="right" ref={ref} {...props} />;
});

interface SettingsProps {
  open: boolean;
  subjects: Subject[];
  instructions: CinematographyInstruction[];
  onClose: () => void;
  onAddInstruction: (instruction: CinematographyInstruction) => void;
  onEditInstruction: (
    index: number,
    instruction: CinematographyInstruction
  ) => void;
  onDeleteInstruction: (index: number) => void;
  renderSimulationData: () => void;
  downloadSimulationData: () => void;
}

export const Settings: FC<SettingsProps> = ({
  open,
  subjects,
  instructions,
  onClose,
  onAddInstruction,
  onEditInstruction,
  onDeleteInstruction,
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
    <Dialog
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={onClose}
      aria-describedby="alert-dialog-slide-description"
      PaperProps={{
        style: {
          position: "fixed",
          left: 20,
          margin: 0,
        },
      }}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Cinematography Instructions</DialogTitle>
      <DialogContent>
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
              <IconButton onClick={() => handleEdit(index)}>
                <Edit />
              </IconButton>
              <IconButton onClick={() => onDeleteInstruction(index)}>
                <Delete />
              </IconButton>
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
          onClick={handleAddOrUpdateInstruction}
          sx={{ mb: 2 }}
        >
          {editingIndex !== null ? "Update Instruction" : "Add Instruction"}
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
      </DialogContent>
    </Dialog>
  );
};
