import React, { useCallback, useEffect, useRef, useMemo } from "react";
import {
  Button,
  TextField,
  Slider,
  Typography,
  Box,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  Tooltip,
  Divider,
  Stack,
  IconButton,
  Switch,
  FormControlLabel,
  Fade,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import type {
  DatasetProgressPhase,
  GenerateDatasetConfig,
} from "@/service/dataset/generate";
import {
  DATASET_INSTRUCTION_COUNT,
  DATASET_MOVEMENT_TYPES,
  DATASET_SUBJECT_COUNT,
  MAX_DATASET_ROTATION_NOISE_AMPLITUDE,
  MAX_DATASET_FRAME_COUNT,
  MIN_DATASET_FRAME_COUNT,
} from "@/service/dataset/generate";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  setGeneratingDataset,
  setGeneratorOptions,
  setProgress,
  setProgressPhase,
} from "@/redux/slices/uiSlice";
import { generateRandomDataset } from "@/service/dataset/generateClient";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { MovementPreview } from "./MovementPreview";
import { toast } from "react-toastify";

interface GeneratorOptionsProps {
  onBack: () => void;
}

const movementDisplayNames: Record<string, string> = {
  circular: "Circular",
  zigzag: "Zigzag",
  linear: "Linear",
  spiral: "Spiral",
  static: "Static",
  figureEight: "Figure Eight",
  wave: "Wave",
  pendulum: "Pendulum",
  orbital: "Orbital",
  bounce: "Bounce",
};

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FF6B6B",
  "#6B88FF",
  "#C9B3FF",
  "#FFD700",
];

export const GeneratorOptions: React.FC<GeneratorOptionsProps> = ({
  onBack,
}) => {
  const dispatch = useAppDispatch();
  const { generatingDataset, progress, progressPhase, generatorOptions } =
    useAppSelector((state) => state.ui);

  const lastUpdateTime = useRef<number>(0);
  const progressPhaseRef = useRef<DatasetProgressPhase>("generating");
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    []
  );

  const movementTypes = useMemo(() => [...DATASET_MOVEMENT_TYPES], []);

  const handleChange = useCallback(
    (name: keyof GenerateDatasetConfig) =>
      (
        event: React.ChangeEvent<HTMLInputElement> | Event,
        newValue: number | number[]
      ) => {
        if (name === "simulationCount") {
          const parsedValue = Number.parseInt(
            (event as React.ChangeEvent<HTMLInputElement>).target.value,
            10
          );
          dispatch(
            setGeneratorOptions({
              [name]: Number.isNaN(parsedValue) ? 0 : parsedValue,
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

  const handleNoiseConfigChange = useCallback(
    (name: keyof NonNullable<GenerateDatasetConfig["noiseConfig"]>) =>
      (
        event: React.ChangeEvent<HTMLInputElement> | Event,
        newValue?: number | boolean
      ) => {
        let value: number | boolean;

        if (newValue !== undefined) {
          value = newValue as any;
        } else {
          return;
        }

        dispatch(
          setGeneratorOptions({
            noiseConfig: {
              ...generatorOptions.noiseConfig,
              [name]: value,
            },
          })
        );
      },
    [dispatch, generatorOptions.noiseConfig]
  );

  const handleMovementDistributionChange = useCallback(
    (movementType: string) => (event: Event, newValue: number | number[]) => {
      const updatedDistribution = {
        ...generatorOptions.movementDistribution,
        [movementType]: newValue as number,
      };

      dispatch(
        setGeneratorOptions({
          movementDistribution: updatedDistribution,
        })
      );
    },
    [dispatch, generatorOptions.movementDistribution]
  );

  const resetMovementDistribution = useCallback(() => {
    const equalDistribution = movementTypes.reduce((acc, movement) => {
      acc[movement] = 1;
      return acc;
    }, {} as Record<string, number>);

    dispatch(
      setGeneratorOptions({
        movementDistribution: equalDistribution,
      })
    );
  }, [dispatch, movementTypes]);

  const throttledSetProgress = useCallback(
    (value: number) => {
      const now = Date.now();
      if (value >= 100 || now - lastUpdateTime.current > 100) {
        dispatch(setProgress(value));
        lastUpdateTime.current = now;
      }
    },
    [dispatch]
  );

  const handleGenerate = async () => {
    if (abortControllerRef.current) return;

    dispatch(setProgress(0));
    dispatch(setProgressPhase("generating"));
    lastUpdateTime.current = 0;
    progressPhaseRef.current = "generating";
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const configWithProgress: GenerateDatasetConfig = {
      ...generatorOptions,
      subjectCount: DATASET_SUBJECT_COUNT,
      instructionCount: DATASET_INSTRUCTION_COUNT,
      onProgress: (value: number, phase: DatasetProgressPhase) => {
        if (phase !== progressPhaseRef.current) {
          progressPhaseRef.current = phase;
          dispatch(setProgressPhase(phase));
          dispatch(setProgress(value));
          lastUpdateTime.current = Date.now();
        } else {
          throttledSetProgress(value);
        }
      },
    };

    let completed = false;
    try {
      dispatch(setGeneratingDataset(true));
      await generateRandomDataset(configWithProgress, {
        signal: abortController.signal,
      });
      completed = true;
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error("Error generating dataset:", error);
        toast.error(
          error instanceof Error
            ? `Dataset generation failed: ${error.message}`
            : "Dataset generation failed."
        );
      }
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      dispatch(setGeneratingDataset(false));
    }

    if (completed) onBack();
  };

  const handleCancel = () => {
    if (generatingDataset) {
      abortControllerRef.current?.abort();
    } else {
      onBack();
    }
  };

  const pieChartData = useMemo(() => {
    if (!generatorOptions.movementDistribution) return [];

    const totalWeight = Object.values(
      generatorOptions.movementDistribution
    ).reduce((sum, weight) => sum + weight, 0);

    return Object.entries(generatorOptions.movementDistribution).map(
      ([name, value]) => ({
        name: movementDisplayNames[name] || name,
        value: value,
        percentage:
          totalWeight > 0 ? Math.round((value / totalWeight) * 100) : 0,
      })
    );
  }, [generatorOptions.movementDistribution]);

  const simulationCountIsValid =
    Number.isInteger(generatorOptions.simulationCount) &&
    generatorOptions.simulationCount > 0;
  const movementDistributionIsValid =
    Object.values(generatorOptions.movementDistribution ?? {}).reduce(
      (sum, weight) => sum + weight,
      0
    ) > 0;
  const canGenerate =
    simulationCountIsValid && movementDistributionIsValid && !generatingDataset;

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="subtitle1" gutterBottom>
        Generator Options
      </Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
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
          slotProps={{ htmlInput: { min: 1 } }}
          size="small"
          disabled={generatingDataset}
          error={!simulationCountIsValid}
          helperText={
            simulationCountIsValid
              ? undefined
              : "Enter a positive whole number."
          }
        />
      </Stack>

      <Typography variant="caption" color="text.secondary">
        Each sample contains exactly one subject and one instruction, so their
        association is unambiguous.
      </Typography>

      <TextField
        fullWidth
        label="Dataset Seed (optional)"
        value={generatorOptions.seed ?? ""}
        onChange={(event) =>
          dispatch(
            setGeneratorOptions({
              seed: event.target.value || undefined,
            })
          )
        }
        helperText="Reuse a seed from manifest.json to reproduce the same sample content."
        margin="dense"
        size="small"
        disabled={generatingDataset}
      />

      <Typography variant="body2" gutterBottom>
        Frame Count Range
      </Typography>
      <Slider
        value={[
          generatorOptions.minFrameCount ?? MIN_DATASET_FRAME_COUNT,
          generatorOptions.maxFrameCount ?? MAX_DATASET_FRAME_COUNT,
        ]}
        onChange={(event, newValue) => {
          dispatch(
            setGeneratorOptions({
              minFrameCount: (newValue as number[])[0],
              maxFrameCount: (newValue as number[])[1],
            })
          );
        }}
        min={MIN_DATASET_FRAME_COUNT}
        max={MAX_DATASET_FRAME_COUNT}
        step={10}
        marks
        valueLabelDisplay="auto"
        size="small"
        disabled={generatingDataset}
      />

      <Divider sx={{ my: 2 }} />

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Typography variant="subtitle2">
          Movement Noise Configuration
        </Typography>
      </Box>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <FormControlLabel
            control={
              <Switch
                checked={generatorOptions.noiseConfig?.applyNoise ?? false}
                onChange={handleNoiseConfigChange("applyNoise")}
                disabled={generatingDataset}
              />
            }
            label="Apply Movement Noise"
          />

          {generatorOptions.noiseConfig?.applyNoise && (
            <Box>
              <Typography
                variant="caption"
                gutterBottom
                sx={{ display: "block" }}
              >
                Position Amplitude:{" "}
                {generatorOptions.noiseConfig?.positionAmplitude?.toFixed(2)}
              </Typography>
              <Slider
                value={generatorOptions.noiseConfig?.positionAmplitude ?? 0.1}
                onChange={handleNoiseConfigChange("positionAmplitude")}
                min={0}
                max={1}
                step={0.01}
                valueLabelDisplay="auto"
                size="small"
                disabled={generatingDataset}
              />

              <Typography
                variant="caption"
                gutterBottom
                sx={{ display: "block" }}
              >
                Rotation Amplitude:{" "}
                {generatorOptions.noiseConfig?.rotationAmplitude?.toFixed(3)}
              </Typography>
              <Slider
                value={generatorOptions.noiseConfig?.rotationAmplitude ?? 0.02}
                onChange={handleNoiseConfigChange("rotationAmplitude")}
                min={0}
                max={MAX_DATASET_ROTATION_NOISE_AMPLITUDE}
                step={0.005}
                valueLabelDisplay="auto"
                size="small"
                disabled={generatingDataset}
              />

              <Typography
                variant="caption"
                gutterBottom
                sx={{ display: "block" }}
              >
                Noise Cycles per Clip:{" "}
                {generatorOptions.noiseConfig?.frequency?.toFixed(1)}
              </Typography>
              <Slider
                value={generatorOptions.noiseConfig?.frequency ?? 0.5}
                onChange={handleNoiseConfigChange("frequency")}
                min={0.1}
                max={2}
                step={0.1}
                valueLabelDisplay="auto"
                size="small"
                disabled={generatingDataset}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Typography variant="subtitle2">Movement Type Distribution</Typography>
        <Button
          variant="text"
          size="small"
          onClick={resetMovementDistribution}
          disabled={generatingDataset}
        >
          Reset
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
              <Box sx={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({
                        cx,
                        cy,
                        midAngle = 0,
                        innerRadius,
                        outerRadius,
                        percent = 0,
                        name,
                      }) => {
                        const RADIAN = Math.PI / 180;
                        const radius =
                          innerRadius + (outerRadius - innerRadius) * 1.1;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text
                            x={x}
                            y={y}
                            fill="#333"
                            fontSize="10px"
                            fontWeight={800}
                            textAnchor={x > cx ? "start" : "end"}
                            dominantBaseline="central"
                          >
                            {`${Math.round(percent * 100)}%`}
                          </text>
                        );
                      }}
                      outerRadius={60}
                      innerRadius={20}
                      fill="#8884d8"
                      dataKey="value"
                      minAngle={3}
                      paddingAngle={1}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>

                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: "10px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ maxHeight: 220, overflowY: "auto" }}>
            <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
              {movementTypes.map((movementType) => (
                <Box key={movementType} sx={{ mb: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Typography variant="caption" noWrap sx={{ flexGrow: 1 }}>
                      {movementDisplayNames[movementType]}:{" "}
                      {generatorOptions.movementDistribution?.[movementType] ||
                        0}
                    </Typography>
                    <Tooltip
                      title={
                        <MovementPreview
                          movementType={movementType}
                          noiseConfig={
                            generatorOptions.noiseConfig?.applyNoise
                              ? {
                                  positionAmplitude:
                                    generatorOptions.noiseConfig
                                      ?.positionAmplitude,
                                  rotationAmplitude:
                                    generatorOptions.noiseConfig
                                      ?.rotationAmplitude,
                                  frequency:
                                    generatorOptions.noiseConfig?.frequency,
                                }
                              : undefined
                          }
                        />
                      }
                      arrow
                      placement="right"
                      slots={{ transition: Fade }}
                      slotProps={{ transition: { unmountOnExit: true } }}
                    >
                      <IconButton size="small" sx={{ ml: 1 }}>
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Slider
                    value={
                      generatorOptions.movementDistribution?.[movementType] || 0
                    }
                    onChange={handleMovementDistributionChange(movementType)}
                    min={0}
                    max={10}
                    step={0.1}
                    valueLabelDisplay="auto"
                    size="small"
                    disabled={generatingDataset}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
          onClick={handleCancel}
          sx={{ width: "48%" }}
          size="small"
        >
          {generatingDataset ? "Cancel Generation" : "Back"}
        </Button>
        <Button
          variant="contained"
          onClick={handleGenerate}
          sx={{ width: "48%" }}
          size="small"
          disabled={!canGenerate}
        >
          {generatingDataset ? "Generating..." : "Generate Dataset"}
        </Button>
      </Box>
    </Box>
  );
};
