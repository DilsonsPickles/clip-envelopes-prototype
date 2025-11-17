'use client';

import { useEffect, useRef } from 'react';
import { Track, Clip, EnvelopePoint, TimeSelection } from './types';
import { theme } from '../theme';

interface TrackCanvasProps {
  tracks: Track[];
  envelopeMode: boolean;
  trackHeight: number;
  pixelsPerSecond: number;
  canvasWidth: number;
  selectedTrackIndices: number[];
  timeSelection: TimeSelection | null;
  hoveredClipHeader: { clipId: number; trackIndex: number } | null;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}

const CLIP_HEADER_HEIGHT = 20;
const LEFT_PADDING = 12;

export default function TrackCanvas({
  tracks,
  envelopeMode,
  trackHeight,
  pixelsPerSecond,
  canvasWidth,
  selectedTrackIndices,
  timeSelection,
  hoveredClipHeader,
  onMouseDown,
  onMouseMove,
  onMouseUp,
}: TrackCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || tracks.length === 0) return;

    canvas.width = canvasWidth;
    canvas.height = tracks.length * trackHeight + Math.max(0, tracks.length - 1) * 2; // Add 2px gap between tracks

    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
    canvas.width *= dpr;
    canvas.height *= dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    render(ctx);
  }, [tracks, envelopeMode, trackHeight, pixelsPerSecond, canvasWidth, selectedTrackIndices, timeSelection, hoveredClipHeader]);

  const render = (ctx: CanvasRenderingContext2D) => {
    const dpr = window.devicePixelRatio || 1;
    const canvas = ctx.canvas;

    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    const TRACK_GAP = 2;

    tracks.forEach((track, trackIndex) => {
      const y = trackIndex * (trackHeight + TRACK_GAP);
      const isSelected = selectedTrackIndices.includes(trackIndex);

      // Draw track background
      // Canvas background: #212433
      // Idle tracks: 5% white overlay on top of canvas
      // Selected tracks: 10% white overlay on top of canvas
      if (isSelected) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, y, canvasWidth, trackHeight);
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(0, y, canvasWidth, trackHeight);
      }

      // Draw clips
      track.clips.forEach((clip) => {
        drawClip(ctx, clip, trackIndex);
      });

      // Draw time selection only on selected tracks
      if (timeSelection && isSelected) {
        const startX = LEFT_PADDING + timeSelection.startTime * pixelsPerSecond;
        const endX = LEFT_PADDING + timeSelection.endTime * pixelsPerSecond;
        const width = endX - startX;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(startX, y, width, trackHeight);
      }
    });
  };

  const drawClip = (ctx: CanvasRenderingContext2D, clip: Clip, trackIndex: number) => {
    const TRACK_GAP = 2;
    const x = LEFT_PADDING + clip.startTime * pixelsPerSecond;
    const y = trackIndex * (trackHeight + TRACK_GAP);
    const width = clip.duration * pixelsPerSecond;
    const height = trackHeight;
    const radius = 4;

    // Clip background with rounded top corners
    // Different colors per track (with selection state)
    let clipBgColor = clip.selected ? theme.clipBackgroundSelected.default : theme.clipBackground.default;
    if (trackIndex === 0) {
      clipBgColor = clip.selected ? theme.clipBackgroundSelected.track1 : theme.clipBackground.track1;
    } else if (trackIndex === 1) {
      clipBgColor = clip.selected ? theme.clipBackgroundSelected.track2 : theme.clipBackground.track2;
    } else if (trackIndex === 2) {
      clipBgColor = clip.selected ? theme.clipBackgroundSelected.track3 : theme.clipBackground.track3;
    }
    ctx.fillStyle = envelopeMode ? '#3a4a5a' : clipBgColor;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();

    // White inset border when selected (draw first, 1px inside the black border)
    if (clip.selected) {
      const insetAmount = 1;
      const innerRadius = Math.max(0, radius - 1);
      ctx.strokeStyle = theme.clipBorderSelected;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + radius, y + insetAmount);
      ctx.lineTo(x + width - radius, y + insetAmount);
      ctx.quadraticCurveTo(x + width - insetAmount, y + insetAmount, x + width - insetAmount, y + innerRadius + 1);
      ctx.lineTo(x + width - insetAmount, y + height - insetAmount);
      ctx.lineTo(x + insetAmount, y + height - insetAmount);
      ctx.lineTo(x + insetAmount, y + innerRadius + 1);
      ctx.quadraticCurveTo(x + insetAmount, y + insetAmount, x + radius, y + insetAmount);
      ctx.closePath();
      ctx.stroke();
    }

    // Clip border with rounded top corners (black, drawn on top)
    ctx.strokeStyle = theme.clipBorder.normal;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.stroke();

    // Draw clip header with name
    // Clip header color per track (with hover state and selection state)
    const isHovered = hoveredClipHeader?.clipId === clip.id && hoveredClipHeader?.trackIndex === trackIndex;

    let headerColor = '#2a3a4a'; // default
    if (clip.selected) {
      // Selected state
      if (trackIndex === 0) {
        headerColor = isHovered ? theme.clipHeaderSelectedHover.track1 : theme.clipHeaderSelected.track1;
      } else if (trackIndex === 1) {
        headerColor = isHovered ? theme.clipHeaderSelectedHover.track2 : theme.clipHeaderSelected.track2;
      } else if (trackIndex === 2) {
        headerColor = isHovered ? theme.clipHeaderSelectedHover.track3 : theme.clipHeaderSelected.track3;
      } else {
        headerColor = isHovered ? theme.clipHeaderSelectedHover.default : theme.clipHeaderSelected.default;
      }
    } else {
      // Normal state
      if (trackIndex === 0) {
        headerColor = isHovered ? theme.clipHeaderHover.track1 : theme.clipHeader.track1;
      } else if (trackIndex === 1) {
        headerColor = isHovered ? theme.clipHeaderHover.track2 : theme.clipHeader.track2;
      } else if (trackIndex === 2) {
        headerColor = isHovered ? theme.clipHeaderHover.track3 : theme.clipHeader.track3;
      } else {
        headerColor = isHovered ? theme.clipHeaderHover.default : theme.clipHeader.default;
      }
    }

    // Draw header background with proper shape to avoid overlapping stroke
    const strokeWidth = 1;
    const inset = strokeWidth / 2;
    ctx.fillStyle = headerColor;
    ctx.beginPath();
    ctx.moveTo(x + radius, y + inset);
    ctx.lineTo(x + width - radius, y + inset);
    ctx.quadraticCurveTo(x + width - inset, y + inset, x + width - inset, y + radius);
    ctx.lineTo(x + width - inset, y + CLIP_HEADER_HEIGHT);
    ctx.lineTo(x + inset, y + CLIP_HEADER_HEIGHT);
    ctx.lineTo(x + inset, y + radius);
    ctx.quadraticCurveTo(x + inset, y + inset, x + radius, y + inset);
    ctx.closePath();
    ctx.fill();

    // Clip text to header area
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + inset, y + inset, width - strokeWidth, CLIP_HEADER_HEIGHT);
    ctx.clip();

    ctx.fillStyle = theme.text;
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(clip.name, x + 5, y + CLIP_HEADER_HEIGHT / 2);
    ctx.restore();

    // Draw waveform (adjusted to start below header)
    drawWaveform(ctx, clip, x, y + CLIP_HEADER_HEIGHT, width, height - CLIP_HEADER_HEIGHT);

    // Draw envelope if it has points or if envelope mode is active
    if (envelopeMode || clip.envelopePoints.length > 0) {
      drawEnvelope(ctx, clip, trackIndex, x, y + CLIP_HEADER_HEIGHT, width, height - CLIP_HEADER_HEIGHT, envelopeMode);
    }
  };

  const drawWaveform = (
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    const waveform = clip.waveform;
    if (waveform.length === 0) return;

    const centerY = y + height / 2;
    const maxAmplitude = height / 2 - 10;

    // Helper function to get gain at a specific time
    const getGainAtTime = (time: number): number => {
      if (clip.envelopePoints.length === 0) {
        return 1.0; // No envelope, unity gain
      }

      const points = clip.envelopePoints;

      // Before first point
      if (time <= points[0].time) {
        return dbToLinear(points[0].db);
      }

      // After last point
      if (time >= points[points.length - 1].time) {
        return dbToLinear(points[points.length - 1].db);
      }

      // Find the two points we're between
      for (let i = 0; i < points.length - 1; i++) {
        if (time >= points[i].time && time <= points[i + 1].time) {
          // Linear interpolation between the two points
          const t = (time - points[i].time) / (points[i + 1].time - points[i].time);
          const db = points[i].db + t * (points[i + 1].db - points[i].db);
          return dbToLinear(db);
        }
      }

      return 1.0;
    };

    // Convert dB to linear gain
    const dbToLinear = (db: number): number => {
      return Math.pow(10, db / 20);
    };

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)'; // Black at 70% opacity
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let i = 0; i < waveform.length; i++) {
      const px = x + (i / waveform.length) * width;
      const time = (i / waveform.length) * clip.duration;
      const gain = getGainAtTime(time);
      const amplitude = waveform[i] * gain;

      // Clamp amplitude to prevent overflow beyond clip boundaries
      const clampedAmplitude = Math.max(-1, Math.min(1, amplitude));
      const py = centerY + clampedAmplitude * maxAmplitude;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }

    ctx.stroke();
  };

  const drawEnvelope = (
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    trackIndex: number,
    x: number,
    y: number,
    width: number,
    height: number,
    showControlPoints: boolean
  ) => {
    const dbToY = (db: number) => {
      const minDb = -60;
      const maxDb = 12;
      const normalized = (db - minDb) / (maxDb - minDb);
      return y + height - normalized * height;
    };

    const zeroDB_Y = dbToY(0);
    const clipBottom = y + height;

    // Get envelope color based on track index
    // When envelope mode is on, use lighter, semi-transparent colors
    // When envelope mode is off, use darker, more saturated colors for visibility
    let envelopeColor = { r: 162, g: 199, b: 255 }; // Default blue
    let envelopeFillColor = { r: 80, g: 165, b: 255 }; // Darker blue for fill

    if (trackIndex === 0) {
      envelopeColor = { r: 162, g: 199, b: 255 }; // Blue #A2C7FF
      envelopeFillColor = { r: 80, g: 165, b: 255 }; // #50A5FF (clip header color)
    } else if (trackIndex === 1) {
      envelopeColor = { r: 193, g: 191, b: 254 }; // Violet #C1BFFE
      envelopeFillColor = { r: 154, g: 150, b: 255 }; // #9A96FF (clip header color)
    } else if (trackIndex === 2) {
      envelopeColor = { r: 232, g: 186, b: 224 }; // Magenta #E8BAE0
      envelopeFillColor = { r: 231, g: 135, b: 208 }; // #E787D0 (clip header color)
    }

    // First, draw the translucent fill below the envelope line
    // Use darker fill color when not in envelope mode for better visibility
    const fillOpacity = showControlPoints ? 0.15 : 0.6;
    const fillColor = showControlPoints ? envelopeColor : envelopeFillColor;
    ctx.fillStyle = `rgba(${fillColor.r}, ${fillColor.g}, ${fillColor.b}, ${fillOpacity})`;
    ctx.beginPath();

    if (clip.envelopePoints.length === 0) {
      // No control points - draw default fill at 0dB
      ctx.moveTo(x, zeroDB_Y);
      ctx.lineTo(x + width, zeroDB_Y);
      ctx.lineTo(x + width, clipBottom);
      ctx.lineTo(x, clipBottom);
      ctx.closePath();
    } else {
      // Draw fill through control points
      const startY =
        clip.envelopePoints[0].time === 0
          ? dbToY(clip.envelopePoints[0].db)
          : zeroDB_Y;
      ctx.moveTo(x, startY);

      clip.envelopePoints.forEach((point) => {
        const px = x + (point.time / clip.duration) * width;
        const py = dbToY(point.db);
        ctx.lineTo(px, py);
      });

      const lastPoint = clip.envelopePoints[clip.envelopePoints.length - 1];
      const endY = lastPoint.time < clip.duration ? dbToY(lastPoint.db) : dbToY(lastPoint.db);

      if (lastPoint.time < clip.duration) {
        ctx.lineTo(x + width, endY);
      }

      // Complete the fill shape by going down to the bottom
      ctx.lineTo(x + width, clipBottom);
      ctx.lineTo(x, clipBottom);
      ctx.closePath();
    }

    ctx.fill();

    // Draw the envelope line only when in envelope mode
    if (showControlPoints) {
      // Draw the actual envelope line
      ctx.strokeStyle = `rgb(${envelopeColor.r}, ${envelopeColor.g}, ${envelopeColor.b})`;
      ctx.lineWidth = 2;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      ctx.beginPath();

      if (clip.envelopePoints.length === 0) {
        // No control points - draw default line at 0dB
        ctx.moveTo(x, zeroDB_Y);
        ctx.lineTo(x + width, zeroDB_Y);
      } else {
        // Draw envelope through control points
        const startY =
          clip.envelopePoints[0].time === 0
            ? dbToY(clip.envelopePoints[0].db)
            : zeroDB_Y;
        ctx.moveTo(x, startY);

        clip.envelopePoints.forEach((point) => {
          const px = x + (point.time / clip.duration) * width;
          const py = dbToY(point.db);
          ctx.lineTo(px, py);
        });

        const lastPoint = clip.envelopePoints[clip.envelopePoints.length - 1];
        if (lastPoint.time < clip.duration) {
          ctx.lineTo(x + width, dbToY(lastPoint.db));
        }
      }

      ctx.stroke();
    }

    // Draw control points when in envelope mode
    if (showControlPoints) {
      clip.envelopePoints.forEach((point) => {
        const px = x + (point.time / clip.duration) * width;
        const py = dbToY(point.db);

        // Outer circle with clip color
        ctx.fillStyle = `rgb(${envelopeColor.r}, ${envelopeColor.g}, ${envelopeColor.b})`;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();

        // Inner white circle
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="block bg-[#212433]"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    />
  );
}
