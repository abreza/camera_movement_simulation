import { useState } from "react";
import {
  SimulationInstruction,
  CameraVerticalAngle,
  ShotSize,
  SubjectView,
  MovementEasing,
  ConstraintsConfig,
  DynamicMode,
  InterpolationDynamic,
  Direction,
  SimpleMovement,
  MovementMode,
  Scale,
  InstructionDynamic,
} from "@/service/simulation/instruction/types";
import { defaultSimulationInstruction } from "@/service/simulation/instruction/constants";

export const useInstructionForm = () => {
  const [formState, setFormState] = useState<SimulationInstruction>({
    ...defaultSimulationInstruction,
  });

  const setFrameCount = (count: number) => {
    setFormState((prev) => ({
      ...prev,
      frameCount: count,
    }));
  };

  const setDynamicEasing = (easing: MovementEasing) => {
    setFormState((prev) => ({
      ...prev,
      dynamic: {
        ...prev.dynamic,
        easing,
      },
    }));
  };

  const setSubjectIndex = (index?: number) => {
    setFormState((prev) => ({
      ...prev,
      subjectIndex: index,
    }));
  };

  const setSubjectAwareInterpolation = (aware?: boolean) => {
    setFormState((prev) => {
      if (prev.dynamic.type !== DynamicMode.Interpolation) return prev;

      return {
        ...prev,
        dynamic: {
          ...prev.dynamic,
          subjectAwareInterpolation: aware,
        },
      };
    });
  };

  const setAllFramesVisibility = (value: boolean) => {
    setFormState((prev) => ({
      ...prev,
      constraints: {
        ...prev.constraints,
        allFramesVisibility: value,
      },
    }));
  };

  const setStaticDistance = (value?: boolean) => {
    setFormState((prev) => ({
      ...prev,
      constraints: {
        ...prev.constraints,
        staticDistance: value,
      },
    }));
  };

  const setStaticCameraSubjectRotation = (value?: boolean) => {
    setFormState((prev) => ({
      ...prev,
      constraints: {
        ...prev.constraints,
        staticCameraSubjectRotation: value,
      },
    }));
  };

  const setLockedPosition = (value: ConstraintsConfig["lockedMovement"]) => {
    setFormState((prev) => ({
      ...prev,
      constraints: {
        ...prev.constraints,
        lockedMovement: value,
      },
    }));
  };

  const setLockedRotation = (value: ConstraintsConfig["lockedRotation"]) => {
    setFormState((prev) => ({
      ...prev,
      constraints: {
        ...prev.constraints,
        lockedRotation: value,
      },
    }));
  };

  const setImportance = (value: number) => {
    setFormState((prev) => ({
      ...prev,
      constraints: {
        ...prev.constraints,
        importance: value,
      },
    }));
  };

  const setMaxAccelerate = (value?: number) => {
    setFormState((prev) => ({
      ...prev,
      constraints: {
        ...prev.constraints,
        maxAccelerate: value,
      },
    }));
  };

  const setMaxSpeed = (value?: number) => {
    setFormState((prev) => ({
      ...prev,
      constraints: {
        ...prev.constraints,
        maxSpeed: value,
      },
    }));
  };

  const setInitialCameraAngle = (value?: CameraVerticalAngle) => {
    setFormState((prev) => ({
      ...prev,
      initialSetup: {
        ...prev.initialSetup,
        cameraAngle: value,
      },
    }));
  };

  const setInitialShotSize = (value?: ShotSize) => {
    setFormState((prev) => ({
      ...prev,
      initialSetup: {
        ...prev.initialSetup,
        shotSize: value,
      },
    }));
  };

  const setInitialSubjectView = (value?: SubjectView) => {
    setFormState((prev) => ({
      ...prev,
      initialSetup: {
        ...prev.initialSetup,
        subjectView: value,
      },
    }));
  };

  const setInitialSubjectFraming = (framing: any) => {
    setFormState((prev) => ({
      ...prev,
      initialSetup: {
        ...prev.initialSetup,
        subjectFraming: framing,
      },
    }));
  };

  const setEndCameraAngle = (value?: CameraVerticalAngle) => {
    setFormState((prev) => {
      if (prev.dynamic.type !== DynamicMode.Interpolation) return prev;

      return {
        ...prev,
        dynamic: {
          ...prev.dynamic,
          endSetup: {
            ...prev.dynamic.endSetup,
            cameraAngle: value,
          },
        },
      };
    });
  };

  const setEndShotSize = (value?: ShotSize) => {
    setFormState((prev) => {
      if (prev.dynamic.type !== DynamicMode.Interpolation) return prev;

      return {
        ...prev,
        dynamic: {
          ...prev.dynamic,
          endSetup: {
            ...prev.dynamic.endSetup,
            shotSize: value,
          },
        },
      };
    });
  };

  const setEndSubjectView = (value?: SubjectView) => {
    setFormState((prev) => {
      if (prev.dynamic.type !== DynamicMode.Interpolation) return prev;

      return {
        ...prev,
        dynamic: {
          ...prev.dynamic,
          endSetup: {
            ...prev.dynamic.endSetup,
            subjectView: value,
          },
        },
      };
    });
  };

  const setEndSubjectFraming = (framing: any) => {
    setFormState((prev) => {
      if (prev.dynamic.type !== DynamicMode.Interpolation) return prev;

      return {
        ...prev,
        dynamic: {
          ...prev.dynamic,
          endSetup: {
            ...prev.dynamic.endSetup,
            subjectFraming: framing,
          },
        },
      };
    });
  };

  const setDynamic = (dynamic: InstructionDynamic) => {
    setFormState((prev) => ({
      ...prev,
      dynamic,
    }));
  };

  const setDynamicType = (type: DynamicMode) => {
    setFormState((prev) => {
      const dynamic =
        type === DynamicMode.Interpolation
          ? ({
              type,
              easing: prev.dynamic.easing,
            } as InterpolationDynamic)
          : ({
              type: DynamicMode.Simple,
              direction: Direction.Right,
              scale: Scale.Medium,
              movementMode: MovementMode.Transition,
            } as SimpleMovement);

      return {
        ...prev,
        dynamic,
      };
    });
  };

  const resetForm = (
    instruction: SimulationInstruction = defaultSimulationInstruction
  ) => {
    setFormState({ ...instruction });
  };

  return {
    formState,
    setters: {
      setFrameCount,

      setDynamicEasing,
      setSubjectIndex,
      setSubjectAwareInterpolation,
      setAllFramesVisibility,
      setStaticDistance,
      setStaticCameraSubjectRotation,
      setLockedPosition,
      setLockedRotation,
      setImportance,
      setMaxAccelerate,
      setMaxSpeed,
      setInitialCameraAngle,
      setInitialShotSize,
      setInitialSubjectView,
      setInitialSubjectFraming,
      setEndCameraAngle,
      setEndShotSize,
      setEndSubjectView,
      setEndSubjectFraming,
      setDynamic,
      setDynamicType,
    },
    resetForm,
  };
};
