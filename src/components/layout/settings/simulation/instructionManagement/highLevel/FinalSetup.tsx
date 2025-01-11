import React, { FC } from "react";
import { Typography } from "@mui/material";
import { SelectChangeEvent } from "@mui/material/Select";
import {
  CameraVerticalAngle,
  ShotSize,
  SubjectView,
  SubjectInFramePosition,
} from "@/service/simulation/instruction/types";
import { SelectRenderer } from "./SelectRenderer";

interface FinalSetupProps {
  disabledFields: string[];
  final: {
    cameraAngle?: CameraVerticalAngle;
    shotSize?: ShotSize;
    subjectView?: SubjectView;
    subjectFraming?: SubjectInFramePosition;
  };
  handleFinalChange: (
    field: string
  ) => (event: SelectChangeEvent<string>) => void;
}

export const FinalSetup: FC<FinalSetupProps> = ({
  disabledFields,
  final,
  handleFinalChange,
}) => {
  const elements: React.ReactNode[] = [];
  let hasContent = false;

  if (
    !disabledFields.includes("cameraAngle") ||
    !disabledFields.includes("subjectView")
  ) {
    hasContent = true;
    elements.push(
      <React.Fragment key="camera-angle-view">
        {!disabledFields.includes("cameraAngle") && (
          <>
            a{" "}
            <SelectRenderer
              options={Object.values(CameraVerticalAngle)}
              value={final.cameraAngle ?? ""}
              onChange={handleFinalChange("cameraAngle")}
              haveEmptyOption
              enumType="CameraVerticalAngle"
            />{" "}
            camera angle
          </>
        )}
        {!disabledFields.includes("cameraAngle") &&
          !disabledFields.includes("subjectView") &&
          " from "}
        {!disabledFields.includes("subjectView") && (
          <>
            the{" "}
            <SelectRenderer
              options={Object.values(SubjectView)}
              value={final.subjectView ?? ""}
              onChange={handleFinalChange("subjectView")}
              haveEmptyOption
              enumType="SubjectView"
            />
            {" view"}
          </>
        )}
      </React.Fragment>
    );
  }

  if (!disabledFields.includes("shotSize")) {
    if (hasContent) elements.push(<span key="comma-1">, </span>);
    hasContent = true;
    elements.push(
      <React.Fragment key="shot-size">
        {elements.length === 0 ? "a " : ""}
        <SelectRenderer
          options={Object.values(ShotSize)}
          value={final.shotSize ?? ""}
          onChange={handleFinalChange("shotSize")}
          haveEmptyOption
          enumType="ShotSize"
        />{" "}
        shot
      </React.Fragment>
    );
  }

  if (!disabledFields.includes("subjectFraming")) {
    if (hasContent) elements.push(<span key="comma-2">, </span>);
    elements.push(
      <React.Fragment key="subject-framing">
        positioning the subject in the{" "}
        <SelectRenderer
          options={Object.values(SubjectInFramePosition)}
          value={final.subjectFraming ?? ""}
          onChange={handleFinalChange("subjectFraming")}
          haveEmptyOption
          enumType="SubjectInFramePosition"
        />{" "}
        portion of the frame
      </React.Fragment>
    );
  }

  if (elements.length === 0) {
    return null;
  }

  return (
    <Typography variant="body2" sx={{ lineHeight: 2, fontWeight: 300 }}>
      Finally, conclude with {elements}
    </Typography>
  );
};
