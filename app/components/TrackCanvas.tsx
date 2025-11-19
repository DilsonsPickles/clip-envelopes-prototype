'use client';

import { useEffect, useRef } from 'react';
import { Track, Clip, EnvelopePoint, TimeSelection, EnvelopeDragState } from './types';
import { theme } from '../theme';

interface TrackCanvasProps {
  tracks: Track[];
  envelopeMode: boolean;
  trackHeight: number; // Default track height
  pixelsPerSecond: number;
  canvasWidth: number;
  selectedTrackIndices: number[];
  focusedTrackIndex: number | null;
  timeSelection: TimeSelection | null;
  hoveredClipHeader: { clipId: number; trackIndex: number } | null;
  envelopeDragState: EnvelopeDragState | null;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}

// Helper to get track height (with default fallback)
const getTrackHeight = (track: Track, defaultHeight: number): number => {
  return track.height ?? defaultHeight;
};

// Helper to calculate track Y position
const getTrackY = (tracks: Track[], trackIndex: number, defaultHeight: number): number => {
  const TRACK_GAP = 2;
  const INITIAL_GAP = 2;
  let y = INITIAL_GAP;
  for (let i = 0; i < trackIndex; i++) {
    y += getTrackHeight(tracks[i], defaultHeight) + TRACK_GAP;
  }
  return y;
};

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
    // Calculate minimum height needed for tracks (considering individual track heights)
    const TRACK_GAP = 2;
    const INITIAL_GAP = 2;
    let totalTrackHeight = INITIAL_GAP;
    tracks.forEach((track, index) => {
      totalTrackHeight += getTrackHeight(track, trackHeight);
      if (index < tracks.length - 1) {
        totalTrackHeight += TRACK_GAP;
      }
    });
    totalTrackHeight += TRACK_GAP; // Final gap at bottom

    const minHeightForTracks = totalTrackHeight;
    // Extend canvas to bottom of viewport (subtract toolbar height of 50px)
    const viewportHeight = window.innerHeight - 50;
    canvas.height = Math.max(minHeightForTracks, viewportHeight);

    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
    canvas.width *= dpr;
    canvas.height *= dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    render(ctx);
  }, [tracks, envelopeMode, trackHeight, pixelsPerSecond, canvasWidth, selectedTrackIndices, focusedTrackIndex, timeSelection, hoveredClipHeader, envelopeDragState]);

  const render = (ctx: CanvasRenderingContext2D) => {
    const dpr = window.devicePixelRatio || 1;
    const canvas = ctx.canvas;

    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    const TRACK_GAP = 2;
    const INITIAL_GAP = 2; // 2px gap above first track

    tracks.forEach((track, trackIndex) => {
      const y = getTrackY(tracks, trackIndex, trackHeight);
      const currentTrackHeight = getTrackHeight(track, trackHeight);
      const isSelected = selectedTrackIndices.includes(trackIndex);
      const isFocused = trackIndex === focusedTrackIndex;

      // Draw track background
      // Canvas background: #212433
      // Idle tracks: 5% white overlay on top of canvas
      // Selected tracks: 10% white overlay on top of canvas
      if (isSelected) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, y, canvasWidth, currentTrackHeight);
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(0, y, canvasWidth, currentTrackHeight);
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
        ctx.moveTo(0, y + currentTrackHeight + 1);
        ctx.lineTo(canvasWidth, y + currentTrackHeight + 1);
        ctx.stroke();
      }

      // Draw time selection overlay on all tracks (less opaque on unselected tracks)
      if (timeSelection) {
        const startX = LEFT_PADDING + timeSelection.startTime * pixelsPerSecond;
        const endX = LEFT_PADDING + timeSelection.endTime * pixelsPerSecond;
        const width = endX - startX;
        const radius = 4;

        // Draw selection color with rounded corners - less opaque on unselected tracks
        if (isSelected) {
          ctx.fillStyle = 'rgba(171, 231, 255, 0.2)';
        } else {
          ctx.fillStyle = 'rgba(171, 231, 255, 0.08)'; // Less opaque for unselected tracks
        }

        // Draw rounded rectangle for time selection
        ctx.beginPath();
        ctx.moveTo(startX + radius, y);
        ctx.lineTo(startX + width - radius, y);
        ctx.arcTo(startX + width, y, startX + width, y + radius, radius);
        ctx.lineTo(startX + width, y + currentTrackHeight - radius);
        ctx.arcTo(startX + width, y + currentTrackHeight, startX + width - radius, y + currentTrackHeight, radius);
        ctx.lineTo(startX + radius, y + currentTrackHeight);
        ctx.arcTo(startX, y + currentTrackHeight, startX, y + currentTrackHeight - radius, radius);
        ctx.lineTo(startX, y + radius);
        ctx.arcTo(startX, y, startX + radius, y, radius);
        ctx.closePath();
        ctx.fill();
      }

      // Draw clips
      track.clips.forEach((clip) => {
        // Determine if this clip has hidden points during drag
        let hiddenIndices: number[] = [];
        if (envelopeDragState &&
            envelopeDragState.trackIndex === trackIndex &&
            envelopeDragState.clip.id === clip.id) {
          hiddenIndices = envelopeDragState.hiddenPointIndices;
        }

        drawClip(ctx, clip, trackIndex, currentTrackHeight, timeSelection, isSelected, hiddenIndices);
      });
    });

    // Draw time selection overlay in empty space below all tracks
    if (timeSelection) {
      const startX = LEFT_PADDING + timeSelection.startTime * pixelsPerSecond;
      const endX = LEFT_PADDING + timeSelection.endTime * pixelsPerSecond;
      const width = endX - startX;

      // Calculate where empty space starts (below last track)
      const lastTrackY = getTrackY(tracks, tracks.length - 1, trackHeight);
      const lastTrackHeight = getTrackHeight(tracks[tracks.length - 1], trackHeight);
      const emptySpaceStartY = lastTrackY + lastTrackHeight + TRACK_GAP;
      const canvasHeight = canvas.height / (window.devicePixelRatio || 1);
      const emptySpaceHeight = canvasHeight - emptySpaceStartY;

      if (emptySpaceHeight > 0) {
        ctx.fillStyle = 'rgba(171, 231, 255, 0.08)'; // Same opacity as unselected tracks
        ctx.fillRect(startX, emptySpaceStartY, width, emptySpaceHeight);
      }
    }
  };

  const drawClip = (
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    trackIndex: number,
    currentTrackHeight: number,
    timeSelection: TimeSelection | null,
    isSelected: boolean,
    hiddenPointIndices: number[] = []
  ) => {
    const TRACK_GAP = 2;
    const INITIAL_GAP = 2;
    const x = LEFT_PADDING + clip.startTime * pixelsPerSecond;
    const y = getTrackY(tracks, trackIndex, trackHeight);
    const width = clip.duration * pixelsPerSecond;
    const height = currentTrackHeight;
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
          headerSelectionColor = clip.selected ? '#C6DDFF' : '#C6DDFF'; // Violet (same for both)
        } else if (trackIndex === 2) {
          headerSelectionColor = '#FFCFFF'; // Magenta
        }

        // Draw selection on the header area with rounded corners matching clip header
        ctx.fillStyle = headerSelectionColor;
        ctx.beginPath();

        // Determine if this is the left edge (round top-left corner)
        const isLeftEdge = overlapStart === clipStartTime;
        // Determine if this is the right edge (round top-right corner)
        const isRightEdge = overlapEnd === clipEndTime;

        const selectionY = y + inset;
        const selectionHeight = CLIP_HEADER_HEIGHT;

        if (isLeftEdge && isRightEdge) {
          // Both edges - round both top corners
          ctx.moveTo(clipStartX + radius, selectionY);
          ctx.lineTo(clipEndX - radius, selectionY);
          ctx.quadraticCurveTo(clipEndX, selectionY, clipEndX, selectionY + radius);
          ctx.lineTo(clipEndX, selectionY + selectionHeight);
          ctx.lineTo(clipStartX, selectionY + selectionHeight);
          ctx.lineTo(clipStartX, selectionY + radius);
          ctx.quadraticCurveTo(clipStartX, selectionY, clipStartX + radius, selectionY);
        } else if (isLeftEdge) {
          // Left edge only - round top-left corner
          ctx.moveTo(clipStartX + radius, selectionY);
          ctx.lineTo(clipEndX, selectionY);
          ctx.lineTo(clipEndX, selectionY + selectionHeight);
          ctx.lineTo(clipStartX, selectionY + selectionHeight);
          ctx.lineTo(clipStartX, selectionY + radius);
          ctx.quadraticCurveTo(clipStartX, selectionY, clipStartX + radius, selectionY);
        } else if (isRightEdge) {
          // Right edge only - round top-right corner
          ctx.moveTo(clipStartX, selectionY);
          ctx.lineTo(clipEndX - radius, selectionY);
          ctx.quadraticCurveTo(clipEndX, selectionY, clipEndX, selectionY + radius);
          ctx.lineTo(clipEndX, selectionY + selectionHeight);
          ctx.lineTo(clipStartX, selectionY + selectionHeight);
        } else {
          // Middle section - no rounded corners
          ctx.rect(clipStartX, selectionY, clipWidth, selectionHeight);
        }

        ctx.closePath();
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
      drawEnvelopeFill(ctx, clip, trackIndex, x, y + CLIP_HEADER_HEIGHT, width, height - CLIP_HEADER_HEIGHT, envelopeMode, null, false, hiddenPointIndices);
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

        // Set body selection color based on track (darker in envelope mode)
        let bodySelectionColor = '#70D4FF'; // Blue (darker)
        if (envelopeMode) {
          // Even darker for envelope mode
          bodySelectionColor = '#50B4E6'; // Blue (darker for envelope mode)
          if (trackIndex === 1) {
            bodySelectionColor = '#98B4E6'; // Violet (darker for envelope mode)
          } else if (trackIndex === 2) {
            bodySelectionColor = '#D8A8E6'; // Magenta (darker for envelope mode)
          }
        } else {
          // For unselected clips in normal mode, use lighter colors
          if (!clip.selected) {
            if (trackIndex === 1) {
              bodySelectionColor = '#DBF1FF'; // Violet body (unselected)
            } else if (trackIndex === 2) {
              bodySelectionColor = '#E8C8FF'; // Magenta (darker)
            }
          } else {
            if (trackIndex === 1) {
              bodySelectionColor = '#B8D4FF'; // Violet (darker)
            } else if (trackIndex === 2) {
              bodySelectionColor = '#E8C8FF'; // Magenta (darker)
            }
          }
        }

        // Draw selection only on the waveform area (below the clip header)
        ctx.fillStyle = bodySelectionColor;
        ctx.fillRect(clipStartX, y + CLIP_HEADER_HEIGHT, clipWidth, height - CLIP_HEADER_HEIGHT);

        // Draw automation overlay on top of selection in envelope mode
        if (envelopeMode || clip.envelopePoints.length > 0) {
          drawEnvelopeFillInSelection(ctx, clip, trackIndex, clipStartX, y + CLIP_HEADER_HEIGHT, clipWidth, height - CLIP_HEADER_HEIGHT, hiddenPointIndices);
        }
      }
    }

    // Draw waveform (after envelope fill and selection so it appears on top)
    drawWaveform(ctx, clip, trackIndex, x, y + CLIP_HEADER_HEIGHT, width, height - CLIP_HEADER_HEIGHT, timeSelection, isSelected);

    // Draw envelope line and control points if in envelope mode - after waveform so line is on top
    if (envelopeMode) {
      drawEnvelopeLine(ctx, clip, trackIndex, x, y + CLIP_HEADER_HEIGHT, width, height - CLIP_HEADER_HEIGHT, hiddenPointIndices);
    }
  };

  const drawWaveform = (
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    trackIndex: number,
    x: number,
    y: number,
    width: number,
    height: number,
    timeSelection: TimeSelection | null,
    isSelected: boolean
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

    // Check if this clip overlaps with the time selection
    const clipStartTime = clip.startTime;
    const clipEndTime = clip.startTime + clip.duration;
    const hasSelectionOverlap = timeSelection &&
                                timeSelection.endTime > clipStartTime &&
                                timeSelection.startTime < clipEndTime;

    // Set waveform color based on track and selection state
    let waveformColor = '#122332'; // Default blue
    let waveformSelectedColor = '#2A4A5A'; // Lighter blue for selection

    if (trackIndex === 0) {
      waveformColor = '#122332'; // Blue
      waveformSelectedColor = '#2A4A5A'; // Lighter blue
    } else if (trackIndex === 1) {
      waveformColor = '#1F1F33'; // Violet
      waveformSelectedColor = '#3A3A50'; // Lighter violet
    } else if (trackIndex === 2) {
      waveformColor = '#2E1F2A'; // Magenta
      waveformSelectedColor = '#4A3A45'; // Lighter magenta
    }

    ctx.lineWidth = 1;

    // Draw waveform in segments based on selection
    let segmentStartIndex = 0;
    let wasInSelection = false;

    for (let i = 0; i <= waveform.length; i++) {
      const time = (i / waveform.length) * clip.duration;
      const absoluteTime = clipStartTime + time;

      // Determine if this point is within the selection
      const inSelection: boolean = !!(hasSelectionOverlap &&
                         timeSelection &&
                         absoluteTime >= timeSelection.startTime &&
                         absoluteTime <= timeSelection.endTime);

      // When selection state changes or we reach the end, draw the segment
      if (i === waveform.length || (i > 0 && inSelection !== wasInSelection)) {
        // Draw segment from segmentStartIndex to i
        ctx.strokeStyle = wasInSelection ? waveformSelectedColor : waveformColor;
        ctx.beginPath();

        for (let j = segmentStartIndex; j < i; j++) {
          const px = x + (j / waveform.length) * width;
          const jTime = (j / waveform.length) * clip.duration;
          const gain = getGainAtTime(jTime);
          const amplitude = waveform[j] * gain;
          const clampedAmplitude = Math.max(-1, Math.min(1, amplitude));
          const py = centerY + clampedAmplitude * maxAmplitude;

          if (j === segmentStartIndex) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }

        ctx.stroke();

        segmentStartIndex = i;
        wasInSelection = inSelection;
      }
    }
  };

  const drawEnvelopeFillInSelection = (
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    trackIndex: number,
    selectionX: number,
    y: number,
    selectionWidth: number,
    height: number,
    hiddenPointIndices: number[] = []
  ) => {
    const zeroDB_Y = dbToYNonLinear(0, y, height);
    const clipBottom = y + height;

    // Use extremely light colors that blend with the selection highlight
    let envelopeFillColor = '#D0F0FF'; // Default blue (extremely light)
    if (trackIndex === 0) {
      envelopeFillColor = '#D0F0FF'; // Blue (extremely light to blend with #70D4FF selection)
    } else if (trackIndex === 1) {
      envelopeFillColor = '#E8F0FF'; // Violet (extremely light to blend with #B8D4FF selection)
    } else if (trackIndex === 2) {
      envelopeFillColor = '#FCE8FC'; // Magenta (extremely light to blend with #E8C8FF selection)
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
      // Filter out hidden points for drawing the fill
      const visiblePoints = clip.envelopePoints.filter((_, index) => !hiddenPointIndices.includes(index));

      if (visiblePoints.length === 0) {
        // All points are hidden - draw default fill at 0dB
        ctx.moveTo(clipX, zeroDB_Y);
        ctx.lineTo(clipX + clipWidth, zeroDB_Y);
        ctx.lineTo(clipX + clipWidth, clipBottom);
        ctx.lineTo(clipX, clipBottom);
        ctx.closePath();
      } else {
        // Draw fill through visible control points only
        // Always use first visible point's dB value for the fill from clip start to first point
        const startY = dbToYNonLinear(visiblePoints[0].db, y, height);
        ctx.moveTo(clipX, startY);

        visiblePoints.forEach((point) => {
          const px = clipX + (point.time / clip.duration) * clipWidth;
          const py = dbToYNonLinear(point.db, y, height);
          ctx.lineTo(px, py);
        });

        const lastPoint = visiblePoints[visiblePoints.length - 1];
        const endY = lastPoint.time < clip.duration ? dbToYNonLinear(lastPoint.db, y, height) : dbToYNonLinear(lastPoint.db, y, height);

        if (lastPoint.time < clip.duration) {
          ctx.lineTo(clipX + clipWidth, endY);
        }

        // Complete the fill shape by going down to the bottom
        ctx.lineTo(clipX + clipWidth, clipBottom);
        ctx.lineTo(clipX, clipBottom);
        ctx.closePath();
      }
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
    isSelected: boolean,
    hiddenPointIndices: number[] = []
  ) => {
    const zeroDB_Y = dbToYNonLinear(0, y, height);
    const clipBottom = y + height;

    // Check if there's a selection on this track
    const hasSelection = timeSelection && isSelected;

    // Get envelope fill color based on track index
    // Use more saturated colors based on clip background colors with transparency
    let envelopeFillColor = 'rgba(141, 212, 255, 0.5)'; // Default blue with 50% opacity
    if (envelopeMode) {
      // Colors when envelope mode is on (matching selection overlay colors)
      if (trackIndex === 0) {
        envelopeFillColor = 'rgba(141, 212, 255, 0.5)'; // Blue with transparency
      } else if (trackIndex === 1) {
        envelopeFillColor = 'rgba(200, 216, 255, 0.5)'; // Violet with transparency
      } else if (trackIndex === 2) {
        envelopeFillColor = 'rgba(240, 200, 240, 0.5)'; // Magenta with transparency
      }
    } else {
      if (hasSelection) {
        // Selected state - use colors that work with selection highlight
        if (trackIndex === 0) {
          envelopeFillColor = 'rgba(91, 138, 201, 0.5)'; // Blue (darker for selection) with transparency
        } else if (trackIndex === 1) {
          envelopeFillColor = 'rgba(135, 133, 214, 0.5)'; // Violet (darker for selection) with transparency
        } else if (trackIndex === 2) {
          envelopeFillColor = 'rgba(201, 120, 184, 0.5)'; // Magenta (darker for selection) with transparency
        }
      } else {
        // Normal state - more saturated colors (closer to clip bg) with transparency
        if (trackIndex === 0) {
          envelopeFillColor = 'rgba(123, 160, 217, 0.5)'; // Blue (more saturated) with transparency
        } else if (trackIndex === 1) {
          envelopeFillColor = 'rgba(167, 165, 230, 0.5)'; // Violet (more saturated) with transparency
        } else if (trackIndex === 2) {
          envelopeFillColor = 'rgba(217, 152, 200, 0.5)'; // Magenta (more saturated) with transparency
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
      // Filter out hidden points for drawing the fill
      const visiblePoints = clip.envelopePoints.filter((_, index) => !hiddenPointIndices.includes(index));

      if (visiblePoints.length === 0) {
        // All points are hidden - draw default fill at 0dB
        ctx.moveTo(x, zeroDB_Y);
        ctx.lineTo(x + width, zeroDB_Y);
        ctx.lineTo(x + width, clipBottom);
        ctx.lineTo(x, clipBottom);
        ctx.closePath();
      } else {
        // Draw fill through visible control points only
        // Always use first visible point's dB value for the fill from clip start to first point
        const startY = dbToYNonLinear(visiblePoints[0].db, y, height);
        ctx.moveTo(x, startY);

        visiblePoints.forEach((point) => {
          const px = x + (point.time / clip.duration) * width;
          const py = dbToYNonLinear(point.db, y, height);
          ctx.lineTo(px, py);
        });

        const lastPoint = visiblePoints[visiblePoints.length - 1];
        const endY = lastPoint.time < clip.duration ? dbToYNonLinear(lastPoint.db, y, height) : dbToYNonLinear(lastPoint.db, y, height);

        if (lastPoint.time < clip.duration) {
          ctx.lineTo(x + width, endY);
        }

        // Complete the fill shape by going down to the bottom
        ctx.lineTo(x + width, clipBottom);
        ctx.lineTo(x, clipBottom);
        ctx.closePath();
      }
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
    height: number,
    hiddenPointIndices: number[] = []
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
      // Filter out hidden points for drawing the line
      const visiblePoints = clip.envelopePoints.filter((_, index) => !hiddenPointIndices.includes(index));

      if (visiblePoints.length === 0) {
        // All points are hidden - draw default line at 0dB
        ctx.moveTo(x, zeroDB_Y);
        ctx.lineTo(x + width, zeroDB_Y);
      } else {
        // Draw envelope through visible control points only
        // Always use first visible point's dB value for the line from clip start to first point
        const startY = dbToYNonLinear(visiblePoints[0].db, y, height);
        ctx.moveTo(x, startY);

        visiblePoints.forEach((point) => {
          const px = x + (point.time / clip.duration) * width;
          const py = dbToYNonLinear(point.db, y, height);
          ctx.lineTo(px, py);
        });

        const lastPoint = visiblePoints[visiblePoints.length - 1];
        if (lastPoint.time < clip.duration) {
          ctx.lineTo(x + width, dbToYNonLinear(lastPoint.db, y, height));
        }
      }
    }

    ctx.stroke();

    // Draw control points (skip hidden ones)
    clip.envelopePoints.forEach((point, index) => {
      // Skip hidden points
      if (hiddenPointIndices.includes(index)) return;

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
    />
  );
}
