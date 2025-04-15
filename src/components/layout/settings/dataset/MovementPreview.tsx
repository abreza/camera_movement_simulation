import React, { useMemo, forwardRef, useState, useEffect } from "react";
import {
  movementGenerators,
  addMovementNoise,
} from "@/service/subjects/generateFrames";
import { ObjectClass, Subject } from "@/service/subjects/types";

interface MovementPreviewProps {
  movementType: string;
  width?: number;
  height?: number;
  noiseConfig?: {
    positionAmplitude?: number;
    rotationAmplitude?: number;
    frequency?: number;
  };
}

export const MovementPreview = forwardRef<HTMLDivElement, MovementPreviewProps>(
  ({ movementType, width = 120, height = 120, noiseConfig }, ref) => {
    const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

    const dummySubject: Subject = useMemo(
      () => ({
        id: "preview-subject",
        class: ObjectClass.Chair,
        dimensions: {
          width: 0.5,
          height: 1,
          depth: 0.5,
        },
      }),
      []
    );

    const frames = useMemo(() => {
      const generator = movementGenerators[movementType];
      if (!generator) return [];

      const baseFrames = generator(dummySubject, 0, 1);

      // Apply noise if noiseConfig is provided
      if (noiseConfig) {
        return addMovementNoise(baseFrames, noiseConfig);
      }

      return baseFrames;
    }, [movementType, dummySubject, noiseConfig]);

    const { svgPath, points, rotations } = useMemo(() => {
      if (frames.length === 0)
        return { svgPath: "", points: [], rotations: [] };

      const coordinates = frames.map((frame) => ({
        x: frame.position.x,
        z: frame.position.z,
      }));

      // Extract rotations
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

    // Calculate trail points
    const trailPoints = useMemo(() => {
      if (points.length === 0) return [];

      const trailLength = Math.min(5, Math.floor(points.length / 8));
      return [...Array(trailLength)].map((_, i) => {
        const idx =
          (currentFrameIndex - (i + 1) + points.length) % points.length;
        return {
          x: points[idx].x,
          y: points[idx].y,
          opacity: 1 - i / trailLength,
        };
      });
    }, [points, currentFrameIndex]);

    // Animation effect
    useEffect(() => {
      if (points.length === 0) return;

      const intervalId = setInterval(() => {
        setCurrentFrameIndex((prevIndex) =>
          prevIndex >= points.length - 1 ? 0 : prevIndex + 1
        );
      }, 50); // Update every 50ms for smooth animation

      return () => clearInterval(intervalId);
    }, [points]);

    return (
      <div ref={ref}>
        <svg
          width={width}
          height={height}
          style={{ backgroundColor: "#f9f9f9", borderRadius: "4px" }}
        >
          <defs>
            <pattern
              id={`grid-${movementType}`}
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
            fill={`url(#grid-${movementType})`}
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
                transform={`translate(${points[currentFrameIndex].x}, ${points[currentFrameIndex].y})`}
              >
                <circle r={3} fill="#4caf50" />

                <g
                  transform={`rotate(${
                    (rotations[currentFrameIndex] * 180) / Math.PI + 90
                  })`}
                >
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
      </div>
    );
  }
);

MovementPreview.displayName = "MovementPreview";
