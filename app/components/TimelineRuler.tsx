'use client';

import { useEffect, useRef } from 'react';
import { theme } from '../theme';
import { TimeSelection } from './types';

interface TimelineRulerProps {
  canvasWidth: number;
  pixelsPerSecond: number;
  height?: number;
  leftPadding?: number;
  timeSelection?: TimeSelection | null;
}

export default function TimelineRuler({
  canvasWidth,
  pixelsPerSecond,
  height = 30,
  leftPadding = 0,
  timeSelection = null,
}: TimelineRulerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvasWidth;
    canvas.height = height;

    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
    canvas.width *= dpr;
    canvas.height *= dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    render(ctx);
  }, [canvasWidth, pixelsPerSecond, height, leftPadding, timeSelection]);

  const render = (ctx: CanvasRenderingContext2D) => {
    const dpr = window.devicePixelRatio || 1;
    const canvas = ctx.canvas;

    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    // Background
    ctx.fillStyle = theme.trackHeaderPanel;
    ctx.fillRect(0, 0, canvasWidth, height);

    // Draw time selection
    if (timeSelection) {
      const startX = leftPadding + timeSelection.startTime * pixelsPerSecond;
      const endX = leftPadding + timeSelection.endTime * pixelsPerSecond;
      const width = endX - startX;

      // Convert hex #BFEEFF to rgba with transparency
      ctx.fillStyle = 'rgba(191, 238, 255, 0.5)';
      ctx.fillRect(startX, 0, width, height);
    }

    // Draw tick marks and labels
    const totalSeconds = canvasWidth / pixelsPerSecond;

    // Determine tick interval based on zoom level
    let majorInterval = 1; // seconds
    let minorInterval = 0.1; // seconds

    if (pixelsPerSecond < 50) {
      majorInterval = 5;
      minorInterval = 1;
    } else if (pixelsPerSecond < 100) {
      majorInterval = 2;
      minorInterval = 0.5;
    }

    // Draw minor ticks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    for (let t = 0; t <= totalSeconds; t += minorInterval) {
      const x = leftPadding + t * pixelsPerSecond;
      ctx.beginPath();
      ctx.moveTo(x, height - 5);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw major ticks and labels
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.fillStyle = theme.text;
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let t = 0; t <= totalSeconds; t += majorInterval) {
      const x = leftPadding + t * pixelsPerSecond;

      // Major tick
      ctx.beginPath();
      ctx.moveTo(x, height - 10);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Label
      const minutes = Math.floor(t / 60);
      const seconds = t % 60;
      const label = minutes > 0
        ? `${minutes}:${seconds.toString().padStart(2, '0')}`
        : `${seconds}`;

      ctx.fillText(label, x, height / 2);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="block"
      style={{ backgroundColor: theme.trackHeaderPanel }}
    />
  );
}
