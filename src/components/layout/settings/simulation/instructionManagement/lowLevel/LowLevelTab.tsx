import React, { FC } from "react";
import {
  Box,
  Button,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { Download } from "@mui/icons-material";
import { InstructionList } from "./InstructionList";
import { SetupControls } from "./SetupControls";
import { GeneralSettings } from "./GeneralSettings";
import { CinematographyInstruction } from "@/service/simulation/instruction/types";
import { SubjectInfo } from "@/service/subjects/types";

interface LowLevelTabProps {
  instructions: CinematographyInstruction[];
  formState: {
    frameCount: number;
    movementEasing: any;
    selectedSubjectIndex?: number;
    visibilityConstraint?: boolean;
    subjectAwareInterpolation?: boolean;
    distanceType?: any;
    distanceScale?: any;
    initialCameraAngle?: any;
    initialShotSize?: any;
    initialSubjectView?: any;
    initialSubjectFraming?: any;
    endCameraAngle?: any;
    endShotSize?: any;
    endSubjectView?: any;
    endSubjectFraming?: any;
  };
  setters: {
    setFrameCount: (count: number) => void;
    setMovementEasing: (easing: any) => void;
    setSelectedSubjectIndex: (index: number | undefined) => void;
    setVisibilityConstraint: (visibility: boolean | undefined) => void;
    setSubjectAwareInterpolation: (mode: any) => void;
    setDistanceType: (type: any) => void;
    setDistanceScale: (scale: any) => void;
    setInitialCameraAngle: (angle: any) => void;
    setInitialShotSize: (size: any) => void;
    setInitialSubjectView: (view: any) => void;
    setInitialSubjectFraming: (framing: any) => void;
    setEndCameraAngle: (angle: any) => void;
    setEndShotSize: (size: any) => void;
    setEndSubjectView: (view: any) => void;
    setEndSubjectFraming: (framing: any) => void;
  };
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onAddOrUpdate: () => void;
  editingIndex: number | null;
  subjectsInfo: SubjectInfo[];
  onRender: () => void;
  onClose: () => void;
  onDownload: () => void;
}

export const LowLevelTab: FC<LowLevelTabProps> = ({
  instructions,
  formState,
  setters,
  onEdit,
  onDelete,
  onAddOrUpdate,
  editingIndex,
  subjectsInfo,
  onRender,
  onClose,
  onDownload,
}) => (
  <Box>
    <InstructionList
      instructions={instructions}
      onEdit={onEdit}
      onDelete={onDelete}
    />

    <SetupControls
      isInitial={true}
      cameraAngle={formState.initialCameraAngle}
      setCameraAngle={setters.setInitialCameraAngle}
      shotSize={formState.initialShotSize}
      setShotSize={setters.setInitialShotSize}
      subjectView={formState.initialSubjectView}
      setSubjectView={setters.setInitialSubjectView}
      subjectFraming={formState.initialSubjectFraming}
      setSubjectFraming={setters.setInitialSubjectFraming}
    />

    <Divider sx={{ my: 2 }} />

    <SetupControls
      isInitial={false}
      cameraAngle={formState.endCameraAngle}
      setCameraAngle={setters.setEndCameraAngle}
      shotSize={formState.endShotSize}
      setShotSize={setters.setEndShotSize}
      subjectView={formState.endSubjectView}
      setSubjectView={setters.setEndSubjectView}
      subjectFraming={formState.endSubjectFraming}
      setSubjectFraming={setters.setEndSubjectFraming}
    />

    <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
      General Settings
    </Typography>

    <GeneralSettings
      frameCount={formState.frameCount}
      setFrameCount={setters.setFrameCount}
      movementEasing={formState.movementEasing}
      setMovementEasing={setters.setMovementEasing}
      subjectAwareInterpolation={formState.subjectAwareInterpolation}
      setSubjectAwareInterpolation={setters.setSubjectAwareInterpolation}
      selectedSubjectIndex={formState.selectedSubjectIndex}
      setSelectedSubjectIndex={setters.setSelectedSubjectIndex}
      allFramesVisibility={formState.visibilityConstraint}
      setAllFramesVisibility={setters.setVisibilityConstraint}
      subjectsInfo={subjectsInfo}
      distanceType={formState.distanceType}
      setDistanceType={setters.setDistanceType}
      distanceScale={formState.distanceScale}
      setDistanceScale={setters.setDistanceScale}
    />

    <Button
      variant="contained"
      color="primary"
      fullWidth
      onClick={onAddOrUpdate}
      sx={{ mb: 2 }}
      size="small"
    >
      {editingIndex !== null ? "Update Instruction" : "Add Instruction"}
    </Button>

    {instructions.length > 0 && (
      <Stack direction="row" spacing={1} alignItems="center">
        <IconButton
          color="primary"
          onClick={onDownload}
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
            onRender();
          }}
          sx={{ flexGrow: 1 }}
          size="small"
        >
          Render
        </Button>
      </Stack>
    )}
  </Box>
);

export default LowLevelTab;
