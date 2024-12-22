import React, { FC, useState } from "react";
import {
  Button,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Edit, Delete, Download } from "@mui/icons-material";
import {
  CinematographyInstruction,
  MovementEasing,
  CameraVerticalAngle,
  ShotSize,
  CameraZoomMovement,
  CameraSubjectDistanceMovement,
  CameraRotationMovement,
  CameraTranslationMovement,
  MovementScale,
  SubjectView,
  SubjectInfo,
  DEFAULT_FRAME_COUNT,
} from "@/types/simulation";

interface InstructionManagementProps {
  subjectsInfo: SubjectInfo[];
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
  subjectsInfo,
  instructions,
  onAddInstruction,
  onEditInstruction,
  onDeleteInstruction,
  onClose,
  renderSimulationData,
  downloadSimulationData,
}) => {
  const [frameCount, setFrameCount] = useState<number>(DEFAULT_FRAME_COUNT);
  const [movementEasing, setMovementEasing] = useState<MovementEasing>(
    MovementEasing.Linear
  );
  const [selectedSubjectIndex, setSelectedSubjectIndex] = useState<
    number | undefined
  >(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Initial Setup States
  const [initialDistance, setInitialDistance] = useState<number>(5);
  const [initialCameraAngle, setInitialCameraAngle] =
    useState<CameraVerticalAngle>(CameraVerticalAngle.Eye);
  const [initialShotSize, setInitialShotSize] = useState<ShotSize>(
    ShotSize.MediumShot
  );
  const [initialSubjectView, setInitialSubjectView] = useState<SubjectView>(
    SubjectView.Front
  );

  // Movement States
  const [translationType, setTranslationType] =
    useState<CameraTranslationMovement>(CameraTranslationMovement.Static);
  const [translationScale, setTranslationScale] = useState<MovementScale>(
    MovementScale.Medium
  );

  const [rotationType, setRotationType] = useState<CameraRotationMovement>(
    CameraRotationMovement.Static
  );
  const [rotationScale, setRotationScale] = useState<MovementScale>(
    MovementScale.Medium
  );

  const [zoomType, setZoomType] = useState<CameraZoomMovement>(
    CameraZoomMovement.Static
  );
  const [zoomScale, setZoomScale] = useState<MovementScale>(
    MovementScale.Medium
  );

  const [distanceType, setDistanceType] =
    useState<CameraSubjectDistanceMovement>(
      CameraSubjectDistanceMovement.Static
    );
  const [distanceScale, setDistanceScale] = useState<MovementScale>(
    MovementScale.Medium
  );

  const handleAddOrUpdateInstruction = () => {
    const instruction: CinematographyInstruction = {
      frameCount,
      movementEasing,
      subjectIndex: selectedSubjectIndex,
      initialSetup: {
        distance: initialDistance,
        cameraAngle: initialCameraAngle,
        shotSize: initialShotSize,
        subjectView: initialSubjectView,
      },
      movement: {
        translation:
          translationType !== CameraTranslationMovement.Static
            ? {
                type: translationType,
                scale: translationScale,
              }
            : undefined,
        rotation:
          rotationType !== CameraRotationMovement.Static
            ? {
                type: rotationType,
                scale: rotationScale,
              }
            : undefined,
        zoom:
          zoomType !== CameraZoomMovement.Static
            ? {
                type: zoomType,
                scale: zoomScale,
              }
            : undefined,
        distance:
          distanceType !== CameraSubjectDistanceMovement.Static
            ? {
                type: distanceType,
                scale: distanceScale,
              }
            : undefined,
      },
    };

    if (editingIndex !== null) {
      onEditInstruction(editingIndex, instruction);
      setEditingIndex(null);
    } else {
      onAddInstruction(instruction);
    }

    // Reset form to defaults
    setFrameCount(100);
    setMovementEasing(MovementEasing.Linear);
    setSelectedSubjectIndex(0);
    setInitialDistance(5);
    setInitialCameraAngle(CameraVerticalAngle.Eye);
    setInitialShotSize(ShotSize.MediumShot);
    setInitialSubjectView(SubjectView.Front);
    setTranslationType(CameraTranslationMovement.Static);
    setRotationType(CameraRotationMovement.Static);
    setZoomType(CameraZoomMovement.Static);
    setDistanceType(CameraSubjectDistanceMovement.Static);
  };

  const handleEdit = (index: number) => {
    const instruction = instructions[index];
    setFrameCount(instruction.frameCount);
    setMovementEasing(instruction.movementEasing);
    setSelectedSubjectIndex(instruction.subjectIndex);

    // Initial setup
    setInitialDistance(instruction.initialSetup.distance || 5);
    setInitialCameraAngle(
      instruction.initialSetup.cameraAngle || CameraVerticalAngle.Eye
    );
    setInitialShotSize(
      instruction.initialSetup.shotSize || ShotSize.MediumShot
    );
    setInitialSubjectView(
      instruction.initialSetup.subjectView || SubjectView.Front
    );

    // Movement
    setTranslationType(
      instruction.movement.translation?.type || CameraTranslationMovement.Static
    );
    setTranslationScale(
      instruction.movement.translation?.scale || MovementScale.Medium
    );

    setRotationType(
      instruction.movement.rotation?.type || CameraRotationMovement.Static
    );
    setRotationScale(
      instruction.movement.rotation?.scale || MovementScale.Medium
    );

    setZoomType(instruction.movement.zoom?.type || CameraZoomMovement.Static);
    setZoomScale(instruction.movement.zoom?.scale || MovementScale.Medium);

    setDistanceType(
      instruction.movement.distance?.type ||
        CameraSubjectDistanceMovement.Static
    );
    setDistanceScale(
      instruction.movement.distance?.scale || MovementScale.Medium
    );

    setEditingIndex(index);
  };

  return (
    <>
      <List dense>
        {instructions.map((instruction, index) => (
          <ListItem key={index}>
            <ListItemText
              primary={`${instruction.initialSetup.cameraAngle} - ${instruction.initialSetup.shotSize}`}
              secondary={`Subject ${
                instruction.subjectIndex !== undefined
                  ? instruction.subjectIndex + 1
                  : "N/A"
              }
                        Frames: ${instruction.frameCount}, Easing: ${
                instruction.movementEasing
              }
                        Movements: ${Object.entries(instruction.movement)
                          .filter(([_, value]) => value !== undefined)
                          .map(([key, value]) => `${key}: ${value.type}`)
                          .join(", ")}`}
            />
            <IconButton
              size="small"
              onClick={() => handleEdit(index)}
              aria-label="Edit instruction"
            >
              <Edit fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => onDeleteInstruction(index)}
              aria-label="Delete instruction"
            >
              <Delete fontSize="small" />
            </IconButton>
          </ListItem>
        ))}
      </List>

      {/* Initial Setup Section */}
      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
        Initial Setup
      </Typography>

      <TextField
        type="number"
        label="Initial Camera Distance"
        value={initialDistance}
        onChange={(e) => setInitialDistance(Number(e.target.value))}
        fullWidth
        sx={{ mb: 2 }}
        size="small"
        helperText="Distance between camera and subject"
      />

      <FormControl fullWidth sx={{ mb: 2 }} size="small">
        <InputLabel>Camera Vertical Angle</InputLabel>
        <Select
          value={initialCameraAngle}
          onChange={(e) =>
            setInitialCameraAngle(e.target.value as CameraVerticalAngle)
          }
          label="Camera Vertical Angle"
        >
          {Object.values(CameraVerticalAngle).map((angle) => (
            <MenuItem key={angle} value={angle}>
              {angle}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 2 }} size="small">
        <InputLabel>Shot Size</InputLabel>
        <Select
          value={initialShotSize}
          onChange={(e) => setInitialShotSize(e.target.value as ShotSize)}
          label="Shot Size"
        >
          {Object.values(ShotSize).map((size) => (
            <MenuItem key={size} value={size}>
              {size}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 2 }} size="small">
        <InputLabel>Subject View</InputLabel>
        <Select
          value={initialSubjectView}
          onChange={(e) => setInitialSubjectView(e.target.value as SubjectView)}
          label="Subject View"
        >
          {Object.values(SubjectView).map((view) => (
            <MenuItem key={view} value={view}>
              {view}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Movement Controls Section */}
      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
        Camera Movement
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Translation Movement</InputLabel>
          <Select
            value={translationType}
            onChange={(e) =>
              setTranslationType(e.target.value as CameraTranslationMovement)
            }
            label="Translation Movement"
          >
            {Object.values(CameraTranslationMovement).map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {translationType !== CameraTranslationMovement.Static && (
          <FormControl fullWidth size="small">
            <InputLabel>Translation Scale</InputLabel>
            <Select
              value={translationScale}
              onChange={(e) =>
                setTranslationScale(e.target.value as MovementScale)
              }
              label="Translation Scale"
            >
              {Object.values(MovementScale).map((scale) => (
                <MenuItem key={scale} value={scale}>
                  {scale}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Rotation Movement</InputLabel>
          <Select
            value={rotationType}
            onChange={(e) =>
              setRotationType(e.target.value as CameraRotationMovement)
            }
            label="Rotation Movement"
          >
            {Object.values(CameraRotationMovement).map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {rotationType !== CameraRotationMovement.Static && (
          <FormControl fullWidth size="small">
            <InputLabel>Rotation Scale</InputLabel>
            <Select
              value={rotationScale}
              onChange={(e) =>
                setRotationScale(e.target.value as MovementScale)
              }
              label="Rotation Scale"
            >
              {Object.values(MovementScale).map((scale) => (
                <MenuItem key={scale} value={scale}>
                  {scale}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Zoom Movement</InputLabel>
          <Select
            value={zoomType}
            onChange={(e) => setZoomType(e.target.value as CameraZoomMovement)}
            label="Zoom Movement"
          >
            {Object.values(CameraZoomMovement).map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {zoomType !== CameraZoomMovement.Static && (
          <FormControl fullWidth size="small">
            <InputLabel>Zoom Scale</InputLabel>
            <Select
              value={zoomScale}
              onChange={(e) => setZoomScale(e.target.value as MovementScale)}
              label="Zoom Scale"
            >
              {Object.values(MovementScale).map((scale) => (
                <MenuItem key={scale} value={scale}>
                  {scale}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Distance Movement</InputLabel>
          <Select
            value={distanceType}
            onChange={(e) =>
              setDistanceType(e.target.value as CameraSubjectDistanceMovement)
            }
            label="Distance Movement"
          >
            {Object.values(CameraSubjectDistanceMovement).map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {distanceType !== CameraSubjectDistanceMovement.Static && (
          <FormControl fullWidth size="small">
            <InputLabel>Distance Scale</InputLabel>
            <Select
              value={distanceScale}
              onChange={(e) =>
                setDistanceScale(e.target.value as MovementScale)
              }
              label="Distance Scale"
            >
              {Object.values(MovementScale).map((scale) => (
                <MenuItem key={scale} value={scale}>
                  {scale}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Stack>

      {/* Common Controls Section */}
      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
        General Settings
      </Typography>

      <FormControl fullWidth sx={{ mb: 2 }} size="small">
        <InputLabel>Movement Easing</InputLabel>
        <Select
          value={movementEasing}
          onChange={(e) => setMovementEasing(e.target.value as MovementEasing)}
          label="Movement Easing"
        >
          {Object.values(MovementEasing).map((easing) => (
            <MenuItem key={easing} value={easing}>
              {easing}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 2 }} size="small">
        <InputLabel>Target Subject</InputLabel>
        <Select
          value={selectedSubjectIndex}
          onChange={(e) =>
            setSelectedSubjectIndex(
              e.target.value === "undefined" ? undefined : +e.target.value
            )
          }
          label="Target Subject"
        >
          <MenuItem value="undefined">No subject</MenuItem>
          {subjectsInfo.map((_, index) => (
            <MenuItem key={index} value={index}>{`Subject ${
              index + 1
            }`}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        type="number"
        label="Frame Count"
        value={frameCount}
        onChange={(e) => setFrameCount(Number(e.target.value))}
        fullWidth
        sx={{ mb: 2 }}
        size="small"
        InputProps={{ inputProps: { min: 100, step: 100 } }}
        helperText="Number of frames for this instruction (minimum 100)"
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
            aria-label="Download simulation data"
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
