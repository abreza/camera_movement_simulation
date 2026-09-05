import React, { FC, useEffect } from "react";
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Button,
  Chip,
  SelectChangeEvent,
  alpha,
  Stack,
} from "@mui/material";
import { ObjectClass } from "@/service/subjects/types";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import PedalBikeIcon from "@mui/icons-material/PedalBike";
import ChairIcon from "@mui/icons-material/Chair";
import LockIcon from "@mui/icons-material/Lock";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateMovementsThunk } from "@/redux/thunks/simulationThunks";
import { setSimulationStepIndex } from "@/redux/slices/uiSlice";

const MOVEMENT_TYPES = {
  circular: "Circular",
  zigzag: "Zigzag",
  linear: "Linear",
  spiral: "Spiral",
  static: "Static",
};

const MOVABLE_CLASSES = [ObjectClass.Car, ObjectClass.Bicycle];

const MovementSelection: FC = () => {
  const dispatch = useAppDispatch();
  const subjectsInfo = useAppSelector((state) => state.subjects.subjectsInfo);
  const storeMovements = useAppSelector((state) => state.subjects.movements);
  const activeStep = useAppSelector((state) => state.ui.simulationStepIndex);

  useEffect(() => {
    if (Object.keys(storeMovements).length !== subjectsInfo.length) {
      const initialMovements = subjectsInfo.reduce(
        (acc, { subject }) => ({
          ...acc,
          [subject.id]: MOVABLE_CLASSES.includes(subject.class)
            ? "circular"
            : "static",
        }),
        {} as Record<string, string>
      );
      dispatch(updateMovementsThunk(initialMovements));
    }
  }, [subjectsInfo, storeMovements, dispatch]);

  const handleMovementChange =
    (subjectId: string, subjectClass: ObjectClass) =>
      (event: SelectChangeEvent) => {
        const newMovement = event.target.value;
        if (MOVABLE_CLASSES.includes(subjectClass) || newMovement === "static") {
          dispatch(
            updateMovementsThunk({
              ...storeMovements,
              [subjectId]: newMovement,
            })
          );
        }
      };

  const handleNextStep = () => {
    dispatch(setSimulationStepIndex(activeStep + 1));
  };

  const getSubjectIcon = (subjectClass: ObjectClass) => {
    const sx = { fontSize: 18 };
    switch (subjectClass) {
      case ObjectClass.Car:
        return <DirectionsCarIcon sx={sx} />;
      case ObjectClass.Bicycle:
        return <PedalBikeIcon sx={sx} />;
      default:
        return <ChairIcon sx={sx} />;
    }
  };

  const getClassColor = (subjectClass: ObjectClass) => {
    switch (subjectClass) {
      case ObjectClass.Car:
        return "#E8753A";
      case ObjectClass.Bicycle:
        return "#00BCD4";
      default:
        return "#9898B8";
    }
  };

  const isMovable = (cls: ObjectClass) => MOVABLE_CLASSES.includes(cls);

  return (
    <Box>
      <Typography variant="caption" sx={{ color: "text.secondary", mb: 2, display: "block" }}>
        Assign motion patterns to each subject. Only cars and bicycles support dynamic movement.
      </Typography>

      <Stack spacing={1}>
        {subjectsInfo.map(({ subject }) => {
          const movable = isMovable(subject.class);
          const color = getClassColor(subject.class);

          return (
            <Box
              key={subject.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.5,
                borderRadius: 1.5,
                backgroundColor: alpha("#000000", movable ? 0.15 : 0.08),
                border: `1px solid ${alpha("#FFFFFF", movable ? 0.06 : 0.03)}`,
                opacity: movable ? 1 : 0.65,
                transition: "all 0.15s ease",
                "&:hover": movable
                  ? {
                    backgroundColor: alpha("#000000", 0.25),
                    borderColor: alpha(color, 0.2),
                  }
                  : {},
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: alpha(color, 0.12),
                  color: color,
                  flexShrink: 0,
                }}
              >
                {getSubjectIcon(subject.class)}
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack
                  direction="row"
                  spacing={0.75}
                  sx={{ alignItems: "center" }}
                >
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 600, color: "text.primary" }}
                  >
                    {subject.class}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "0.6rem",
                    }}
                  >
                    {subject.id.slice(0, 8)}
                  </Typography>
                  {movable ? (
                    <Chip
                      label="movable"
                      size="small"
                      sx={{
                        height: 16,
                        fontSize: "0.55rem",
                        backgroundColor: alpha("#6BCB77", 0.12),
                        color: "#6BCB77",
                        "& .MuiChip-label": { px: 0.5 },
                      }}
                    />
                  ) : (
                    <LockIcon
                      sx={{ fontSize: 12, color: "text.secondary", opacity: 0.5 }}
                    />
                  )}
                </Stack>
              </Box>

              <FormControl
                size="small"
                disabled={!movable}
                sx={{ minWidth: 120 }}
              >
                <Select
                  value={storeMovements[subject.id] || "static"}
                  onChange={handleMovementChange(subject.id, subject.class)}
                  sx={{ fontSize: "0.75rem" }}
                >
                  {Object.entries(MOVEMENT_TYPES).map(([value, label]) => {
                    if (value === "static" || movable) {
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
            </Box>
          );
        })}
      </Stack>

      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={handleNextStep}
        sx={{ mt: 3 }}
      >
        Continue
      </Button>
    </Box>
  );
};

export default MovementSelection;
