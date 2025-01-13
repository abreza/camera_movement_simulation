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

interface SetupControlsProps {
  isInitial: boolean;
  cameraAngle: CameraVerticalAngle | undefined;
  setCameraAngle: (angle: CameraVerticalAngle | undefined) => void;
  shotSize: ShotSize | undefined;
  setShotSize: (size: ShotSize | undefined) => void;
  subjectView: SubjectView | undefined;
  setSubjectView: (view: SubjectView | undefined) => void;
  subjectFraming: SubjectFraming | undefined;
  setSubjectFraming: (framing: SubjectFraming | undefined) => void;
}

export const SetupControls: FC<SetupControlsProps> = ({
  isInitial,
  cameraAngle,
  setCameraAngle,
  shotSize,
  setShotSize,
  subjectView,
  setSubjectView,
  subjectFraming,
  setSubjectFraming,
}) => {
  const handleFramingChange = (field: keyof SubjectFraming, value: any) => {
    if (!value) {
      setSubjectFraming(undefined);
      return;
    }

    setSubjectFraming({
      ...subjectFraming,
      [field]: value,
    } as SubjectFraming);
  };

  return (
    <>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {isInitial ? "Initial Setup" : "End Setup"}
      </Typography>

      <FormControl fullWidth sx={{ mb: 2 }} size="small">
        <InputLabel>Camera Vertical Angle</InputLabel>
        <Select
          value={cameraAngle || ""}
          onChange={(e) =>
            setCameraAngle((e.target.value as CameraVerticalAngle) || undefined)
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
          value={shotSize || ""}
          onChange={(e) =>
            setShotSize((e.target.value as ShotSize) || undefined)
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
          value={subjectView || ""}
          onChange={(e) =>
            setSubjectView((e.target.value as SubjectView) || undefined)
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
            value={subjectFraming?.position || ""}
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
            value={subjectFraming?.dutchAngleScale || ""}
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
