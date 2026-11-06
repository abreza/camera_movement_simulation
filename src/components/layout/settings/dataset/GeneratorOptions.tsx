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
  DEFAULT_DATASET_MOVEMENT_DISTRIBUTION,
  DEFAULT_DATASET_SUBJECT_CLASS_PROBABILITIES,
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
import { ObjectClass } from "@/service/subjects/types";
import {
  isHumanMovement,
  isMovementSupportedForSubject,
} from "@/service/subjects/movements";
import { movementDisplayNames } from "./movementOptions";
import { ET_TRAINING_PRESET } from "@/service/dataset/etTrainingPreset";

interface GeneratorOptionsProps {
  onBack: () => void;
}

const subjectClasses = Object.values(ObjectClass);
const movementWeightSliderMax = Math.max(
  10,
  ...Object.values(DEFAULT_DATASET_MOVEMENT_DISTRIBUTION)
);

const weightsAreValid = (weights: Record<string, number>) => {
  const values = Object.values(weights);
  const sum = values.reduce((total, weight) => total + weight, 0);
  return values.every((weight) => Number.isFinite(weight) && weight >= 0) &&
    Number.isFinite(sum) && sum > 0;
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
  const classWeights = generatorOptions.subjectClassProbabilities ?? DEFAULT_DATASET_SUBJECT_CLASS_PROBABILITIES;
  const movementWeights = generatorOptions.movementDistribution ?? DEFAULT_DATASET_MOVEMENT_DISTRIBUTION;
  const applyNoise = generatorOptions.noiseConfig?.applyNoise ?? true;
  const isETProfile = !!generatorOptions.etTrainingProfile;

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
          value = newValue;
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
        ...movementWeights,
        [movementType]: newValue as number,
      };

      dispatch(
        setGeneratorOptions({
          movementDistribution: updatedDistribution,
        })
      );
    },
    [dispatch, movementWeights]
  );

  const resetMovementDistribution = useCallback(() => {
    dispatch(setGeneratorOptions({
      movementDistribution: { ...DEFAULT_DATASET_MOVEMENT_DISTRIBUTION },
    }));
  }, [dispatch]);

  const resetSubjectDistribution = useCallback(() => {
    dispatch(setGeneratorOptions({
      subjectClassProbabilities: { ...DEFAULT_DATASET_SUBJECT_CLASS_PROBABILITIES },
    }));
  }, [dispatch]);

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
    if (abortControllerRef.current || !canGenerate) return;

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
    const totalWeight = Object.values(movementWeights).reduce((sum, weight) => sum + weight, 0);

    return Object.entries(movementWeights).filter(([, value]) => value > 0).map(
      ([name, value]) => ({
        name: movementDisplayNames[name] || name,
        value: value,
        percentage:
          totalWeight > 0 ? Math.round((value / totalWeight) * 100) : 0,
      })
    );
  }, [movementWeights]);

  const simulationCountIsValid =
    Number.isInteger(generatorOptions.simulationCount) &&
    generatorOptions.simulationCount > 0;
  const framesPerSecond = generatorOptions.framesPerSecond ?? 30;
  const frameRateIsValid = Number.isFinite(framesPerSecond) && framesPerSecond >= 10 && framesPerSecond <= 120;
  const movementDistributionIsValid = weightsAreValid(movementWeights);
  const classDistributionIsValid = weightsAreValid(classWeights);
  const unsupportedMovements = movementTypes.filter((movement) =>
    (movementWeights[movement] ?? 0) > 0 && !subjectClasses.some((subjectClass) =>
      (classWeights[subjectClass] ?? 0) > 0 && isMovementSupportedForSubject(movement, subjectClass)
    )
  );
  const humanWeight = classWeights[ObjectClass.Human] ?? 0;
  const canGenerate =
    simulationCountIsValid && !generatingDataset &&
    (isETProfile || (frameRateIsValid && movementDistributionIsValid &&
      classDistributionIsValid && unsupportedMovements.length === 0));

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

      <Card variant="outlined" sx={{ my: 2 }}>
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <FormControlLabel
            control={
              <Switch
                checked={isETProfile}
                disabled={generatingDataset}
                onChange={(_, checked) => dispatch(setGeneratorOptions({
                  etTrainingProfile: checked ? ET_TRAINING_PRESET : undefined,
                }))}
              />
            }
            label="Match ET training distribution"
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            Human subjects with ET-like clip timing, small motions and pauses.
            Camera translation and rotation vary independently. Subject centering
            follows the training calibration; body heading, body size and detailed
            camera setup are unavailable to the model.
          </Typography>
          {isETProfile && (
            <>
              <FormControlLabel
                control={
                  <Switch
                    checked={generatorOptions.etTrainingProfile?.useCenteredPrincipalPointFovProxy ?? false}
                    disabled={generatingDataset}
                    onChange={(_, checked) => dispatch(setGeneratorOptions({
                      etTrainingProfile: {
                        ...generatorOptions.etTrainingProfile!,
                        useCenteredPrincipalPointFovProxy: checked,
                      },
                    }))}
                  />
                }
                label="Use ET lens estimate"
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                The estimate adjusts horizontal and vertical viewing angles and
                assumes the recorded principal point is the image center.
                This calibration has no measured human bounding
                boxes, so shot size remains approximate.
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      {!isETProfile && <Box>
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

      <TextField
        fullWidth
        label="Frames per second"
        type="number"
        value={framesPerSecond}
        onChange={(event) => dispatch(setGeneratorOptions({
          framesPerSecond: Number(event.target.value),
        }))}
        slotProps={{ htmlInput: { min: 10, max: 120, step: 1 } }}
        error={!frameRateIsValid}
        helperText={frameRateIsValid
          ? `Clip duration: ${(((generatorOptions.minFrameCount ?? MIN_DATASET_FRAME_COUNT) - 1) / framesPerSecond).toFixed(1)}–${(((generatorOptions.maxFrameCount ?? MAX_DATASET_FRAME_COUNT) - 1) / framesPerSecond).toFixed(1)} seconds.`
          : "Enter a frame rate from 10 to 120."}
        margin="dense"
        size="small"
        disabled={generatingDataset}
      />

      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle2">Subject selection weights</Typography>
        <Button size="small" onClick={resetSubjectDistribution} disabled={generatingDataset}>
          Reset defaults
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        The movement is chosen first, then a compatible subject is sampled with
        these relative weights. Human motions use people; props only appear in
        static clips. A weight of zero excludes a subject type. Subject dimensions
        vary randomly within each type.
      </Typography>
      <Grid container spacing={1}>
        {subjectClasses.map((subjectClass) => (
          <Grid key={subjectClass} size={{ xs: 6 }}>
            <TextField
              fullWidth
              label={subjectClass.charAt(0).toUpperCase() + subjectClass.slice(1)}
              type="number"
              value={classWeights[subjectClass] ?? 0}
              onChange={(event) => dispatch(setGeneratorOptions({
                subjectClassProbabilities: { ...classWeights, [subjectClass]: Number(event.target.value) },
              }))}
              slotProps={{ htmlInput: { min: 0, step: 0.1 } }}
              error={!Number.isFinite(classWeights[subjectClass] ?? 0) || (classWeights[subjectClass] ?? 0) < 0}
              size="small"
              disabled={generatingDataset}
            />
          </Grid>
        ))}
      </Grid>
      {!classDistributionIsValid && (
        <Typography variant="caption" color="error">Set at least one positive subject weight; all weights must be nonnegative.</Typography>
      )}

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
                checked={applyNoise}
                onChange={handleNoiseConfigChange("applyNoise")}
                disabled={generatingDataset}
              />
            }
            label="Apply Movement Noise"
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            These controls add noise to path motions. Human motions use their own
            built-in variation; static subjects stay still.
          </Typography>

          {applyNoise && (
            <Box>
              <Typography
                variant="caption"
                gutterBottom
                sx={{ display: "block" }}
              >
                Position Amplitude:{" "}
                {(generatorOptions.noiseConfig?.positionAmplitude ?? 0.1).toFixed(2)}
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
                {(generatorOptions.noiseConfig?.rotationAmplitude ?? 0.02).toFixed(3)}
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
                {(generatorOptions.noiseConfig?.frequency ?? 0.5).toFixed(1)}
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
        <Typography variant="subtitle2">Movement type weights</Typography>
        <Button
          variant="text"
          size="small"
          onClick={resetMovementDistribution}
          disabled={generatingDataset}
        >
          Reset defaults
        </Button>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        By default, static clips have a 50% selection probability. All other movement
        types share the remaining 50% equally.
      </Typography>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
              <Box sx={{ height: 240 }}>
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
          <Card variant="outlined" sx={{ maxHeight: 300, overflowY: "auto" }}>
            <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
              {movementTypes.map((movementType) => (
                <Box key={movementType} sx={{ mb: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Typography variant="caption" noWrap sx={{ flexGrow: 1 }}>
                      {movementDisplayNames[movementType]}:{" "}
                      {movementWeights[movementType] ?? 0}
                    </Typography>
                    <Tooltip
                      title={
                        <MovementPreview
                          movementType={movementType}
                          subjectClass={subjectClasses
                            .filter((subjectClass) => isMovementSupportedForSubject(movementType, subjectClass))
                            .sort((a, b) => (classWeights[b] ?? 0) - (classWeights[a] ?? 0))[0]}
                          framesPerSecond={frameRateIsValid ? framesPerSecond : 30}
                          noiseConfig={
                            applyNoise
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
                      <IconButton size="small" sx={{ ml: 1 }} aria-label={`Preview ${movementDisplayNames[movementType] ?? movementType}`}>
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Slider
                    value={
                      movementWeights[movementType] ?? 0
                    }
                    onChange={handleMovementDistributionChange(movementType)}
                    min={0}
                    max={movementWeightSliderMax}
                    step={0.1}
                    valueLabelDisplay="auto"
                    size="small"
                    disabled={generatingDataset}
                  />
                  {isHumanMovement(movementType) && humanWeight <= 0 && (
                    <Typography variant="caption" color={(movementWeights[movementType] ?? 0) > 0 ? "error" : "text.secondary"}>
                      Requires a positive Human weight.
                    </Typography>
                  )}
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {!movementDistributionIsValid && (
        <Typography variant="caption" color="error">Set at least one positive movement weight.</Typography>
      )}
      {unsupportedMovements.length > 0 && (
        <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
          No compatible subject is enabled for {unsupportedMovements.map((movement) => movementDisplayNames[movement] ?? movement).join(", ")}. Add a compatible subject weight or set these movement weights to zero.
        </Typography>
      )}
      </Box>}

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
