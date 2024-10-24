
import { FC, useState } from "react";
import { TextField, Button, Slider, Typography, Box, List, ListItem, ListItemText, ListItemButton } from "@mui/material";
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
  points: { x: number, y: number }[];
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
    // Close the currently open curve editor window
    setSelectedCurveIndex(null);

    // Create and add a new curve
    const newCurve: Curve = {
      id: curves.length,
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 0 },
      ],
    };
    setCurves([...curves, newCurve]);
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
            <ListItem key={curve.id}>
              <ListItemButton onClick={() => setSelectedCurveIndex(index)}>
                <ListItemText primary={`Curve ${index + 1}`} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {selectedCurveIndex !== null && (
        <CurveEditor
          curve={curves[selectedCurveIndex]}
          onUpdate={(updatedCurve) => handleCurveUpdate(updatedCurve)}
          onClose={handleCloseEditor} // Pass the close function
        />
      )}
    </Box>
  );
};
