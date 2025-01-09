import { useState } from "react";
import { DEFAULT_FRAME_COUNT } from "@/service/simulation/constants";
import {
  MovementEasing,
  CameraSubjectDistance,
  Scale,
  CameraVerticalAngle,
  ShotSize,
  SubjectView,
  SubjectFraming,
  SubjectInFramePosition,
} from "@/service/simulation/instruction/types";

export const useInstructionForm = () => {
  const [frameCount, setFrameCount] = useState<number>(DEFAULT_FRAME_COUNT);
  const [movementEasing, setMovementEasing] = useState<MovementEasing>(
    MovementEasing.Linear
  );
  const [selectedSubjectIndex, setSelectedSubjectIndex] = useState<
    number | undefined
  >(0);
  const [visibilityConstraint, setVisibilityConstraint] = useState<
    boolean | undefined
  >(true);
  const [subjectAwareInterpolation, setSubjectAwareInterpolation] =
    useState<boolean>();
  const [distanceType, setDistanceType] = useState<
    CameraSubjectDistance | undefined
  >();
  const [distanceScale, setDistanceScale] = useState<Scale | undefined>(
    Scale.Medium
  );

  const [initialCameraAngle, setInitialCameraAngle] = useState<
    CameraVerticalAngle | undefined
  >(CameraVerticalAngle.Eye);
  const [initialShotSize, setInitialShotSize] = useState<ShotSize | undefined>(
    ShotSize.MediumShot
  );
  const [initialSubjectView, setInitialSubjectView] = useState<
    SubjectView | undefined
  >(SubjectView.Front);
  const [initialSubjectFraming, setInitialSubjectFraming] = useState<
    SubjectFraming | undefined
  >({
    position: SubjectInFramePosition.Center,
  });

  const [endCameraAngle, setEndCameraAngle] = useState<
    CameraVerticalAngle | undefined
  >();
  const [endShotSize, setEndShotSize] = useState<ShotSize | undefined>();
  const [endSubjectView, setEndSubjectView] = useState<
    SubjectView | undefined
  >();
  const [endSubjectFraming, setEndSubjectFraming] = useState<
    SubjectFraming | undefined
  >();

  const resetForm = () => {
    setFrameCount(DEFAULT_FRAME_COUNT);
    setMovementEasing(MovementEasing.Linear);
    setSelectedSubjectIndex(0);
    setVisibilityConstraint(true);
    setInitialCameraAngle(CameraVerticalAngle.Eye);
    setInitialShotSize(ShotSize.MediumShot);
    setInitialSubjectView(SubjectView.Front);
    setInitialSubjectFraming({ position: SubjectInFramePosition.Center });
    setEndCameraAngle(undefined);
    setEndShotSize(undefined);
    setEndSubjectView(undefined);
    setEndSubjectFraming(undefined);
    setDistanceType(undefined);
    setDistanceScale(Scale.Medium);
    setSubjectAwareInterpolation(false);
  };

  return {
    formState: {
      frameCount,
      movementEasing,
      selectedSubjectIndex,
      visibilityConstraint,
      subjectAwareInterpolation,
      distanceType,
      distanceScale,
      initialCameraAngle,
      initialShotSize,
      initialSubjectView,
      initialSubjectFraming,
      endCameraAngle,
      endShotSize,
      endSubjectView,
      endSubjectFraming,
    },
    setters: {
      setFrameCount,
      setMovementEasing,
      setSelectedSubjectIndex,
      setVisibilityConstraint,
      setSubjectAwareInterpolation,
      setDistanceType,
      setDistanceScale,
      setInitialCameraAngle,
      setInitialShotSize,
      setInitialSubjectView,
      setInitialSubjectFraming,
      setEndCameraAngle,
      setEndShotSize,
      setEndSubjectView,
      setEndSubjectFraming,
    },
    resetForm,
  };
};
