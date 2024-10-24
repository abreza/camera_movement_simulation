import React, { FC, useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Button } from '@mui/material';

interface Curve {
  id: number;
  points: { x: number; y: number }[];
}

interface CurveEditorProps {
  curve: Curve;
  onUpdate: (updatedCurve: Curve) => void;
  onClose: () => void;
}

const CurveEditor: FC<CurveEditorProps> = ({ curve, onUpdate, onClose }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([...curve.points]);

  // Define dimensions and margins
  const width = 400;
  const height = 300;
  const margin = { top: 20, right: 20, bottom: 30, left: 40 };

  // Define scales at the component level
  const xScale = d3.scaleLinear()
    .domain([-10, 10])
    .range([margin.left, width - margin.right]);

  const yScale = d3.scaleLinear()
    .domain([-10, 10])
    .range([height - margin.bottom, margin.top]);

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale);

  // Update points when curve changes
  useEffect(() => {
    setPoints([...curve.points]);
  }, [curve]);

  // Initialize SVG only once
  useEffect(() => {
    if (!mountRef.current) return;

    svgRef.current = d3.select(mountRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background', '#fff')
      .style('border', '1px solid #ccc') as d3.Selection<SVGSVGElement, unknown, null, undefined>;

    const svg = svgRef.current;

    // Append x-axis
    const xAxisGroup = svg.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(xAxis);

    // Append y-axis
    const yAxisGroup = svg.append('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(${margin.left},0)`)
      .call(yAxis);

    const content = svg.append('g').attr('class', 'content');

    // Implement zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10])
      .on('zoom', (event) => {
        content.attr('transform', event.transform);

        // Update axes with transformed scales
        xAxisGroup.call(xAxis.scale(event.transform.rescaleX(xScale)));
        yAxisGroup.call(yAxis.scale(event.transform.rescaleY(yScale)));
      });

    // Apply zoom behavior to the SVG element
    svg.call(zoom);

    return () => {
      svg.remove(); // Cleanup on unmount
    };
  }, []); 

  // Helper function to find the distance between a point and a line segment
  const distanceToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  };

// Update visualization when points change
// Inside the useEffect where you handle the D3 visualization
useEffect(() => {
  const svg = svgRef.current;
  if (!svg) return;

  const content = svg.select('.content');

  // Clear existing content without removing axes
  content.selectAll('*').remove();

  // Draw line without applying the transform
  const lineGenerator = d3.line<{ x: number; y: number }>()
    .x(d => xScale(d.x))
    .y(d => yScale(d.y))
    .curve(d3.curveCardinal);

  content.append('path')
    .datum(points)
    .attr('fill', 'none')
    .attr('stroke', '#ff0000')
    .attr('stroke-width', 2)
    .attr('d', lineGenerator);

  // Draw points
  const pointSelection = content.selectAll('circle')
    .data(points)
    .enter()
    .append('circle')
    .attr('cx', d => xScale(d.x))
    .attr('cy', d => yScale(d.y))
    .attr('r', 5)
    .attr('fill', '#0000ff')
    .attr('cursor', 'pointer')
    .call(
      d3.drag<SVGCircleElement, { x: number; y: number }>()
        .on('start', function (event) {
          event.sourceEvent.stopPropagation(); // Prevent zoom/pan during drag
        })
        .on('drag', function (event, d) {
          const [xScreen, yScreen] = d3.pointer(event, svg.node() as SVGSVGElement);

          // Get the current transform of the content group
          const contentTransform = d3.zoomTransform(content.node() as SVGGElement);

          // Invert the transform to get the content coordinates
          const xContent = contentTransform.invertX(xScreen);
          const yContent = contentTransform.invertY(yScreen);

          // Invert the scales to get data coordinates
          const x = xScale.invert(xContent);
          const y = yScale.invert(yContent);

          // Update the circle's position
          d3.select(this)
            .attr('cx', xScale(x))
            .attr('cy', yScale(y));

          // Update the point data
          const updatedPoints = points.map(p => (p === d ? { x, y } : p));

          // Update the path
          content.select('path')
            .attr('d', lineGenerator(updatedPoints));

          // Store updatedPoints for use in 'end' event
          d3.select(this).property('updatedPoints', updatedPoints);
        })
        .on('end', function () {
          const updatedPoints = d3.select(this).property('updatedPoints');
          if (updatedPoints) {
            setPoints(updatedPoints);
            onUpdate({ ...curve, points: updatedPoints });
          }
        })
    )
    .on('contextmenu', function (event, d) {
      event.preventDefault();
      const newPoints = points.filter(p => p !== d);
      setPoints(newPoints);
      onUpdate({ ...curve, points: newPoints });
    });

  // Handle click to add new point
  svg.on('click', function (event) {
    // Ignore click if it is on a circle
    if (event.target.tagName === 'circle') return;

    const [xScreen, yScreen] = d3.pointer(event, svg.node() as SVGSVGElement);

    // Get the current transform of the content group
    const contentTransform = d3.zoomTransform(content.node() as SVGGElement);

    // Invert the transform to get the content coordinates
    const xContent = contentTransform.invertX(xScreen);
    const yContent = contentTransform.invertY(yScreen);

    // Invert the scales to get data coordinates
    const x = xScale.invert(xContent);
    const y = yScale.invert(yContent);

    const threshold = 10; // Define a threshold distance in pixels

    // Find the closest line segment
    let closestSegmentIndex = -1;
    let minDistance = Infinity;

    for (let i = 0; i < points.length - 1; i++) {
      const x1Screen = contentTransform.applyX(xScale(points[i].x));
      const y1Screen = contentTransform.applyY(yScale(points[i].y));
      const x2Screen = contentTransform.applyX(xScale(points[i + 1].x));
      const y2Screen = contentTransform.applyY(yScale(points[i + 1].y));

      const distance = distanceToSegment(xScreen, yScreen, x1Screen, y1Screen, x2Screen, y2Screen);

      if (distance < minDistance && distance <= threshold) {
        minDistance = distance;
        closestSegmentIndex = i;
      }
    }

    let newPoints;
    if (closestSegmentIndex !== -1) {
      // Insert the new point between the closest points
      newPoints = [
        ...points.slice(0, closestSegmentIndex + 1),
        { x, y },
        ...points.slice(closestSegmentIndex + 1),
      ];
    } else {
      // Add the new point as the last point
      newPoints = [...points, { x, y }];
    }

    setPoints(newPoints);
    onUpdate({ ...curve, points: newPoints });
    });

  // Cleanup function to remove event listeners
  return () => {
    svg.on('click', null);
    pointSelection.on('contextmenu', null);
    pointSelection.on('.drag', null); // Remove all drag event listeners
  };
}, [points, onUpdate, curve]);


  return (
    <>
      <Button variant="contained" color="secondary" onClick={onClose}>
        Close Editor
      </Button>
      <div ref={mountRef} />
    </>
  );
};

export default CurveEditor;
