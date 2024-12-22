import React, { useState } from "react";
import { Button, TextField, Slider, Typography, Box } from "@mui/material";

interface GeneratorOptionsProps {
  onGenerate: (options: GenerateRandomDatasetOptions) => void;
  onClose: () => void;
}

export const GeneratorOptions: React.FC<GeneratorOptionsProps> = ({
  onGenerate,
  onClose,
}) => {
  const [options, setOptions] = useState<GenerateRandomDatasetOptions>({
    simulationCount: 100,
    subjectCount: 5,
    instructionCount: 1,
    minFrameCount: 30,
    maxFrameCount: 120,
  });

  const handleChange =
    (name: keyof GenerateRandomDatasetOptions) =>
    (
      event: React.ChangeEvent<HTMLInputElement> | Event,
      newValue: number | number[]
    ) => {
      setOptions((prevOptions) => ({
        ...prevOptions,
        [name]:
          name === "simulationCount"
            ? parseInt(
                (event as React.ChangeEvent<HTMLInputElement>).target.value,
                10
              )
            : (newValue as number),
      }));
    };

  const handleGenerate = () => {
    onGenerate(options);
    onClose();
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="subtitle1" gutterBottom>
        Generator Options
      </Typography>
      <TextField
        fullWidth
        label="Simulation Count"
        type="number"
        value={options.simulationCount}
        onChange={
          handleChange(
            "simulationCount"
          ) as React.ChangeEventHandler<HTMLInputElement>
        }
        margin="dense"
        inputProps={{ min: 1 }}
        size="small"
      />
      <Typography variant="body2" gutterBottom>
        Subject Count: {options.subjectCount}
      </Typography>
      <Slider
        value={options.subjectCount ?? 3}
        onChange={handleChange("subjectCount")}
        min={1}
        max={10}
        step={1}
        marks
        valueLabelDisplay="auto"
        size="small"
      />
      <Typography variant="body2" gutterBottom>
        Instruction Count: {options.instructionCount}
      </Typography>
      <Slider
        value={options.instructionCount ?? 3}
        onChange={handleChange("instructionCount")}
        min={1}
        max={10}
        step={1}
        marks
        valueLabelDisplay="auto"
        size="small"
      />
      <Typography variant="body2" gutterBottom>
        Frame Count Range
      </Typography>
      <Slider
        value={[options.minFrameCount ?? 30, options.maxFrameCount ?? 120]}
        onChange={(event, newValue) => {
          setOptions((prevOptions) => ({
            ...prevOptions,
            minFrameCount: (newValue as number[])[0],
            maxFrameCount: (newValue as number[])[1],
          }));
        }}
        min={10}
        max={300}
        step={10}
        marks
        valueLabelDisplay="auto"
        size="small"
      />
      <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between" }}>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{ width: "48%" }}
          size="small"
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleGenerate}
          sx={{ width: "48%" }}
          size="small"
        >
          Generate Dataset
        </Button>
      </Box>
    </Box>
  );
};
