import { FC, useState } from "react";
import { TextField, Button, Slider, Typography, Box, List, ListItem, ListItemText, ListItemButton, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { ObjectClass } from "@/types/simulation";
import CurveEditor from './CurveEditor';

interface SubjectGenerationProps {
  onGenerateSubjects: (
    count: number,
    probabilityFactors: Record<ObjectClass, number>
  ) => void;
  handleNext: () => void;
}

interface Curve {
  id: number;
  name: string;
  points: { x: number; y: number }[];
}

export const SubjectGeneration: FC<SubjectGenerationProps> = ({
  onGenerateSubjects,
  handleNext,
}) => {
  const [subjectCount, setSubjectCount] = useState(1);
  const [probabilityFactors, setProbabilityFactors] = useState<
    Record<ObjectClass, number>
  >(
    Object.values(ObjectClass).reduce(
      (acc, cls) => ({ ...acc, [cls]: 0.5 }),
      {} as Record<ObjectClass, number>
    )
  );
  const [curves, setCurves] = useState<Curve[]>([]);
  const [selectedCurveIndex, setSelectedCurveIndex] = useState<number | null>(null);

  const handleGenerateSubjects = () => {
    onGenerateSubjects(subjectCount, probabilityFactors);
    handleNext();
  };

  const handleProbabilityChange =
    (objectClass: ObjectClass) => (_: Event, newValue: number | number[]) => {
      setProbabilityFactors((prev) => ({
        ...prev,
        [objectClass]: newValue as number,
      }));
    };

  const addNewCurve = () => {
    // Create a new curve with a default name and points
    const newCurve: Curve = {
      id: curves.length,
      name: `Curve ${curves.length + 1}`, // Default name
      points: [
        { x: -5, y: -5 },
        { x: 0, y: 0 },
        { x: 5, y: 5 },
      ],
    };
    setCurves([...curves, newCurve]);
    setSelectedCurveIndex(curves.length); // Automatically open the newly created curve in the editor
  };

  const removeCurve = (index: number) => {
    setCurves((prevCurves) => prevCurves.filter((_, i) => i !== index));
    setSelectedCurveIndex(null);
  };

  const handleCurveUpdate = (updatedCurve: Curve) => {
    setCurves((prevCurves) =>
      prevCurves.map((curve, index) =>
        index === selectedCurveIndex ? updatedCurve : curve
      )
    );
  };

  const handleCloseEditor = () => {
    setSelectedCurveIndex(null);
  };

  return (
    <Box>
      <TextField
        type="number"
        label="Number of Subjects"
        value={subjectCount}
        onChange={(e) => setSubjectCount(Number(e.target.value))}
        fullWidth
        margin="normal"
        InputProps={{ inputProps: { min: 1, max: 20 } }}
        size="small"
      />
      {Object.values(ObjectClass).map((objectClass) => (
        <Box key={objectClass}>
          <Typography gutterBottom>{objectClass}</Typography>
          <Slider
            value={probabilityFactors[objectClass]}
            onChange={handleProbabilityChange(objectClass)}
            aria-labelledby={`${objectClass}-slider`}
            valueLabelDisplay="auto"
            step={0.1}
            marks
            min={0}
            max={1}
          />
        </Box>
      ))}
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={handleGenerateSubjects}
        sx={{ mt: 2 }}
      >
        Generate Subjects
      </Button>

      {/* Curve Section */}
      <Box sx={{ mt: 4 }}>
        <Button
          variant="outlined"
          onClick={addNewCurve}
          sx={{ mb: 2 }}
        >
          Add New Curve
        </Button>
        <List>
          {curves.map((curve, index) => (
            <ListItem key={curve.id} secondaryAction={
              <IconButton edge="end" aria-label="delete" onClick={() => removeCurve(index)}>
                <DeleteIcon />
              </IconButton>
            }>
              <ListItemButton onClick={() => setSelectedCurveIndex(index)}>
                <ListItemText primary={`${curve.name}`} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {selectedCurveIndex !== null && (
        <CurveEditor
          curve={curves[selectedCurveIndex]}
          onUpdate={(updatedCurve) => handleCurveUpdate(updatedCurve)}
          onClose={handleCloseEditor}
        />
      )}
    </Box>
  );
};
