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
  focusedTrackIndex: number | null;
  timeSelection: TimeSelection | null;
  hoveredClipHeader: { clipId: number; trackIndex: number } | null;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}

const CLIP_HEADER_HEIGHT = 20;
const LEFT_PADDING = 12;
const INFINITY_ZONE_HEIGHT = 1; // Last 1px represents -infinity dB

// Non-linear dB scale conversion helpers
const dbToYNonLinear = (db: number, y: number, height: number): number => {
  const minDb = -60;
  const maxDb = 12;
  const usableHeight = height - INFINITY_ZONE_HEIGHT;

  // -Infinity maps to the bottom (y + height)
  if (db === -Infinity || db < minDb) {
    return y + height;
  }

  // Linear mapping for normal dB range, leaving bottom 1px for -infinity
  const normalized = (db - minDb) / (maxDb - minDb);
  return y + usableHeight - normalized * usableHeight;
};

const yToDbNonLinear = (yPos: number, y: number, height: number): number => {
  const minDb = -60;
  const maxDb = 12;
  const usableHeight = height - INFINITY_ZONE_HEIGHT;

  // Last 1px at the bottom represents -infinity
  if (yPos >= y + usableHeight) {
    return -Infinity;
  }

  // Linear mapping for normal dB range
  const normalized = (y + usableHeight - yPos) / usableHeight;
  return Math.max(minDb, Math.min(maxDb, minDb + normalized * (maxDb - minDb)));
};

export default function TrackCanvas({
  tracks,
  envelopeMode,
  trackHeight,
  pixelsPerSecond,
  canvasWidth,
  selectedTrackIndices,
  focusedTrackIndex,
  timeSelection,
  hoveredClipHeader,
  envelopeDragState,
  onMouseDown,
  onMouseMove,
  onMouseUp,
}: TrackCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || tracks.length === 0) return;

    canvas.width = canvasWidth;
    canvas.height = 2 + tracks.length * trackHeight + Math.max(0, tracks.length - 1) * 2; // 2px initial gap + track heights + 2px gaps between tracks

    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
    canvas.width *= dpr;
    canvas.height *= dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    render(ctx);
  }, [tracks, envelopeMode, trackHeight, pixelsPerSecond, canvasWidth, selectedTrackIndices, focusedTrackIndex, timeSelection, hoveredClipHeader]);

  const render = (ctx: CanvasRenderingContext2D) => {
    const dpr = window.devicePixelRatio || 1;
    const canvas = ctx.canvas;

    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    const TRACK_GAP = 2;
    const INITIAL_GAP = 2; // 2px gap above first track

    tracks.forEach((track, trackIndex) => {
      const y = INITIAL_GAP + trackIndex * (trackHeight + TRACK_GAP);
      const isSelected = selectedTrackIndices.includes(trackIndex);
      const isFocused = trackIndex === focusedTrackIndex;

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

      // Draw focused track outline (2px blue outline in the gap - top and bottom only)
      if (isFocused) {
        ctx.strokeStyle = '#84B5FF';
        ctx.lineWidth = 2;

        // Top border (in the 2px gap above)
        ctx.beginPath();
        ctx.moveTo(0, y - 1);
        ctx.lineTo(canvasWidth, y - 1);
        ctx.stroke();

        // Bottom border (in the 2px gap below)
        ctx.beginPath();
        ctx.moveTo(0, y + trackHeight + 1);
        ctx.lineTo(canvasWidth, y + trackHeight + 1);
        ctx.stroke();
      }

      // Draw time selection only on selected tracks (areas outside clips)
      if (timeSelection && isSelected) {
        const startX = LEFT_PADDING + timeSelection.startTime * pixelsPerSecond;
        const endX = LEFT_PADDING + timeSelection.endTime * pixelsPerSecond;
        const width = endX - startX;

        // Draw default selection color across entire track
        ctx.fillStyle = 'rgba(171, 231, 255, 0.2)';
        ctx.fillRect(startX, y, width, trackHeight);
      }

      // Draw clips
      track.clips.forEach((clip) => {
        drawClip(ctx, clip, trackIndex, timeSelection, isSelected);
      });
    });
  };

  const drawClip = (ctx: CanvasRenderingContext2D, clip: Clip, trackIndex: number, timeSelection: TimeSelection | null, isSelected: boolean) => {
    const TRACK_GAP = 2;
    const INITIAL_GAP = 2;
    const x = LEFT_PADDING + clip.startTime * pixelsPerSecond;
    const y = INITIAL_GAP + trackIndex * (trackHeight + TRACK_GAP);
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

    // Determine final clip color (use envelope mode colors if active)
    let finalClipColor = clipBgColor;
    if (envelopeMode) {
      if (trackIndex === 0) {
        finalClipColor = '#7A8FB8'; // Blue (more saturated)
      } else if (trackIndex === 1) {
        finalClipColor = '#8A88B8'; // Violet (more saturated)
      } else if (trackIndex === 2) {
        finalClipColor = '#B888A8'; // Magenta (more saturated)
      } else {
        finalClipColor = '#7A8FB8'; // Default to blue
      }
    }

    ctx.fillStyle = finalClipColor;
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

    // Draw time selection highlight for clip headers
    if (timeSelection && isSelected) {
      const clipStartTime = clip.startTime;
      const clipEndTime = clip.startTime + clip.duration;

      // Check if time selection overlaps with this clip
      if (timeSelection.endTime > clipStartTime && timeSelection.startTime < clipEndTime) {
        // Calculate the overlap region
        const overlapStart = Math.max(timeSelection.startTime, clipStartTime);
        const overlapEnd = Math.min(timeSelection.endTime, clipEndTime);

        const clipStartX = LEFT_PADDING + overlapStart * pixelsPerSecond;
        const clipEndX = LEFT_PADDING + overlapEnd * pixelsPerSecond;
        const clipWidth = clipEndX - clipStartX;

        // Set header selection color based on track
        let headerSelectionColor = '#78ECFF'; // Blue
        if (trackIndex === 1) {
          headerSelectionColor = '#C6DDFF'; // Violet
        } else if (trackIndex === 2) {
          headerSelectionColor = '#FFCFFF'; // Magenta
        }

        // Draw selection on the header area
        ctx.fillStyle = headerSelectionColor;
        ctx.beginPath();
        ctx.rect(clipStartX, y + inset, clipWidth, CLIP_HEADER_HEIGHT);
        ctx.fill();
      }
    }

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

    // Draw envelope fill if it has points or if envelope mode is active (only outside selection)
    if (envelopeMode || clip.envelopePoints.length > 0) {
      drawEnvelopeFill(ctx, clip, trackIndex, x, y + CLIP_HEADER_HEIGHT, width, height - CLIP_HEADER_HEIGHT, envelopeMode, null, false);
    }

    // Draw time selection highlight - after envelope fill so it shows on top
    if (timeSelection && isSelected) {
      const clipStartTime = clip.startTime;
      const clipEndTime = clip.startTime + clip.duration;

      // Check if time selection overlaps with this clip
      if (timeSelection.endTime > clipStartTime && timeSelection.startTime < clipEndTime) {
        // Calculate the overlap region
        const overlapStart = Math.max(timeSelection.startTime, clipStartTime);
        const overlapEnd = Math.min(timeSelection.endTime, clipEndTime);

        const clipStartX = LEFT_PADDING + overlapStart * pixelsPerSecond;
        const clipEndX = LEFT_PADDING + overlapEnd * pixelsPerSecond;
        const clipWidth = clipEndX - clipStartX;

        // Set body selection color based on track
        let bodySelectionColor = '#A0FDFF'; // Blue
        if (trackIndex === 1) {
          bodySelectionColor = '#DBF1FF'; // Violet
        } else if (trackIndex === 2) {
          bodySelectionColor = '#FFE7FF'; // Magenta
        }

        // Draw selection only on the waveform area (below the clip header)
        ctx.fillStyle = bodySelectionColor;
        ctx.fillRect(clipStartX, y + CLIP_HEADER_HEIGHT, clipWidth, height - CLIP_HEADER_HEIGHT);

        // Draw automation overlay on top of selection if clip has automation
        if (clip.envelopePoints.length > 0) {
          drawEnvelopeFillInSelection(ctx, clip, trackIndex, clipStartX, y + CLIP_HEADER_HEIGHT, clipWidth, height - CLIP_HEADER_HEIGHT);
        }
      }
    }

    // Draw waveform (after envelope fill and selection so it appears on top)
    drawWaveform(ctx, clip, trackIndex, x, y + CLIP_HEADER_HEIGHT, width, height - CLIP_HEADER_HEIGHT);

    // Draw envelope line and control points if in envelope mode - after waveform so line is on top
    if (envelopeMode) {
      drawEnvelopeLine(ctx, clip, trackIndex, x, y + CLIP_HEADER_HEIGHT, width, height - CLIP_HEADER_HEIGHT);
    }
  };

  const drawWaveform = (
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    trackIndex: number,
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

    // Set waveform color based on track
    let waveformColor = '#122332'; // Default blue
    if (trackIndex === 0) {
      waveformColor = '#122332'; // Blue
    } else if (trackIndex === 1) {
      waveformColor = '#1F1F33'; // Violet
    } else if (trackIndex === 2) {
      waveformColor = '#2F1D29'; // Magenta
    }

    ctx.strokeStyle = waveformColor;
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

  const drawEnvelopeFillInSelection = (
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    trackIndex: number,
    selectionX: number,
    y: number,
    selectionWidth: number,
    height: number
  ) => {
    const zeroDB_Y = dbToYNonLinear(0, y, height);
    const clipBottom = y + height;

    // Use colors that blend with the selection highlight
    let envelopeFillColor = '#70BFE6'; // Default blue (more selection color mixed in)
    if (trackIndex === 0) {
      envelopeFillColor = '#70BFE6'; // Blue (blend with #A0FDFF selection)
    } else if (trackIndex === 1) {
      envelopeFillColor = '#B8B8F0'; // Violet (blend with #DBF1FF selection)
    } else if (trackIndex === 2) {
      envelopeFillColor = '#E8A8D8'; // Magenta (blend with #FFE7FF selection)
    }

    // Calculate clip position
    const clipX = LEFT_PADDING + clip.startTime * pixelsPerSecond;
    const clipWidth = clip.duration * pixelsPerSecond;

    // Draw the fill, clipped to the selection area
    ctx.save();
    ctx.beginPath();
    ctx.rect(selectionX, y, selectionWidth, height);
    ctx.clip();

    ctx.fillStyle = envelopeFillColor;
    ctx.beginPath();

    if (clip.envelopePoints.length === 0) {
      // No control points - draw default fill at 0dB
      ctx.moveTo(clipX, zeroDB_Y);
      ctx.lineTo(clipX + clipWidth, zeroDB_Y);
      ctx.lineTo(clipX + clipWidth, clipBottom);
      ctx.lineTo(clipX, clipBottom);
      ctx.closePath();
    } else {
      // Draw fill through control points
      // Always use first point's dB value for the fill from clip start to first point
      const startY = dbToYNonLinear(clip.envelopePoints[0].db, y, height);
      ctx.moveTo(clipX, startY);

      clip.envelopePoints.forEach((point) => {
        const px = clipX + (point.time / clip.duration) * clipWidth;
        const py = dbToYNonLinear(point.db, y, height);
        ctx.lineTo(px, py);
      });

      const lastPoint = clip.envelopePoints[clip.envelopePoints.length - 1];
      const endY = lastPoint.time < clip.duration ? dbToYNonLinear(lastPoint.db, y, height) : dbToYNonLinear(lastPoint.db, y, height);

      if (lastPoint.time < clip.duration) {
        ctx.lineTo(clipX + clipWidth, endY);
      }

      // Complete the fill shape by going down to the bottom
      ctx.lineTo(clipX + clipWidth, clipBottom);
      ctx.lineTo(clipX, clipBottom);
      ctx.closePath();
    }

    ctx.fill();
    ctx.restore();
  };

  const drawEnvelopeFill = (
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    trackIndex: number,
    x: number,
    y: number,
    width: number,
    height: number,
    envelopeMode: boolean,
    timeSelection: TimeSelection | null,
    isSelected: boolean
  ) => {
    const zeroDB_Y = dbToYNonLinear(0, y, height);
    const clipBottom = y + height;

    // Check if there's a selection on this track
    const hasSelection = timeSelection && isSelected;

    // Get envelope fill color based on track index
    // Use more saturated colors based on clip background colors
    let envelopeFillColor = '#B3C8E6'; // Default blue
    if (envelopeMode) {
      // Lighter colors when envelope mode is on
      if (trackIndex === 0) {
        envelopeFillColor = '#B3C8E6'; // Blue
      } else if (trackIndex === 1) {
        envelopeFillColor = '#D0CFE6'; // Violet
      } else if (trackIndex === 2) {
        envelopeFillColor = '#E8C7E0'; // Magenta
      }
    } else {
      if (hasSelection) {
        // Selected state - use colors that work with selection highlight
        if (trackIndex === 0) {
          envelopeFillColor = '#5B8AC9'; // Blue (darker for selection)
        } else if (trackIndex === 1) {
          envelopeFillColor = '#8785D6'; // Violet (darker for selection)
        } else if (trackIndex === 2) {
          envelopeFillColor = '#C978B8'; // Magenta (darker for selection)
        }
      } else {
        // Normal state - more saturated colors (closer to clip bg)
        if (trackIndex === 0) {
          envelopeFillColor = '#7BA0D9'; // Blue (more saturated)
        } else if (trackIndex === 1) {
          envelopeFillColor = '#A7A5E6'; // Violet (more saturated)
        } else if (trackIndex === 2) {
          envelopeFillColor = '#D998C8'; // Magenta (more saturated)
        }
      }
    }

    // Draw the fill
    ctx.fillStyle = envelopeFillColor;
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
      // Always use first point's dB value for the fill from clip start to first point
      const startY = dbToYNonLinear(clip.envelopePoints[0].db, y, height);
      ctx.moveTo(x, startY);

      clip.envelopePoints.forEach((point) => {
        const px = x + (point.time / clip.duration) * width;
        const py = dbToYNonLinear(point.db, y, height);
        ctx.lineTo(px, py);
      });

      const lastPoint = clip.envelopePoints[clip.envelopePoints.length - 1];
      const endY = lastPoint.time < clip.duration ? dbToYNonLinear(lastPoint.db, y, height) : dbToYNonLinear(lastPoint.db, y, height);

      if (lastPoint.time < clip.duration) {
        ctx.lineTo(x + width, endY);
      }

      // Complete the fill shape by going down to the bottom
      ctx.lineTo(x + width, clipBottom);
      ctx.lineTo(x, clipBottom);
      ctx.closePath();
    }

    ctx.fill();
  };

  const drawEnvelopeLine = (
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    trackIndex: number,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    const zeroDB_Y = dbToYNonLinear(0, y, height);

    // Use solid red color for envelope line
    const envelopeLineColor = 'red';

    // Draw the actual envelope line
    ctx.strokeStyle = envelopeLineColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.beginPath();

    if (clip.envelopePoints.length === 0) {
      // No control points - draw default line at 0dB
      ctx.moveTo(x, zeroDB_Y);
      ctx.lineTo(x + width, zeroDB_Y);
    } else {
      // Draw envelope through all control points (they all remain visible)
      // Always use first point's dB value for the line from clip start to first point
      const startY = dbToYNonLinear(clip.envelopePoints[0].db, y, height);
      ctx.moveTo(x, startY);

      clip.envelopePoints.forEach((point) => {
        const px = x + (point.time / clip.duration) * width;
        const py = dbToYNonLinear(point.db, y, height);
        ctx.lineTo(px, py);
      });

      const lastPoint = clip.envelopePoints[clip.envelopePoints.length - 1];
      if (lastPoint.time < clip.duration) {
        ctx.lineTo(x + width, dbToYNonLinear(lastPoint.db, y, height));
      }
    }

    ctx.stroke();

    // Draw all control points (they all remain visible in their original positions)
    clip.envelopePoints.forEach((point) => {
      const px = x + (point.time / clip.duration) * width;
      const py = dbToYNonLinear(point.db, y, height);

      // Outer circle with red color
      ctx.fillStyle = envelopeLineColor;
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();

      // Inner white circle
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    });
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
