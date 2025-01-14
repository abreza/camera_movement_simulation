import * as THREE from "three";
import { SetupConfig, ShotSize } from "../../instruction/types";
import {
  Subject,
  SubjectFrame,
  SubjectDimensions,
} from "../../../subjects/types";

export type ReginOfInterest = {
  dimensions: SubjectDimensions;
  position: THREE.Vector3;
};

type ROIResult = {
  reginOfInterest: ReginOfInterest;
  scale: number;
};

const getInterpolationFactor = (shotSize: ShotSize): number => {
  const shotSizeMap: { [key in ShotSize]: number } = {
    [ShotSize.ExtremeCloseUp]: 0,
    [ShotSize.CloseUp]: 0,
    [ShotSize.MediumCloseUp]: 0.25,
    [ShotSize.MediumShot]: 0.5,
    [ShotSize.FullShot]: 1,
    [ShotSize.LongShot]: 1,
    [ShotSize.VeryLongShot]: 1,
    [ShotSize.ExtremeLongShot]: 1,
  };
  return shotSizeMap[shotSize];
};

const getShotScale = (shotSize: ShotSize): number => {
  const scaleMap: { [key in ShotSize]: number } = {
    [ShotSize.ExtremeCloseUp]: 2,
    [ShotSize.CloseUp]: 1,
    [ShotSize.MediumCloseUp]: 1,
    [ShotSize.MediumShot]: 1,
    [ShotSize.FullShot]: 1,
    [ShotSize.LongShot]: 0.75,
    [ShotSize.VeryLongShot]: 0.5,
    [ShotSize.ExtremeLongShot]: 0.3,
  };
  return scaleMap[shotSize];
};

const getDefaultAttentionBox = (
  subjectBox: ReginOfInterest
): ReginOfInterest => {
  return {
    dimensions: {
      width: subjectBox.dimensions.width * 0.5,
      height: subjectBox.dimensions.height * 0.5,
      depth: subjectBox.dimensions.depth * 0.5,
    },
    position: new THREE.Vector3(
      subjectBox.position.x + subjectBox.dimensions.width * 0.25,
      subjectBox.position.y + subjectBox.dimensions.height * 0.25,
      subjectBox.position.z + subjectBox.dimensions.depth * 0.25
    ),
  };
};

export const calculateReginOfInterest = (
  shotSize: ShotSize = ShotSize.MediumShot,
  subject: Subject,
  frame: SubjectFrame
): ROIResult => {
  const scale = getShotScale(shotSize);

  const subjectBox: ReginOfInterest = {
    dimensions: subject.dimensions,
    position: frame.position,
  };

  const attentionBox: ReginOfInterest =
    subject.attentionBox || getDefaultAttentionBox(subjectBox);

  const t = getInterpolationFactor(shotSize);

  return {
    reginOfInterest: {
      dimensions: {
        width:
          t * subjectBox.dimensions.width +
          (1 - t) * attentionBox.dimensions.width,
        height:
          t * subjectBox.dimensions.height +
          (1 - t) * attentionBox.dimensions.height,
        depth:
          t * subjectBox.dimensions.depth +
          (1 - t) * attentionBox.dimensions.depth,
      },
      position: new THREE.Vector3().lerpVectors(
        attentionBox.position,
        subjectBox.position,
        t
      ),
    },
    scale,
  };
};
