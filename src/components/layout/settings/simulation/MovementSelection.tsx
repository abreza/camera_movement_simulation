import React, { FC, useState, useEffect } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Chip,
  SelectChangeEvent,
  Paper,
  Tooltip,
} from "@mui/material";
import { ObjectClass } from "@/service/subjects/types";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import PedalBikeIcon from "@mui/icons-material/PedalBike";
import ChairIcon from "@mui/icons-material/Chair";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateMovementsThunk } from "@/redux/thunks/simulationThunks";
import { setSimulationStepIndex } from "@/redux/slices/uiSlice";

const MOVEMENT_TYPES = {
  circular: "Circular Motion",
  zigzag: "Zigzag Motion",
  linear: "Linear Motion",
  spiral: "Spiral Motion",
  static: "Static Position",
};

const MOVABLE_CLASSES = [ObjectClass.Car, ObjectClass.Bicycle];

const MovementSelection: FC = () => {
  const dispatch = useAppDispatch();
  const subjectsInfo = useAppSelector((state) => state.subjects.subjectsInfo);
  const storeMovements = useAppSelector((state) => state.subjects.movements);
  const activeStep = useAppSelector((state) => state.ui.simulationStepIndex);

  const [selectedMovements, setSelectedMovements] =
    useState<Record<string, string>>(storeMovements);

  useEffect(() => {
    if (Object.keys(selectedMovements).length !== subjectsInfo.length) {
      const initialMovements = subjectsInfo.reduce(
        (acc, { subject }) => ({
          ...acc,
          [subject.id]: MOVABLE_CLASSES.includes(subject.class)
            ? "circular"
            : "static",
        }),
        {}
      );
      setSelectedMovements(initialMovements);
    }
  }, [subjectsInfo]);

  const handleMovementChange =
    (subjectId: string, subjectClass: ObjectClass) =>
    (event: SelectChangeEvent) => {
      if (
        MOVABLE_CLASSES.includes(subjectClass) ||
        event.target.value === "static"
      ) {
        setSelectedMovements((prev) => ({
          ...prev,
          [subjectId]: event.target.value,
        }));
      }
    };

  const handleSubmit = () => {
    dispatch(updateMovementsThunk(selectedMovements));
    dispatch(setSimulationStepIndex(activeStep + 1));
  };

  const getSubjectIcon = (subjectClass: ObjectClass) => {
    switch (subjectClass) {
      case ObjectClass.Car:
        return <DirectionsCarIcon />;
      case ObjectClass.Bicycle:
        return <PedalBikeIcon />;
      default:
        return <ChairIcon />;
    }
  };

  const hasMovableSubjects = subjectsInfo.some(({ subject }) =>
    MOVABLE_CLASSES.includes(subject.class)
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Movement Pattern for Each Subject
      </Typography>

      {!hasMovableSubjects && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: "#fff8e1" }}>
          <Typography variant="body2" color="warning.dark">
            Note: None of your generated subjects are capable of movement (only
            cars and bicycles can move). You may want to go back and generate
            different subjects.
          </Typography>
        </Paper>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Only cars and bicycles can have dynamic movement patterns. Other objects
        remain static.
      </Typography>

      <Grid container spacing={2}>
        {subjectsInfo.map(({ subject }) => (
          <Grid size={{ xs: 12, sm: 6 }} key={subject.id}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                position: "relative",
                opacity: MOVABLE_CLASSES.includes(subject.class) ? 1 : 0.8,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                {getSubjectIcon(subject.class)}
                <Typography variant="subtitle1" sx={{ ml: 1 }}>
                  {subject.class} ({subject.id.slice(0, 4)}...)
                </Typography>

                {MOVABLE_CLASSES.includes(subject.class) && (
                  <Chip
                    label="Movable"
                    size="small"
                    color="success"
                    sx={{ ml: "auto" }}
                  />
                )}
              </Box>

              <Tooltip
                title={
                  MOVABLE_CLASSES.includes(subject.class)
                    ? "Select movement pattern"
                    : "This object type cannot move"
                }
              >
                <FormControl
                  fullWidth
                  disabled={!MOVABLE_CLASSES.includes(subject.class)}
                >
                  <InputLabel id={`movement-label-${subject.id}`}>
                    Movement Type
                  </InputLabel>
                  <Select
                    labelId={`movement-label-${subject.id}`}
                    value={selectedMovements[subject.id] || "static"}
                    onChange={handleMovementChange(subject.id, subject.class)}
                    label="Movement Type"
                    size="small"
                  >
                    {Object.entries(MOVEMENT_TYPES).map(([value, label]) => {
                      if (
                        value === "static" ||
                        MOVABLE_CLASSES.includes(subject.class)
                      ) {
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
              </Tooltip>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={handleSubmit}
        sx={{ mt: 3 }}
      >
        Apply Movement Patterns
      </Button>
    </Box>
  );
};

export default MovementSelection;
