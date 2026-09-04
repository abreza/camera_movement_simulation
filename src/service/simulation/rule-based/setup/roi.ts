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
  rotation: THREE.Euler;
};

type ROIResult = {
  regionOfInterest: RegionOfInterest;
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
  subjectBox: RegionOfInterest
): RegionOfInterest => {
  return {
    dimensions: {
      width: subjectBox.dimensions.width * 0.5,
      height: subjectBox.dimensions.height * 0.5,
      depth: subjectBox.dimensions.depth * 0.5,
    },
    // The attention region is the upper half of the object, centred laterally
    // and in depth.  Offsetting x/z here biased every close shot diagonally.
    position: new THREE.Vector3(0, subjectBox.dimensions.height * 0.25, 0),
    rotation: subjectBox.rotation.clone(),
  };
};

export const calculateRegionOfInterest = (
  shotSize: ShotSize = ShotSize.MediumShot,
  subject: Subject,
  frame: SubjectFrame
): ROIResult => {
  const scale = getShotScale(shotSize);

  const subjectBox: RegionOfInterest = {
    dimensions: subject.dimensions,
    position: frame.position,
    rotation: frame.rotation,
  };

  const localAttentionBox = subject.attentionBox ||
    getDefaultAttentionBox(subjectBox);
  const attentionPosition = localAttentionBox.position
    .clone()
    .applyQuaternion(new THREE.Quaternion().setFromEuler(frame.rotation))
    .add(frame.position);

  const t = getInterpolationFactor(shotSize);

  return {
    regionOfInterest: {
      dimensions: {
        width:
          t * subjectBox.dimensions.width +
          (1 - t) * localAttentionBox.dimensions.width,
        height:
          t * subjectBox.dimensions.height +
          (1 - t) * localAttentionBox.dimensions.height,
        depth:
          t * subjectBox.dimensions.depth +
          (1 - t) * localAttentionBox.dimensions.depth,
      },
      position: new THREE.Vector3().lerpVectors(
        attentionPosition,
        subjectBox.position,
        t
      ),
      rotation: frame.rotation.clone(),
    },
    scale,
  };
};
