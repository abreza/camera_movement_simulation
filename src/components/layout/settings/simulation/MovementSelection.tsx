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
import { SubjectInfo } from "@/service/subjects/types";

const MOVEMENT_TYPES = {
  circular: "Circular Motion",
  zigzag: "Zigzag Motion",
  linear: "Linear Motion",
  spiral: "Spiral Motion",
};

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
  >(
    subjectsInfo.reduce(
      (acc, { subject }) => ({
        ...acc,
        [subject.id]: "circular",
      }),
      {}
    )
  );

  const handleMovementChange = (subjectId: string) => (event: any) => {
    setSelectedMovements((prev) => ({
      ...prev,
      [subjectId]: event.target.value,
    }));
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
      {subjectsInfo.map(({ subject }) => (
        <FormControl key={subject.id} fullWidth sx={{ mb: 2 }}>
          <InputLabel id={`movement-label-${subject.id}`}>
            {`${subject.class} (${subject.id})`}
          </InputLabel>
          <Select
            labelId={`movement-label-${subject.id}`}
            value={selectedMovements[subject.id]}
            onChange={handleMovementChange(subject.id)}
            label={`${subject.class} (${subject.id})`}
            size="small"
          >
            {Object.entries(MOVEMENT_TYPES).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
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
