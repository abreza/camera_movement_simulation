import React, { FC, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";
import {
  CameraVerticalAngle,
  ShotSize,
  SubjectView,
  SubjectInFramePosition,
  CameraMovementType,
  MovementSpeed,
} from "@/service/simulation/instruction/types";

interface HighLevelTabProps {
  onTranslate: (data: any) => void;
}

export const HighLevelTab: FC<HighLevelTabProps> = ({ onTranslate }) => {
  const [initial, setInitial] = useState({
    cameraAngle: "",
    shotSize: "",
    subjectView: "",
    subjectFraming: "",
  });

  const [movement, setMovement] = useState({
    type: "",
    speed: "",
  });

  const [final, setFinal] = useState({
    cameraAngle: "",
    shotSize: "",
    subjectView: "",
    subjectFraming: "",
  });

  const isValid =
    Object.values(initial).every((val) => val !== "") &&
    Object.values(movement).every((val) => val !== "") &&
    Object.values(final).every((val) => val !== "");

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
    value: string,
    onChange: (event: SelectChangeEvent<string>) => void
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
        <MenuItem value="" sx={{ fontSize: "inherit", fontWeight: "normal" }}>
          -
        </MenuItem>
        {options.map((option) => (
          <MenuItem
            key={option}
            value={option}
            sx={{ fontSize: "inherit", fontWeight: "normal" }}
          >
            {option}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

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
          handleInitialChange("cameraAngle")
        )}{" "}
        camera angle from the{" "}
        {renderSelect(
          Object.values(SubjectView),
          initial.subjectView,
          handleInitialChange("subjectView")
        )}{" "}
        side of the subject, using a{" "}
        {renderSelect(
          Object.values(ShotSize),
          initial.shotSize,
          handleInitialChange("shotSize")
        )}{" "}
        shot size and positioning the subject in the{" "}
        {renderSelect(
          Object.values(SubjectInFramePosition),
          initial.subjectFraming,
          handleInitialChange("subjectFraming")
        )}{" "}
        portion of the frame. Next, apply a{" "}
        {renderSelect(
          Object.values(CameraMovementType),
          movement.type,
          handleMovementChange("type")
        )}{" "}
        movement with{" "}
        {renderSelect(
          Object.values(MovementSpeed),
          movement.speed,
          handleMovementChange("speed")
        )}{" "}
        speed. Finally, conclude with a{" "}
        {renderSelect(
          Object.values(CameraVerticalAngle),
          final.cameraAngle,
          handleFinalChange("cameraAngle")
        )}{" "}
        camera angle from the{" "}
        {renderSelect(
          Object.values(SubjectView),
          final.subjectView,
          handleFinalChange("subjectView")
        )}{" "}
        side of the subject, using a{" "}
        {renderSelect(
          Object.values(ShotSize),
          final.shotSize,
          handleFinalChange("shotSize")
        )}{" "}
        shot size and positioning the subject in the{" "}
        {renderSelect(
          Object.values(SubjectInFramePosition),
          final.subjectFraming,
          handleFinalChange("subjectFraming")
        )}{" "}
        portion of the frame.
      </Typography>

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
        disabled={!isValid}
      >
        Translate to Low-Level Instructions
      </Button>
    </Box>
  );
};

export default HighLevelTab;
