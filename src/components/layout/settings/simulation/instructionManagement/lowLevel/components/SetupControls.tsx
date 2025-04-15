import React, { FC } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Stack,
} from "@mui/material";
import {
  CameraVerticalAngle,
  ShotSize,
  SubjectView,
  SubjectInFramePosition,
  Scale,
  SubjectFraming,
} from "@/service/simulation/instruction/types";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  setInitialCameraAngle,
  setInitialShotSize,
  setInitialSubjectView,
  setInitialSubjectFraming,
  setEndCameraAngle,
  setEndShotSize,
  setEndSubjectView,
  setEndSubjectFraming,
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
    ? currentInstruction.initialSetup
    : currentInstruction.dynamic.type === "interpolation"
    ? currentInstruction.dynamic.endSetup
    : undefined;

  const handleCameraAngleChange = (value: CameraVerticalAngle | undefined) => {
    dispatch(
      isInitial ? setInitialCameraAngle(value) : setEndCameraAngle(value)
    );
  };

  const handleShotSizeChange = (value: ShotSize | undefined) => {
    dispatch(isInitial ? setInitialShotSize(value) : setEndShotSize(value));
  };

  const handleSubjectViewChange = (value: SubjectView | undefined) => {
    dispatch(
      isInitial ? setInitialSubjectView(value) : setEndSubjectView(value)
    );
  };

  const handleFramingChange = (field: keyof SubjectFraming, value: any) => {
    const updatedFraming = value
      ? { ...(setup?.subjectFraming || {}), [field]: value }
      : undefined;

    dispatch(
      isInitial
        ? setInitialSubjectFraming(updatedFraming)
        : setEndSubjectFraming(updatedFraming)
    );
  };

  return (
    <>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {isInitial ? "Initial Setup" : "End Setup"}
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

        <FormControl fullWidth size="small">
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
        </FormControl>
      </Stack>
    </>
  );
};

export default SetupControls;
