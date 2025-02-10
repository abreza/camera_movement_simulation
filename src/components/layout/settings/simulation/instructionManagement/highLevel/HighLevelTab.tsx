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
  CinematographyPrompt,
} from "@/service/simulation/instruction/types";

import { highLevelInstructionRules } from "@/service/simulation/instruction/high-level/rules";
import { generateRandomTexts } from "@/service/simulation/instruction/high-level/generator";

import { SelectRenderer } from "./SelectRenderer";
import { FinalSetup } from "./FinalSetup";

interface HighLevelTabProps {
  onTranslate: (data: CinematographyPrompt) => void;
  cinematographyPrompt: CinematographyPrompt;
  setCinematographyPrompt: (cinematographyPrompt: CinematographyPrompt) => void;
}

export const HighLevelTab: FC<HighLevelTabProps> = ({
  onTranslate,
  cinematographyPrompt,
  setCinematographyPrompt,
}) => {
  const disabledFields = useMemo(() => {
    const movementType = cinematographyPrompt.movement
      .type as keyof typeof highLevelInstructionRules;
    return (highLevelInstructionRules[movementType]?.disabledFinalSetup ||
      []) as string[];
  }, [cinematographyPrompt.movement.type]);

  useEffect(() => {
    const newFinal = { ...cinematographyPrompt.final } as any;
    disabledFields.forEach((field) => {
      if (field in newFinal) {
        newFinal[field] = undefined;
      }
    });
    setCinematographyPrompt({ ...cinematographyPrompt, final: newFinal });
  }, [cinematographyPrompt.movement.type]);

  const handleInitialChange =
    (field: string) => (event: SelectChangeEvent<string>) => {
      setCinematographyPrompt({
        ...cinematographyPrompt,
        initial: {
          ...cinematographyPrompt.initial,
          [field]: event.target.value,
        },
      });
    };

  const handleMovementChange =
    (field: string) => (event: SelectChangeEvent<string>) => {
      setCinematographyPrompt({
        ...cinematographyPrompt,
        movement: {
          ...cinematographyPrompt.movement,
          [field]: event.target.value,
        },
      });
    };

  const handleFinalChange =
    (field: string) => (event: SelectChangeEvent<string>) => {
      setCinematographyPrompt({
        ...cinematographyPrompt,
        final: { ...cinematographyPrompt.final, [field]: event.target.value },
      });
    };

  return (
    <Box>
      <Typography
        component="div"
        variant="body2"
        sx={{ mb: 2, lineHeight: 2, fontWeight: 300 }}
      >
        Generate cinematographyPrompt camera trajectory that begins with a{" "}
        <SelectRenderer
          options={Object.values(CameraVerticalAngle)}
          value={cinematographyPrompt.initial.cameraAngle}
          onChange={handleInitialChange("cameraAngle")}
          enumType="CameraVerticalAngle"
        />{" "}
        camera angle from the{" "}
        <SelectRenderer
          options={Object.values(SubjectView)}
          value={cinematographyPrompt.initial.subjectView}
          onChange={handleInitialChange("subjectView")}
          enumType="SubjectView"
        />{" "}
        side of the subject, using a{" "}
        <SelectRenderer
          options={Object.values(ShotSize)}
          value={cinematographyPrompt.initial.shotSize}
          onChange={handleInitialChange("shotSize")}
          enumType="ShotSize"
        />{" "}
        shot size and positioning the subject in the{" "}
        <SelectRenderer
          options={Object.values(SubjectInFramePosition)}
          value={cinematographyPrompt.initial.subjectFraming}
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
          value={cinematographyPrompt.movement.type}
          onChange={handleMovementChange("type")}
          enumType="CameraMovementType"
        />{" "}
        movement with{" "}
        <SelectRenderer
          options={Object.values(MovementSpeed)}
          value={cinematographyPrompt.movement.speed}
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
            final={cinematographyPrompt.final}
            handleFinalChange={handleFinalChange}
          />
        </AccordionDetails>
      </Accordion>

      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={() => {
          onTranslate(cinematographyPrompt);
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
