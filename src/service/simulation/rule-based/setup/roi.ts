import * as THREE from "three";
import { SetupConfig, ShotSize } from "../../instruction/types";
import {
  Subject,
  SubjectFrame,
  SubjectDimensions,
} from "../../../subjects/types";

export type RegionOfInterest = {
  dimensions: SubjectDimensions;
  position: THREE.Vector3;
};

type ROIResult = {
  reginOfInterest: RegionOfInterest;
  scale: number;
};

const interpolateDimensions = (
  start: SubjectDimensions,
  end: SubjectDimensions,
  t: number
): SubjectDimensions => {
  if (t < 0) {
    t = Math.abs(t);
    return {
      width: start.width * t,
      height: start.height * t,
      depth: start.depth * t,
    };
  }
  return {
    width: start.width + (end.width - start.width) * t,
    height: start.height + (end.height - start.height) * t,
    depth: start.depth + (end.depth - start.depth) * t,
  };
};

const interpolateVector3 = (
  start: THREE.Vector3,
  end: THREE.Vector3,
  t: number
): THREE.Vector3 => {
  if (t <= 0) {
    return start;
  }
  return new THREE.Vector3().lerpVectors(start, end, t);
};

const getInterpolationFactor = (shotSize: ShotSize): number => {
  const shotSizeMap: { [key in ShotSize]: number } = {
    [ShotSize.ExtremeCloseUp]: -0.5,
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
    [ShotSize.ExtremeCloseUp]: 1,
    [ShotSize.CloseUp]: 1,
    [ShotSize.MediumCloseUp]: 1,
    [ShotSize.MediumShot]: 1,
    [ShotSize.FullShot]: 1,
    [ShotSize.LongShot]: 1.5,
    [ShotSize.VeryLongShot]: 2,
    [ShotSize.ExtremeLongShot]: 3,
  };
  return scaleMap[shotSize];
};

const getDefaultAttentionBox = (
  subjectBox: RegionOfInterest
): RegionOfInterest => {
  return {
    dimensions: {
      width: subjectBox.dimensions.width,
      height: subjectBox.dimensions.height * 0.5,
      depth: subjectBox.dimensions.depth,
    },
    position: new THREE.Vector3(
      subjectBox.position.x,
      subjectBox.position.y + subjectBox.dimensions.height * 0.25,
      subjectBox.position.z
    ),
  };
};

export const calculateReginOfInterest = (
  setup: SetupConfig,
  subject: Subject,
  frame: SubjectFrame
): ROIResult => {
  const shotSize = setup.shotSize || ShotSize.MediumShot;
  const scale = getShotScale(shotSize);

  const subjectBox: RegionOfInterest = {
    dimensions: subject.dimensions,
    position: frame.position,
  };

  const attentionBox: RegionOfInterest =
    subject.attentionBox || getDefaultAttentionBox(subjectBox);

  const t = getInterpolationFactor(shotSize);

  return {
    reginOfInterest: {
      dimensions: interpolateDimensions(
        attentionBox.dimensions,
        subjectBox.dimensions,
        t
      ),
      position: interpolateVector3(
        attentionBox.position,
        subjectBox.position,
        t
      ),
    },
    scale,
  };
};
