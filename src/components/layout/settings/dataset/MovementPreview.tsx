import React, { useMemo, forwardRef, useState, useEffect, useId } from "react";
import { generateFrames, isHumanMovement, isMovementSupportedForSubject } from "@/service/subjects/movements";
import { ObjectClass, Subject } from "@/service/subjects/types";
import { movementDisplayNames } from "./movementOptions";
import { createSeededRandom, withRandomSource } from "@/utils/randomUtils";

interface MovementPreviewProps {
  movementType: string;
  subjectClass?: ObjectClass;
  framesPerSecond?: number;
  width?: number;
  height?: number;
  noiseConfig?: {
    positionAmplitude?: number;
    rotationAmplitude?: number;
    frequency?: number;
  };
}

export const MovementPreview = forwardRef<HTMLDivElement, MovementPreviewProps>(
  ({ movementType, subjectClass, framesPerSecond = 30, width = 160, height = 160, noiseConfig }, ref) => {
    const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
    const gridId = useId();
    const previewClass = subjectClass && isMovementSupportedForSubject(movementType, subjectClass)
      ? subjectClass
      : isHumanMovement(movementType) || movementType === "static" ? ObjectClass.Human : ObjectClass.Car;
    const frameRate = Number.isFinite(framesPerSecond) && framesPerSecond >= 10 && framesPerSecond <= 120
      ? framesPerSecond : 30;
    const durationSeconds = 4;
    const hasNoise = !!noiseConfig;
    const { positionAmplitude, rotationAmplitude, frequency } = noiseConfig ?? {};

    const previewSubject: Subject = useMemo(
      () => ({
        id: "preview-subject",
        class: previewClass,
        dimensions: previewClass === ObjectClass.Human
          ? { width: 0.5, height: 1.75, depth: 0.3 }
          : previewClass === ObjectClass.Car
            ? { width: 1.8, height: 1.5, depth: 4.2 }
            : previewClass === ObjectClass.Bicycle
              ? { width: 0.6, height: 1.1, depth: 1.8 }
              : { width: 0.5, height: 1, depth: 0.5 },
      }),
      [previewClass]
    );

    const frames = useMemo(() => {
      const movements = {
        [previewSubject.id]: movementType,
      };

      const framesArray = withRandomSource(createSeededRandom("subject-motion-preview"), () => generateFrames([previewSubject], movements, {
        applyNoise: hasNoise,
        positionAmplitude,
        rotationAmplitude,
        frequency,
        randomize: true,
        randomSettings: { seed: 42 },
        durationSeconds,
        frameCount: Math.round(durationSeconds * frameRate) + 1,
      }));

      return framesArray[0] || [];
    }, [movementType, previewSubject, hasNoise, positionAmplitude, rotationAmplitude, frequency, frameRate]);

    const travelDistance = useMemo(() => frames.reduce((distance, frame, index) =>
      distance + (index === 0 ? 0 : frame.position.distanceTo(frames[index - 1].position)), 0
    ), [frames]);

    const { svgPath, points, rotations } = useMemo(() => {
      if (frames.length === 0)
        return { svgPath: "", points: [], rotations: [] };

      const coordinates = frames.map((frame) => ({
        x: frame.position.x,
        z: frame.position.z,
      }));

      const rotations = frames.map((frame) => frame.rotation.y);

      const minX = Math.min(...coordinates.map((c) => c.x));
      const maxX = Math.max(...coordinates.map((c) => c.x));
      const minZ = Math.min(...coordinates.map((c) => c.z));
      const maxZ = Math.max(...coordinates.map((c) => c.z));

      const rangeX = Math.max(maxX - minX, 2);
      const rangeZ = Math.max(maxZ - minZ, 2);

      const centerX = (minX + maxX) / 2;
      const centerZ = (minZ + maxZ) / 2;

      const padding = 20;
      const scaleX = (width - padding * 2) / rangeX;
      const scaleZ = (height - padding * 2) / rangeZ;
      const scale = Math.min(scaleX, scaleZ);

      const transformedPoints = coordinates.map((coord) => ({
        x: width / 2 + (coord.x - centerX) * scale,
        y: height / 2 + (coord.z - centerZ) * scale * -1,
      }));

      const pathCommands = transformedPoints.map(
        (point, index) => `${index === 0 ? "M" : "L"} ${point.x},${point.y}`
      );

      return {
        svgPath: pathCommands.join(" "),
        points: transformedPoints,
        rotations,
      };
    }, [frames, width, height]);

    const frameIndex = points.length > 0 ? currentFrameIndex % points.length : 0;

    const trailPoints = useMemo(() => {
      if (points.length === 0) return [];

      const trailLength = Math.min(5, Math.floor(points.length / 8));
      return [...Array(trailLength)].map((_, i) => {
        const idx =
          (frameIndex - (i + 1) + points.length) % points.length;
        return {
          x: points[idx].x,
          y: points[idx].y,
          opacity: 1 - i / trailLength,
        };
      });
    }, [points, frameIndex]);

    useEffect(() => {
      if (points.length === 0) return;

      const intervalId = setInterval(() => {
        setCurrentFrameIndex((prevIndex) =>
          prevIndex >= points.length - 1 ? 0 : prevIndex + 1
        );
      }, 1000 / frameRate);

      return () => clearInterval(intervalId);
    }, [points, frameRate]);

    return (
      <div ref={ref}>
        <svg
          role="img"
          aria-label={`${movementDisplayNames[movementType] ?? movementType}: ${previewClass} movement seen from above`}
          width={width}
          height={height}
          style={{ backgroundColor: "#f9f9f9", borderRadius: "4px" }}
        >
          <defs>
            <pattern
              id={gridId}
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="#eaeaea"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect
            width={width}
            height={height}
            fill={`url(#${gridId})`}
          />

          <line
            x1={0}
            y1={height / 2}
            x2={width}
            y2={height / 2}
            stroke="#e0e0e0"
            strokeWidth="1"
          />
          <line
            x1={width / 2}
            y1={0}
            x2={width / 2}
            y2={height}
            stroke="#e0e0e0"
            strokeWidth="1"
          />

          <path
            d={svgPath}
            fill="none"
            stroke="#2196f3"
            strokeWidth={1.5}
            strokeOpacity={0.3}
          />

          {points.length > 0 && (
            <>
              {trailPoints.map((point, i) => (
                <circle
                  key={`trail-${i}`}
                  cx={point.x}
                  cy={point.y}
                  r={2}
                  fill="#4caf50"
                  opacity={point.opacity}
                />
              ))}

              <g
                transform={`translate(${points[frameIndex].x}, ${points[frameIndex].y})`}
              >
                <circle r={3} fill="#4caf50" />

                <g
                  transform={`rotate(${
                    (rotations[frameIndex] * 180) / Math.PI + 180
                  })`}
                >
                  {previewClass === ObjectClass.Human && (
                    <ellipse cx="0" cy="0" rx="5" ry="2" fill="#4caf50" />
                  )}
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="-6"
                    stroke="#4caf50"
                    strokeWidth="1.5"
                  />
                  <polygon points="0,-8 -2,-4 2,-4" fill="#4caf50" />
                </g>
              </g>
            </>
          )}
        </svg>
        <div style={{ fontSize: 11, textAlign: "center", marginTop: 4 }}>
          {previewClass.charAt(0).toUpperCase() + previewClass.slice(1)} · {durationSeconds} s · {frameRate} fps
          <br />
          {travelDistance.toFixed(1)} m travelled · arrow shows facing
        </div>
      </div>
    );
  }
);

MovementPreview.displayName = "MovementPreview";
