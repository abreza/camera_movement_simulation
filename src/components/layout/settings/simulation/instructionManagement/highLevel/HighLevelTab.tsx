import React, { FC, useState, useMemo, useEffect } from "react";
import {
  Box,
  Button,
  SelectChangeEvent,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import {
  CameraVerticalAngle,
  ShotSize,
  SubjectView,
  SubjectInFramePosition,
  CameraMovementType,
  MovementSpeed,
} from "@/service/simulation/instruction/types";

import {
  DEFAULT_START_CAMERA_SETUP,
  DEFAULT_MOVEMENT,
  DEFAULT_END_CAMERA_SETUP,
} from "./constant";

import { getEnumLabel } from "./enumLabels";
import { highLevelInstructionRules } from "./rules";
import { generateRandomTexts } from "./generator";

import { SelectRenderer } from "./SelectRenderer";
import { FinalSetup } from "./FinalSetup";

interface HighLevelTabProps {
  onTranslate: (data: any) => void;
}

export const HighLevelTab: FC<HighLevelTabProps> = ({ onTranslate }) => {
  const [initial, setInitial] = useState(DEFAULT_START_CAMERA_SETUP);
  const [movement, setMovement] = useState(DEFAULT_MOVEMENT);
  const [final, setFinal] = useState(DEFAULT_END_CAMERA_SETUP);

  const disabledFields = useMemo(() => {
    const movementType =
      movement.type as keyof typeof highLevelInstructionRules;
    return (highLevelInstructionRules[movementType]?.disabledFinalSetup ||
      []) as string[];
  }, [movement.type]);

  useEffect(() => {
    const newFinal = { ...final } as any;
    disabledFields.forEach((field) => {
      if (field in newFinal) {
        newFinal[field] = undefined;
      }
    });
    setFinal(newFinal);
  }, [movement.type]);

  const handleInitialChange =
    (field: string) => (event: SelectChangeEvent<string>) => {
      setInitial((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleMovementChange =
    (field: string) => (event: SelectChangeEvent<string>) => {
      setMovement((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleFinalChange =
    (field: string) => (event: SelectChangeEvent<string>) => {
      setFinal((prev) => ({ ...prev, [field]: event.target.value }));
    };

  return (
    <Box>
      <Typography
        component="div"
        variant="body2"
        sx={{ mb: 2, lineHeight: 2, fontWeight: 300 }}
      >
        Generate cinematography camera trajectory that begins with a{" "}
        <SelectRenderer
          options={Object.values(CameraVerticalAngle)}
          value={initial.cameraAngle}
          onChange={handleInitialChange("cameraAngle")}
          enumType="CameraVerticalAngle"
        />{" "}
        camera angle from the{" "}
        <SelectRenderer
          options={Object.values(SubjectView)}
          value={initial.subjectView}
          onChange={handleInitialChange("subjectView")}
          enumType="SubjectView"
        />{" "}
        side of the subject, using a{" "}
        <SelectRenderer
          options={Object.values(ShotSize)}
          value={initial.shotSize}
          onChange={handleInitialChange("shotSize")}
          enumType="ShotSize"
        />{" "}
        shot size and positioning the subject in the{" "}
        <SelectRenderer
          options={Object.values(SubjectInFramePosition)}
          value={initial.subjectFraming}
          onChange={handleInitialChange("subjectFraming")}
          enumType="SubjectInFramePosition"
        />{" "}
        portion of the frame.
      </Typography>

      <Typography
        component="div"
        variant="body2"
        sx={{ mb: 2, lineHeight: 2, fontWeight: 300 }}
      >
        Next, apply a{" "}
        <SelectRenderer
          options={Object.values(CameraMovementType)}
          value={movement.type}
          onChange={handleMovementChange("type")}
          enumType="CameraMovementType"
        />{" "}
        movement with{" "}
        <SelectRenderer
          options={Object.values(MovementSpeed)}
          value={movement.speed}
          onChange={handleMovementChange("speed")}
          enumType="MovementSpeed"
        />{" "}
        speed.
      </Typography>

      <Accordion
        sx={{ mb: 2, boxShadow: "none", "&:before": { display: "none" } }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            padding: 0,
            minHeight: "unset",
            "& .MuiAccordionSummary-content": {
              margin: 0,
            },
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Advanced End Setup
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ padding: "8px 0" }}>
          <FinalSetup
            disabledFields={disabledFields}
            final={final}
            handleFinalChange={handleFinalChange}
          />
        </AccordionDetails>
      </Accordion>

      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={() => {
          const data = {
            initial,
            movement,
            final,
          };
          onTranslate(data);
        }}
      >
        Translate to Low-Level Instructions
      </Button>
      <Button
        onClick={() => generateRandomTexts()}
        sx={{ mt: 2 }}
        color="secondary"
      >
        Generate 1000 Random Prompt
      </Button>
    </Box>
  );
};

export default HighLevelTab;
