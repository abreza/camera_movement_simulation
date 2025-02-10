import React, { FC } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import { SubjectInfo, ObjectClass } from "@/service/subjects/types";

const MOVEMENT_TYPES = {
  circular: "Circular Motion",
  zigzag: "Zigzag Motion",
  linear: "Linear Motion",
  spiral: "Spiral Motion",
  static: "Static Position",
};

// const MOVABLE_CLASSES = [ObjectClass.Car, ObjectClass.Bicycle];

interface MovementSelectionProps {
  subjectsInfo: SubjectInfo[];
  onUpdateMovements: (movements: Record<string, string>) => void;
  handleNext: () => void;
}

const MovementSelection: FC<MovementSelectionProps> = ({
  subjectsInfo,
  onUpdateMovements,
  handleNext,
}) => {
  const [selectedMovements, setSelectedMovements] = React.useState<
    Record<string, string>
  >(() => {
    return subjectsInfo.reduce(
      (acc, { subject }) => ({
        ...acc,
        [subject.id]: "circular",
      }),
      {}
    );
  });

  const handleMovementChange =
    (subjectId: string, subjectClass: ObjectClass) => (event: any) => {
      if (MOVABLE_CLASSES.includes(subjectClass)) {
        setSelectedMovements((prev) => ({
          ...prev,
          [subjectId]: event.target.value,
        }));
      }
    };

  const handleSubmit = () => {
    onUpdateMovements(selectedMovements);
    handleNext();
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Movement Pattern for Each Subject
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Note: Only cars and bicycles can have dynamic movement patterns. Other
        objects remain static.
      </Typography>
      {subjectsInfo.map(({ subject }) => (
        <FormControl
          key={subject.id}
          fullWidth
          sx={{ mb: 2 }}
          // disabled={!MOVABLE_CLASSES.includes(subject.class)}
        >
          <InputLabel id={`movement-label-${subject.id}`}>
            {`${subject.class} (${subject.id})`}
          </InputLabel>
          <Select
            labelId={`movement-label-${subject.id}`}
            value={selectedMovements[subject.id]}
            onChange={handleMovementChange(subject.id, subject.class)}
            label={`${subject.class} (${subject.id})`}
            size="small"
          >
            {Object.entries(MOVEMENT_TYPES).map(([value, label]) => {
              if (value === "static") {
                return (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                );
              }
              return null;
            })}
          </Select>
        </FormControl>
      ))}
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={handleSubmit}
        sx={{ mt: 2 }}
      >
        Apply Movement Patterns
      </Button>
    </Box>
  );
};

export default MovementSelection;
