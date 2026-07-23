import { FC, useState } from "react";
import {
  Button,
  Typography,
  Box,
  alpha,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Fade,
} from "@mui/material";
import {
  Chair as ChairIcon,
  TableRestaurant as TableIcon,
  Laptop as LaptopIcon,
  MenuBook as BookIcon,
  Park as TreeIcon,
  DirectionsCar as CarIcon,
  PedalBike as BikeIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Place as PlaceIcon,
  Close as CancelIcon,
  MyLocation as RepositionIcon,
} from "@mui/icons-material";
import { ObjectClass, Subject } from "@/service/subjects/types";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  startPlacingSubject,
  cancelPlacement,
  removeSubject,
} from "@/redux/slices/subjectsSlice";
import { generateDimensions } from "@/service/subjects/generateSubjects";
import { v4 as uuidv4 } from "uuid";

const CLASS_META: Record<
  ObjectClass,
  { icon: React.ReactNode; label: string; color: string; movable?: boolean }
> = {
  [ObjectClass.Chair]: {
    icon: <ChairIcon sx={{ fontSize: 20 }} />,
    label: "Chair",
    color: "#FFB347",
  },
  [ObjectClass.Table]: {
    icon: <TableIcon sx={{ fontSize: 20 }} />,
    label: "Table",
    color: "#FF6B6B",
  },
  [ObjectClass.Laptop]: {
    icon: <LaptopIcon sx={{ fontSize: 20 }} />,
    label: "Laptop",
    color: "#4EA8DE",
  },
  [ObjectClass.Book]: {
    icon: <BookIcon sx={{ fontSize: 20 }} />,
    label: "Book",
    color: "#9B59B6",
  },
  [ObjectClass.Tree]: {
    icon: <TreeIcon sx={{ fontSize: 20 }} />,
    label: "Tree",
    color: "#6BCB77",
  },
  [ObjectClass.Car]: {
    icon: <CarIcon sx={{ fontSize: 20 }} />,
    label: "Car",
    color: "#E8753A",
    movable: true,
  },
  [ObjectClass.Bicycle]: {
    icon: <BikeIcon sx={{ fontSize: 20 }} />,
    label: "Bicycle",
    color: "#00BCD4",
    movable: true,
  },
};

export const SubjectGeneration: FC = () => {
  const dispatch = useAppDispatch();
  const subjectsInfo = useAppSelector((state) => state.subjects.subjectsInfo);
  const placingSubject = useAppSelector(
    (state) => state.subjects.placingSubject
  );
  const [selectedClass, setSelectedClass] = useState<ObjectClass>(
    ObjectClass.Car
  );

  const isPlacing = !!placingSubject;

  const handleAddSubject = () => {
    if (subjectsInfo.length >= 20) {
      toast.error("Maximum of 20 subjects allowed");
      return;
    }

    const dimensions = generateDimensions(selectedClass);
    const subject: Subject = {
      id: `${selectedClass}-${uuidv4().slice(0, 8)}`,
      class: selectedClass,
      dimensions: {
        width: dimensions.x,
        height: dimensions.y,
        depth: dimensions.z,
      },
    };

    dispatch(startPlacingSubject(subject));
    toast.info("Click on the 3D view to place the subject");
  };

  const handleCancelPlacement = () => {
    dispatch(cancelPlacement());
  };

  const handleRemoveSubject = (id: string) => {
    dispatch(removeSubject(id));
  };

  return (
    <Box>
      {isPlacing && (
        <Fade in>
          <Box
            sx={{
              mb: 2,
              p: 1.5,
              borderRadius: 1.5,
              backgroundColor: alpha("#E8753A", 0.12),
              border: `1px solid ${alpha("#E8753A", 0.3)}`,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <PlaceIcon sx={{ color: "#E8753A", fontSize: 20 }} />
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, color: "#E8753A", display: "block" }}
              >
                Placement Mode
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Click to place{" "}
                <strong>{placingSubject?.class}</strong> (Scroll wheel to rotate)
              </Typography>
            </Box>
            <IconButton size="small" onClick={handleCancelPlacement}>
              <CancelIcon fontSize="small" sx={{ color: "#E8753A" }} />
            </IconButton>
          </Box>
        </Fade>
      )}

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Select Type
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1,
          mb: 2,
        }}
      >
        {Object.values(ObjectClass).map((cls) => {
          const meta = CLASS_META[cls];
          const isSelected = selectedClass === cls;
          return (
            <Tooltip key={cls} title={meta.label} arrow>
              <Box
                onClick={() => !isPlacing && setSelectedClass(cls)}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0.5,
                  p: 1,
                  borderRadius: 1.5,
                  cursor: isPlacing ? "not-allowed" : "pointer",
                  opacity: isPlacing ? 0.5 : 1,
                  transition: "all 0.15s ease",
                  backgroundColor: isSelected
                    ? alpha(meta.color, 0.15)
                    : alpha("#000000", 0.1),
                  border: `1.5px solid ${isSelected ? alpha(meta.color, 0.5) : "transparent"
                    }`,
                  "&:hover": !isPlacing
                    ? {
                      backgroundColor: alpha(meta.color, 0.1),
                      borderColor: alpha(meta.color, 0.25),
                    }
                    : {},
                }}
              >
                <Box sx={{ color: isSelected ? meta.color : "text.secondary" }}>
                  {meta.icon}
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "0.6rem",
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? meta.color : "text.secondary",
                  }}
                >
                  {meta.label}
                </Typography>
                {meta.movable && (
                  <Chip
                    label="movable"
                    size="small"
                    sx={{
                      height: 12,
                      fontSize: "0.45rem",
                      backgroundColor: alpha("#6BCB77", 0.12),
                      color: "#6BCB77",
                      "& .MuiChip-label": { px: 0.3 },
                    }}
                  />
                )}
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      <Button
        variant="contained"
        fullWidth
        onClick={handleAddSubject}
        disabled={isPlacing}
        startIcon={<AddIcon />}
        sx={{ mb: 2 }}
        size="small"
      >
        {isPlacing ? "Place subject in 3D view…" : "Add Subject to Scene"}
      </Button>

      {subjectsInfo.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Placed Subjects ({subjectsInfo.length})
          </Typography>
          <Stack spacing={0.75}>
            {subjectsInfo.map(({ subject, frames }) => {
              const meta = CLASS_META[subject.class];
              const pos = frames?.[0]?.position;
              return (
                <Box
                  key={subject.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    p: 1,
                    borderRadius: 1.5,
                    backgroundColor: alpha("#000000", 0.12),
                    border: `1px solid ${alpha("#FFFFFF", 0.04)}`,
                    "&:hover": {
                      backgroundColor: alpha("#000000", 0.2),
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: alpha(meta.color, 0.12),
                      color: meta.color,
                      flexShrink: 0,
                      "& svg": { fontSize: 16 },
                    }}
                  >
                    {meta.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 600, color: "text.primary" }}
                    >
                      {meta.label}
                    </Typography>
                    {pos && (
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          color: "text.secondary",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "0.55rem",
                        }}
                      >
                        ({pos.x.toFixed(1)}, {pos.y.toFixed(1)},{" "}
                        {pos.z.toFixed(1)})
                      </Typography>
                    )}
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveSubject(subject.id)}
                    sx={{ color: "text.secondary" }}
                  >
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              );
            })}
          </Stack>
        </>
      )}
    </Box>
  );
};
