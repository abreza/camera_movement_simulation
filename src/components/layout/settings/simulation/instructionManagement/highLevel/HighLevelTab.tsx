import React, { FC, useState, useMemo, useEffect } from "react";
import {
  Box,
  Button,
  FormControl,
  MenuItem,
  Select,
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

  const renderSelect = (
    options: string[],
    value: string = "",
    onChange: (event: SelectChangeEvent<string>) => void,
    haveEmptyOption: boolean = false,
    enumType: string
  ) => (
    <FormControl size="small" sx={{ mx: 1 }}>
      <Select
        value={value}
        onChange={onChange}
        displayEmpty
        variant="standard"
        sx={{
          "& .MuiSelect-select": {
            fontSize: "10px",
            fontWeight: "bold",
          },
        }}
      >
        {haveEmptyOption && (
          <MenuItem value="" sx={{ fontSize: "inherit", fontWeight: "normal" }}>
            -
          </MenuItem>
        )}
        {options.map((option) => (
          <MenuItem
            key={option}
            value={option}
            sx={{ fontSize: "inherit", fontWeight: "normal" }}
          >
            {getEnumLabel(option, enumType)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const renderFinalSetup = () => {
    const elements = [];
    let hasContent = false;

    if (
      !disabledFields.includes("cameraAngle") ||
      !disabledFields.includes("subjectView")
    ) {
      hasContent = true;
      elements.push(
        <>
          {!disabledFields.includes("cameraAngle") && (
            <>
              a{" "}
              {renderSelect(
                Object.values(CameraVerticalAngle),
                final.cameraAngle,
                handleFinalChange("cameraAngle"),
                true,
                "CameraVerticalAngle"
              )}{" "}
              camera angle
            </>
          )}
          {!disabledFields.includes("cameraAngle") &&
            !disabledFields.includes("subjectView") &&
            " from "}
          {!disabledFields.includes("subjectView") && (
            <>
              the{" "}
              {renderSelect(
                Object.values(SubjectView),
                final.subjectView,
                handleFinalChange("subjectView"),
                true,
                "SubjectView"
              )}
              {" view"}
            </>
          )}
        </>
      );
    }

    if (!disabledFields.includes("shotSize")) {
      if (hasContent) elements.push(", ");
      hasContent = true;
      elements.push(
        <>
          {elements.length === 0 ? "a " : ""}
          {renderSelect(
            Object.values(ShotSize),
            final.shotSize,
            handleFinalChange("shotSize"),
            true,
            "ShotSize"
          )}{" "}
          shot
        </>
      );
    }

    if (!disabledFields.includes("subjectFraming")) {
      if (hasContent) elements.push(", ");
      elements.push(
        <>
          positioning the subject in the{" "}
          {renderSelect(
            Object.values(SubjectInFramePosition),
            final.subjectFraming,
            handleFinalChange("subjectFraming"),
            true,
            "SubjectInFramePosition"
          )}{" "}
          portion of the frame
        </>
      );
    }

    if (elements.length === 0) {
      return null;
    }

    return (
      <Typography variant="body2" sx={{ lineHeight: 2, fontWeight: 300 }}>
        Finally, conclude with {elements}.
      </Typography>
    );
  };

  return (
    <Box>
      <Typography
        variant="body2"
        sx={{ mb: 2, lineHeight: 2, fontWeight: 300 }}
      >
        Generate cinematography camera trajectory that begins with a{" "}
        {renderSelect(
          Object.values(CameraVerticalAngle),
          initial.cameraAngle,
          handleInitialChange("cameraAngle"),
          false,
          "CameraVerticalAngle"
        )}{" "}
        camera angle from the{" "}
        {renderSelect(
          Object.values(SubjectView),
          initial.subjectView,
          handleInitialChange("subjectView"),
          false,
          "SubjectView"
        )}{" "}
        side of the subject, using a{" "}
        {renderSelect(
          Object.values(ShotSize),
          initial.shotSize,
          handleInitialChange("shotSize"),
          false,
          "ShotSize"
        )}{" "}
        shot size and positioning the subject in the{" "}
        {renderSelect(
          Object.values(SubjectInFramePosition),
          initial.subjectFraming,
          handleInitialChange("subjectFraming"),
          false,
          "subjectFraming"
        )}{" "}
        portion of the frame.
      </Typography>

      <Typography
        variant="body2"
        sx={{ mb: 2, lineHeight: 2, fontWeight: 300 }}
      >
        Next, apply a{" "}
        {renderSelect(
          Object.values(CameraMovementType),
          movement.type,
          handleMovementChange("type"),
          false,
          "CameraMovementType"
        )}{" "}
        movement with{" "}
        {renderSelect(
          Object.values(MovementSpeed),
          movement.speed,
          handleMovementChange("speed"),
          false,
          "MovementSpeed"
        )}{" "}
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
          {renderFinalSetup()}
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
    </Box>
  );
};

export default HighLevelTab;
