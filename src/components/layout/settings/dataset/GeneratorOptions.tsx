import React, { useCallback, useRef, useState } from "react";
import {
  Button,
  TextField,
  Slider,
  Typography,
  Box,
  LinearProgress,
} from "@mui/material";
import { GenerateDatasetConfig } from "@/service/dataset/generate";

interface GeneratorOptionsProps {
  generatingDataset: boolean;
  onGenerate: (options: GenerateDatasetConfig) => void;
  onClose: () => void;
}

export const GeneratorOptions: React.FC<GeneratorOptionsProps> = ({
  generatingDataset,
  onGenerate,
  onClose,
}) => {
  const [options, setOptions] = useState<GenerateDatasetConfig>({
    simulationCount: 1000,
    subjectCount: 1,
    instructionCount: 1,
    minFrameCount: 30,
    maxFrameCount: 30,
  });
  const [progress, setProgress] = useState<number>(0);
  const lastUpdateTime = useRef<number>(0);

  const handleChange = useCallback(
    (name: keyof GenerateDatasetConfig) =>
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
      },
    []
  );

  const throttledSetProgress = useCallback((value: number) => {
    const now = Date.now();
    if (now - lastUpdateTime.current > 100) {
      setProgress(value);
      lastUpdateTime.current = now;
    }
  }, []);

  const handleGenerate = async () => {
    setProgress(0);
    lastUpdateTime.current = 0;

    const configWithProgress: GenerateDatasetConfig = {
      ...options,
      onProgress: (value: number) => {
        if (value > progress) {
          throttledSetProgress(value);
        }
      },
    };

    try {
      await onGenerate(configWithProgress);
    } catch (error) {
      console.error("Error generating dataset:", error);
    }
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
        value={[options.minFrameCount ?? 30, options.maxFrameCount ?? 300]}
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

      {generatingDataset && (
        <Box sx={{ width: "100%", mt: 2 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ mb: 1 }}
          />
          <Typography variant="body2" color="text.secondary" align="center">
            {Math.round(progress)}% Complete
          </Typography>
        </Box>
      )}

      <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between" }}>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{ width: "48%" }}
          size="small"
          disabled={generatingDataset}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleGenerate}
          sx={{ width: "48%" }}
          size="small"
          disabled={generatingDataset}
        >
          {generatingDataset ? "Generating..." : "Generate Dataset"}
        </Button>
      </Box>
    </Box>
  );
};
