import React, { useCallback, useRef } from "react";
import {
  Button,
  TextField,
  Slider,
  Typography,
  Box,
  LinearProgress,
} from "@mui/material";
import { GenerateDatasetConfig } from "@/service/dataset/generate";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  setGeneratingDataset,
  setGeneratorOptions,
  setProgress,
  setProgressPhase,
} from "@/redux/slices/uiSlice";
import { generateRandomDataset } from "@/service/dataset/generate";

interface GeneratorOptionsProps {
  onClose: () => void;
}

export const GeneratorOptions: React.FC<GeneratorOptionsProps> = ({
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const { generatingDataset, progress, progressPhase, generatorOptions } =
    useAppSelector((state) => state.ui);

  const lastUpdateTime = useRef<number>(0);

  const handleChange = useCallback(
    (name: keyof GenerateDatasetConfig) =>
      (
        event: React.ChangeEvent<HTMLInputElement> | Event,
        newValue: number | number[]
      ) => {
        if (name === "simulationCount") {
          dispatch(
            setGeneratorOptions({
              [name]: parseInt(
                (event as React.ChangeEvent<HTMLInputElement>).target.value,
                10
              ),
            })
          );
        } else {
          dispatch(
            setGeneratorOptions({
              [name]: newValue as number,
            })
          );
        }
      },
    [dispatch]
  );

  const throttledSetProgress = useCallback(
    (value: number) => {
      const now = Date.now();
      if (now - lastUpdateTime.current > 100) {
        dispatch(setProgress(value));
        lastUpdateTime.current = now;
      }
    },
    [dispatch]
  );

  const handleGenerate = async () => {
    dispatch(setProgress(0));
    lastUpdateTime.current = 0;

    const configWithProgress: GenerateDatasetConfig = {
      ...generatorOptions,
      onProgress: (value: number, phase: "generating" | "zipping") => {
        if (value > progress) {
          throttledSetProgress(value);
        }
        if (phase !== progressPhase) {
          dispatch(setProgressPhase(phase));
        }
      },
    };

    try {
      dispatch(setGeneratingDataset(true));
      await generateRandomDataset(configWithProgress);
      dispatch(setGeneratingDataset(false));
      onClose();
    } catch (error) {
      console.error("Error generating dataset:", error);
      dispatch(setGeneratingDataset(false));
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
        value={generatorOptions.simulationCount}
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
        Subject Count: {generatorOptions.subjectCount}
      </Typography>
      <Slider
        value={generatorOptions.subjectCount ?? 3}
        onChange={handleChange("subjectCount")}
        min={1}
        max={10}
        step={1}
        marks
        valueLabelDisplay="auto"
        size="small"
      />
      <Typography variant="body2" gutterBottom>
        Instruction Count: {generatorOptions.instructionCount}
      </Typography>
      <Slider
        value={generatorOptions.instructionCount ?? 3}
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
        value={[
          generatorOptions.minFrameCount ?? 30,
          generatorOptions.maxFrameCount ?? 30,
        ]}
        onChange={(event, newValue) => {
          dispatch(
            setGeneratorOptions({
              minFrameCount: (newValue as number[])[0],
              maxFrameCount: (newValue as number[])[1],
            })
          );
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
            {progressPhase === "generating" ? "Generating: " : "Zipping: "}
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
