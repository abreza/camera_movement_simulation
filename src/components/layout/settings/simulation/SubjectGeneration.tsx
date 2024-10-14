import { FC, useState } from "react";
import { TextField, Button, Slider, Typography, Box } from "@mui/material";
import { ObjectClass } from "@/types/simulation";

interface SubjectGenerationProps {
  onGenerateSubjects: (
    count: number,
    probabilityFactors: Record<ObjectClass, number>
  ) => void;
  handleNext: () => void;
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
    </Box>
  );
};
