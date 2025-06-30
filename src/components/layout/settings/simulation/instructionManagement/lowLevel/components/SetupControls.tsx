import React, { FC } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import {
  CameraVerticalAngle,
  ShotSize,
  SubjectView,
  SubjectInFramePosition,
  SubjectFraming,
  DynamicMode,
} from "@/service/simulation/instruction/types";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  setSetupConfigCameraAngle,
  setSetupConfigShotSize,
  setSetupConfigSubjectView,
  setSetupConfigSubjectFraming,
  setComplementSetupCameraAngle,
  setComplementSetupShotSize,
  setComplementSetupSubjectView,
  setComplementSetupSubjectFraming,
  setSetupKind,
} from "@/redux/slices/formSlice";

interface SetupControlsProps {
  isInitial: boolean;
}

export const SetupControls: FC<SetupControlsProps> = ({ isInitial }) => {
  const dispatch = useAppDispatch();
  const currentInstruction = useAppSelector(
    (state) => state.form.currentInstruction
  );

  const setup = isInitial
    ? currentInstruction.setup.config
    : currentInstruction.dynamic.type === DynamicMode.Interpolation
    ? currentInstruction.dynamic.complementSetup
    : undefined;

  const handleCameraAngleChange = (value: CameraVerticalAngle | undefined) => {
    dispatch(
      isInitial
        ? setSetupConfigCameraAngle(value)
        : setComplementSetupCameraAngle(value)
    );
  };

  const handleShotSizeChange = (value: ShotSize | undefined) => {
    dispatch(
      isInitial
        ? setSetupConfigShotSize(value)
        : setComplementSetupShotSize(value)
    );
  };

  const handleSubjectViewChange = (value: SubjectView | undefined) => {
    dispatch(
      isInitial
        ? setSetupConfigSubjectView(value)
        : setComplementSetupSubjectView(value)
    );
  };

  const handleFramingChange = (field: keyof SubjectFraming, value: any) => {
    const updatedFraming = value
      ? { ...(setup?.subjectFraming || {}), [field]: value }
      : undefined;

    dispatch(
      isInitial
        ? setSetupConfigSubjectFraming(updatedFraming)
        : setComplementSetupSubjectFraming(updatedFraming)
    );
  };

  const handleKindChange = (
    event: React.MouseEvent<HTMLElement>,
    newKind: "init" | "end" | null
  ) => {
    if (newKind !== null) {
      dispatch(setSetupKind(newKind));
    }
  };

  return (
    <>
      {isInitial && (
        <ToggleButtonGroup
          value={currentInstruction.setup.kind}
          exclusive
          onChange={handleKindChange}
          aria-label="setup kind"
          fullWidth
          size="small"
          sx={{ mb: 2 }}
        >
          <ToggleButton value="init" aria-label="start point">
            Define Start Point
          </ToggleButton>
          <ToggleButton value="end" aria-label="end point">
            Define End Point
          </ToggleButton>
        </ToggleButtonGroup>
      )}

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {isInitial
          ? currentInstruction.setup.kind === "init"
            ? "Start Setup"
            : "End Setup"
          : currentInstruction.setup.kind === "init"
          ? "End Setup"
          : "Start Setup"}
      </Typography>

      <FormControl fullWidth sx={{ mb: 2 }} size="small">
        <InputLabel>Camera Vertical Angle</InputLabel>
        <Select
          value={setup?.cameraAngle || ""}
          onChange={(e) =>
            handleCameraAngleChange(
              (e.target.value as CameraVerticalAngle) || undefined
            )
          }
          label="Camera Vertical Angle"
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {Object.values(CameraVerticalAngle).map((angle) => (
            <MenuItem key={angle} value={angle}>
              {angle}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 2 }} size="small">
        <InputLabel>Shot Size</InputLabel>
        <Select
          value={setup?.shotSize || ""}
          onChange={(e) =>
            handleShotSizeChange((e.target.value as ShotSize) || undefined)
          }
          label="Shot Size"
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {Object.values(ShotSize).map((size) => (
            <MenuItem key={size} value={size}>
              {size}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 2 }} size="small">
        <InputLabel>Subject View</InputLabel>
        <Select
          value={setup?.subjectView || ""}
          onChange={(e) =>
            handleSubjectViewChange(
              (e.target.value as SubjectView) || undefined
            )
          }
          label="Subject View"
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {Object.values(SubjectView).map((view) => (
            <MenuItem key={view} value={view}>
              {view}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
        Subject Framing
      </Typography>

      <Stack spacing={2}>
        <FormControl fullWidth size="small">
          <InputLabel>Frame Position</InputLabel>
          <Select
            value={setup?.subjectFraming?.position || ""}
            onChange={(e) =>
              handleFramingChange(
                "position",
                (e.target.value as SubjectInFramePosition) || undefined
              )
            }
            label="Frame Position"
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {Object.values(SubjectInFramePosition).map((position) => (
              <MenuItem key={position} value={position}>
                {position}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* <FormControl fullWidth size="small">
          <InputLabel>Subject Dutch Angle Scale</InputLabel>
          <Select
            value={setup?.subjectFraming?.dutchAngleScale || ""}
            onChange={(e) =>
              handleFramingChange(
                "dutchAngleScale",
                (e.target.value as Scale) || undefined
              )
            }
            label="Subject Scale in Frame"
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {Object.values(Scale).map((scale) => (
              <MenuItem key={scale} value={scale}>
                {scale}
              </MenuItem>
            ))}
          </Select>
        </FormControl> */}
      </Stack>
    </>
  );
};

export default SetupControls;
