import { FC, useState } from "react";
import { TextField, Button, Slider, Typography, Box } from "@mui/material";
import { ObjectClass } from "@/service/subjects/types";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { generateSubjectsThunk } from "@/redux/thunks/simulationThunks";
import { setSimulationStepIndex } from "@/redux/slices/uiSlice";

export const SubjectGeneration: FC = () => {
  const dispatch = useAppDispatch();
  const activeStep = useAppSelector((state) => state.ui.simulationStepIndex);

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
    try {
      if (subjectCount < 1) {
        toast.error("Please set at least 1 subject");
        return;
      }
      dispatch(
        generateSubjectsThunk({ count: subjectCount, probabilityFactors })
      );
      dispatch(setSimulationStepIndex(activeStep + 1));
    } catch (err) {
      toast.error(`Error generating subjects: ${err}`);
      console.error("Subject generation error:", err);
    }
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
        error={subjectCount < 1}
        helperText={subjectCount < 1 ? "Minimum 1 subject required" : ""}
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
