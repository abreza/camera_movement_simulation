import React, { FC, useState } from "react";
import { Button, Divider, IconButton, Stack, Typography } from "@mui/material";
import { Download } from "@mui/icons-material";
import {
  CinematographyInstruction,
  MovementEasing,
  CameraVerticalAngle,
  ShotSize,
  CameraZoomMovement,
  CameraSubjectDistance,
  CameraRotationMovement,
  CameraTranslationMovement,
  Scale,
  SubjectView,
  SubjectFraming,
  SubjectFramePosition,
  SubjectFrameZone,
} from "@/service/simulation/instruction/types";
import { SubjectInfo } from "@/service/subjects/types";
import { DEFAULT_FRAME_COUNT } from "@/service/simulation/constants";
import { InstructionList } from "./InstructionList";
import { SetupControls } from "./SetupControls";
import { MovementControls } from "./MovementControls";
import { GeneralSettings } from "./GeneralSettings";

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
  const [visibilityConstraint, setVisibilityConstraint] = useState<
    boolean | undefined
  >(true);

  // Initial Setup States
  const [initialCameraAngle, setInitialCameraAngle] = useState<
    CameraVerticalAngle | undefined
  >(CameraVerticalAngle.Eye);
  const [initialShotSize, setInitialShotSize] = useState<ShotSize | undefined>(
    ShotSize.MediumShot
  );
  const [initialSubjectView, setInitialSubjectView] = useState<
    SubjectView | undefined
  >(SubjectView.Front);
  const [initialSubjectFraming, setInitialSubjectFraming] = useState<
    SubjectFraming | undefined
  >({
    position: SubjectFramePosition.Center,
    zone: SubjectFrameZone.Inner,
    scale: Scale.Full,
  });

  // End Setup States
  const [endCameraAngle, setEndCameraAngle] = useState<
    CameraVerticalAngle | undefined
  >(undefined);
  const [endShotSize, setEndShotSize] = useState<ShotSize | undefined>(
    undefined
  );
  const [endSubjectView, setEndSubjectView] = useState<SubjectView | undefined>(
    undefined
  );
  const [endSubjectFraming, setEndSubjectFraming] = useState<
    SubjectFraming | undefined
  >();

  // Movement States
  const [translationType, setTranslationType] = useState<
    CameraTranslationMovement | undefined
  >();
  const [translationScale, setTranslationScale] = useState<Scale | undefined>(
    Scale.Medium
  );
  const [rotationType, setRotationType] = useState<
    CameraRotationMovement | undefined
  >();
  const [rotationScale, setRotationScale] = useState<Scale | undefined>(
    Scale.Medium
  );
  const [zoomType, setZoomType] = useState<CameraZoomMovement | undefined>();
  const [zoomScale, setZoomScale] = useState<Scale | undefined>(Scale.Medium);
  const [distanceType, setDistanceType] = useState<
    CameraSubjectDistance | undefined
  >();
  const [distanceScale, setDistanceScale] = useState<Scale | undefined>(
    Scale.Medium
  );

  const handleAddOrUpdateInstruction = () => {
    const instruction: CinematographyInstruction = {
      frameCount,
      movementEasing,
      subjectIndex: selectedSubjectIndex,
      initialSetup: {
        cameraAngle: initialCameraAngle,
        shotSize: initialShotSize,
        subjectView: initialSubjectView,
        subjectFraming: initialSubjectFraming,
      },
      endSetup:
        endCameraAngle || endShotSize || endSubjectView || endSubjectFraming
          ? {
              cameraAngle: endCameraAngle,
              shotSize: endShotSize,
              subjectView: endSubjectView,
              subjectFraming: endSubjectFraming,
            }
          : undefined,
      movement: {
        translation: translationType
          ? { type: translationType, scale: translationScale }
          : undefined,
        rotation: rotationType
          ? { type: rotationType, scale: rotationScale }
          : undefined,
        zoom: zoomType ? { type: zoomType, scale: zoomScale } : undefined,
      },
      constraints: {
        allFramesVisibility: visibilityConstraint,
        distance: distanceType
          ? { type: distanceType, scale: distanceScale }
          : undefined,
        staticPosition: false,
        staticRotation: false,
      },
    };

    if (editingIndex !== null) {
      onEditInstruction(editingIndex, instruction);
      setEditingIndex(null);
    } else {
      onAddInstruction(instruction);
    }

    resetForm();
  };

  const resetForm = () => {
    setFrameCount(DEFAULT_FRAME_COUNT);
    setMovementEasing(MovementEasing.Linear);
    setSelectedSubjectIndex(0);
    setVisibilityConstraint(true);

    // Reset initial setup
    setInitialCameraAngle(CameraVerticalAngle.Eye);
    setInitialShotSize(ShotSize.MediumShot);
    setInitialSubjectView(SubjectView.Front);
    setInitialSubjectFraming({
      position: SubjectFramePosition.Center,
      zone: SubjectFrameZone.Inner,
      scale: Scale.Full,
    });

    // Reset end setup
    setEndCameraAngle(undefined);
    setEndShotSize(undefined);
    setEndSubjectView(undefined);
    setEndSubjectFraming(undefined);

    // Reset movements
    setTranslationType(undefined);
    setTranslationScale(Scale.Medium);
    setRotationType(undefined);
    setRotationScale(Scale.Medium);
    setZoomType(undefined);
    setZoomScale(Scale.Medium);
    setDistanceType(undefined);
    setDistanceScale(Scale.Medium);
  };

  const handleEdit = (index: number) => {
    const instruction = instructions[index];
    setFrameCount(instruction.frameCount);
    setMovementEasing(instruction.movementEasing);
    setSelectedSubjectIndex(instruction.subjectIndex);
    setVisibilityConstraint(instruction.constraints?.allFramesVisibility);

    // Set initial setup
    setInitialCameraAngle(instruction.initialSetup?.cameraAngle);
    setInitialShotSize(instruction.initialSetup?.shotSize);
    setInitialSubjectView(instruction.initialSetup?.subjectView);
    setInitialSubjectFraming(instruction.initialSetup?.subjectFraming);

    // Set end setup
    setEndCameraAngle(instruction.endSetup?.cameraAngle);
    setEndShotSize(instruction.endSetup?.shotSize);
    setEndSubjectView(instruction.endSetup?.subjectView);
    setEndSubjectFraming(instruction.endSetup?.subjectFraming);

    // Set movement
    setTranslationType(instruction.movement?.translation?.type);
    setTranslationScale(instruction.movement?.translation?.scale);
    setRotationType(instruction.movement?.rotation?.type);
    setRotationScale(instruction.movement?.rotation?.scale);
    setZoomType(instruction.movement?.zoom?.type);
    setZoomScale(instruction.movement?.zoom?.scale);
    setDistanceType(instruction.constraints?.distance?.type);
    setDistanceScale(instruction.constraints?.distance?.scale);

    setEditingIndex(index);
  };

  return (
    <div className="max-h-screen overflow-y-auto p-4">
      <InstructionList
        instructions={instructions}
        onEdit={handleEdit}
        onDelete={onDeleteInstruction}
      />

      <SetupControls
        isInitial={true}
        cameraAngle={initialCameraAngle}
        setCameraAngle={setInitialCameraAngle}
        shotSize={initialShotSize}
        setShotSize={setInitialShotSize}
        subjectView={initialSubjectView}
        setSubjectView={setInitialSubjectView}
        subjectFraming={initialSubjectFraming}
        setSubjectFraming={setInitialSubjectFraming}
      />

      <Divider sx={{ my: 2 }} />

      <SetupControls
        isInitial={false}
        cameraAngle={endCameraAngle}
        setCameraAngle={setEndCameraAngle}
        shotSize={endShotSize}
        setShotSize={setEndShotSize}
        subjectView={endSubjectView}
        setSubjectView={setEndSubjectView}
        subjectFraming={endSubjectFraming}
        setSubjectFraming={setEndSubjectFraming}
      />

      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
        Camera Movement
      </Typography>

      <MovementControls
        translationType={translationType}
        setTranslationType={setTranslationType}
        translationScale={translationScale}
        setTranslationScale={setTranslationScale}
        rotationType={rotationType}
        setRotationType={setRotationType}
        rotationScale={rotationScale}
        setRotationScale={setRotationScale}
        zoomType={zoomType}
        setZoomType={setZoomType}
        zoomScale={zoomScale}
        setZoomScale={setZoomScale}
        />

      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
        General Settings
      </Typography>

      <GeneralSettings
        frameCount={frameCount}
        setFrameCount={setFrameCount}
        movementEasing={movementEasing}
        setMovementEasing={setMovementEasing}
        selectedSubjectIndex={selectedSubjectIndex}
        setSelectedSubjectIndex={setSelectedSubjectIndex}
        allFramesVisibility={visibilityConstraint}
        setAllFramesVisibility={setVisibilityConstraint}
        subjectsInfo={subjectsInfo}
        distanceType={distanceType}
        setDistanceType={setDistanceType}
        distanceScale={distanceScale}
        setDistanceScale={setDistanceScale}
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
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton
            color="primary"
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
    </div>
  );
};

export default InstructionManagement;
