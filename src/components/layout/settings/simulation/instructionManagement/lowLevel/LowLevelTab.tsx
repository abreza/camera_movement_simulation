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
import { SimulationInstruction } from "@/service/simulation/instruction/types";
import { SubjectInfo } from "@/service/subjects/types";
import { useInstructionForm } from "./useInstructionForm";

interface LowLevelTabProps {
  instructions: SimulationInstruction[];
  formState: SimulationInstruction;
  setters: ReturnType<typeof useInstructionForm>["setters"];
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
}) => {
  return (
    <Box>
      <InstructionList
        instructions={instructions}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      <SetupControls
        isInitial={true}
        cameraAngle={formState.initialSetup.cameraAngle}
        setCameraAngle={setters.setInitialCameraAngle}
        shotSize={formState.initialSetup.shotSize}
        setShotSize={setters.setInitialShotSize}
        subjectView={formState.initialSetup.subjectView}
        setSubjectView={setters.setInitialSubjectView}
        subjectFraming={formState.initialSetup.subjectFraming}
        setSubjectFraming={setters.setInitialSubjectFraming}
      />

      <Divider sx={{ my: 2 }} />

      <SetupControls
        isInitial={false}
        cameraAngle={formState.endSetup?.cameraAngle}
        setCameraAngle={setters.setEndCameraAngle}
        shotSize={formState.endSetup?.shotSize}
        setShotSize={setters.setEndShotSize}
        subjectView={formState.endSetup?.subjectView}
        setSubjectView={setters.setEndSubjectView}
        subjectFraming={formState.endSetup?.subjectFraming}
        setSubjectFraming={setters.setEndSubjectFraming}
      />

      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
        General Settings
      </Typography>

      <GeneralSettings
        instruction={formState}
        setters={setters}
        subjectsInfo={subjectsInfo}
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
};

export default LowLevelTab;
