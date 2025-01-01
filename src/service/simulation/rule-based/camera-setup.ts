import * as THREE from "three";
import {
  CinematographyInstruction,
  CameraParameters,
  SubjectFramePosition,
  SubjectFrameZone,
  SubjectFraming,
  Scale,
} from "../instruction/types";
import { Subject, SubjectDimensions, SubjectFrame } from "../../subjects/types";
import {
  getDesiredDistance,
  getDesiredVerticalAngle,
  getDesiredHorizontalAngle,
} from "../instruction/helpers/static";
import { DEFAULT_FOCAL_LENGTH, DEFAULT_ASPECT_RATIO } from "../constants";
import { SCALE_FACTORS } from "../instruction/constants";
import { getLookAtAngle } from "../utils";

const calculateSubjectBounds = (
  subjectDimensions: SubjectDimensions,
  subjectPosition: THREE.Vector3
): { min: THREE.Vector3; max: THREE.Vector3 } => {
  const halfWidth = subjectDimensions.width / 2;
  const halfHeight = subjectDimensions.height / 2;
  const halfDepth = subjectDimensions.depth / 2;

  return {
    min: new THREE.Vector3(
      subjectPosition.x - halfWidth,
      subjectPosition.y - halfHeight,
      subjectPosition.z - halfDepth
    ),
    max: new THREE.Vector3(
      subjectPosition.x + halfWidth,
      subjectPosition.y + halfHeight,
      subjectPosition.z + halfDepth
    ),
  };
};

const applyFraming = (
  cameraPosition: THREE.Vector3,
  distance: number,
  subject: Subject,
  frame: SubjectFrame,
  subjectFraming?: SubjectFraming
): { focalLength: number; rotation: THREE.Euler } => {
  const lookAt = frame.position.clone();
  const subjectPosition = frame.position;

  if (!subjectFraming) {
    const rotation = getLookAtAngle(cameraPosition, lookAt);
    return { focalLength: DEFAULT_FOCAL_LENGTH, rotation };
  }

  const {
    position = SubjectFramePosition.Center,
    zone = SubjectFrameZone.Inner,
    scale = Scale.Full,
  } = subjectFraming;
  const bounds = calculateSubjectBounds(subject.dimensions, subjectPosition);

  const subjectSize = new THREE.Vector3()
    .subVectors(bounds.max, bounds.min)
    .multiplyScalar(0.5);

  const maxDimension = Math.max(subjectSize.x, subjectSize.y);

  const scaleFactor = SCALE_FACTORS[scale];
  let focalLength = DEFAULT_FOCAL_LENGTH;
  if (scale === Scale.Full) {
    focalLength = (distance * 5) / (scaleFactor * maxDimension);
  }

  const rotation = getLookAtAngle(cameraPosition, lookAt);

  if (position !== SubjectFramePosition.Center) {
    const zoneMultiplier =
      (zone === SubjectFrameZone.Inner ? 0.5 : 1) * (2 - scaleFactor);

    const frameWidth = subjectSize.y * DEFAULT_ASPECT_RATIO;
    const frameHeight = subjectSize.y;

    let xOffset = 0;
    let yOffset = 0;

    switch (position) {
      case SubjectFramePosition.Left:
        xOffset = -frameWidth * zoneMultiplier;
        break;
      case SubjectFramePosition.Right:
        xOffset = frameWidth * zoneMultiplier;
        break;
      case SubjectFramePosition.Top:
        yOffset = frameHeight * zoneMultiplier;
        break;
      case SubjectFramePosition.Bottom:
        yOffset = -frameHeight * zoneMultiplier;
        break;
      case SubjectFramePosition.TopLeft:
        xOffset = -frameWidth * zoneMultiplier;
        yOffset = frameHeight * zoneMultiplier;
        break;
      case SubjectFramePosition.TopRight:
        xOffset = frameWidth * zoneMultiplier;
        yOffset = frameHeight * zoneMultiplier;
        break;
      case SubjectFramePosition.BottomLeft:
        xOffset = -frameWidth * zoneMultiplier;
        yOffset = -frameHeight * zoneMultiplier;
        break;
      case SubjectFramePosition.BottomRight:
        xOffset = frameWidth * zoneMultiplier;
        yOffset = -frameHeight * zoneMultiplier;
        break;
    }

    const offsetVector = new THREE.Vector3(xOffset, yOffset, 0);

    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeRotationFromEuler(rotation);
    offsetVector.applyMatrix4(rotationMatrix);

    lookAt.sub(offsetVector);

    rotation.copy(getLookAtAngle(cameraPosition, lookAt));
  }

  return { focalLength, rotation };
};

export const getCameraBySetup = (
  setup: CinematographyInstruction["initialSetup"],
  subject: Subject,
  frame: SubjectFrame
): CameraParameters => {
  const subjectPosition = frame.position;

  let distance = setup?.shotSize
    ? getDesiredDistance(setup.shotSize, subject.dimensions)
    : 10;

  const verticalAngle = setup?.cameraAngle
    ? getDesiredVerticalAngle(setup.cameraAngle)
    : Math.PI / 2;

  const horizontalAngle = setup?.subjectView
    ? getDesiredHorizontalAngle(setup.subjectView)
    : 0;

  const heightOffset = distance * Math.cos(verticalAngle);
  const radius = distance * Math.sin(verticalAngle);

  const x = subjectPosition.x + radius * Math.sin(horizontalAngle);
  const y = subjectPosition.y + heightOffset;
  const z = subjectPosition.z + radius * Math.cos(horizontalAngle);

  const position = new THREE.Vector3(x, y, z);

  const { focalLength, rotation } = applyFraming(
    position,
    distance,
    subject,
    frame,
    setup?.subjectFraming
  );

  return {
    position,
    rotation,
    focalLength,
    aspectRatio: DEFAULT_ASPECT_RATIO,
  };
};
