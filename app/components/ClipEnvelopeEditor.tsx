'use client';

import { useEffect, useRef, useState } from 'react';
import Toolbar from './Toolbar';
import TrackHeader from './TrackHeader';
import Ruler from './Ruler';
import TrackCanvas from './TrackCanvas';
import TimelineRuler from './TimelineRuler';
import Tooltip from './Tooltip';
import { Track, Clip, EnvelopePoint, DragState, EnvelopeDragState, TimeSelection, TimeSelectionDragState } from './types';
import { theme } from '../theme';

// Configuration
const TRACK_HEIGHT = 150;
const TRACK_GAP = 2;
const PIXELS_PER_SECOND = 100;
const CANVAS_WIDTH = 2000;
const CLIP_HEADER_HEIGHT = 20;
const LEFT_PADDING = 12;

export default function ClipEnvelopeEditor() {
  const [envelopeMode, setEnvelopeMode] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrackIndices, setSelectedTrackIndices] = useState<number[]>([]);
  const [timeSelection, setTimeSelection] = useState<TimeSelection | null>(null);
  const [hoveredClipHeader, setHoveredClipHeader] = useState<{ clipId: number; trackIndex: number } | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; db: number; visible: boolean }>({
    x: 0,
    y: 0,
    db: 0,
    visible: false,
  });
  const dragStateRef = useRef<DragState | null>(null);
  const envelopeDragStateRef = useRef<EnvelopeDragState | null>(null);
  const timeSelectionDragStateRef = useRef<TimeSelectionDragState | null>(null);

  // Initialize tracks with sample clips
  useEffect(() => {
    let clipIdCounter = 1;

    const generateWaveform = (duration: number): number[] => {
      const sampleCount = Math.floor(duration * 50000); // Very high sample count for solid waveform appearance
      const waveform: number[] = [];

      for (let i = 0; i < sampleCount; i++) {
        const t = i / sampleCount;

        // Create envelope variation that mimics speech patterns
        // Speech has bursts of activity with varying amplitude
        const speechEnvelope =
          Math.abs(Math.sin(t * Math.PI * 3 + Math.random() * 0.5)) * // Syllable-like patterns
          (0.3 + Math.abs(Math.sin(t * Math.PI * 0.5)) * 0.7) * // Sentence-level variation
          (0.5 + Math.random() * 0.5); // Random variation

        // High-frequency content (voice formants)
        const voiceContent =
          Math.sin(t * Math.PI * 200 + Math.random() * 2) * 0.4 +
          Math.sin(t * Math.PI * 500 + Math.random() * 3) * 0.3 +
          Math.sin(t * Math.PI * 1200 + Math.random() * 5) * 0.2 +
          (Math.random() - 0.5) * 0.3; // Noise for breathiness

        const value = voiceContent * speechEnvelope;
        waveform.push(Math.max(-1, Math.min(1, value)));
      }

      return waveform;
    };

    const createClip = (id: number, name: string, startTime: number, duration: number): Clip => ({
      id,
      name,
      startTime,
      duration,
      waveform: generateWaveform(duration),
      envelopePoints: [],
    });

    const initialTracks: Track[] = [
      {
        id: 1,
        name: 'Track 1',
        clips: [
          createClip(clipIdCounter++, 'Vocals', 0.5, 2.0),
          createClip(clipIdCounter++, 'Harmony', 3.0, 1.5),
        ],
      },
      {
        id: 2,
        name: 'Track 2',
        clips: [
          createClip(clipIdCounter++, 'Bass', 0.2, 1.2),
          createClip(clipIdCounter++, 'Synth', 2.0, 2.5),
          createClip(clipIdCounter++, 'Lead', 5.0, 1.0),
        ],
      },
      {
        id: 3,
        name: 'Track 3',
        clips: [
          createClip(clipIdCounter++, 'Drums', 1.0, 3.0),
          createClip(clipIdCounter++, 'Percussion', 5.5, 1.5),
        ],
      },
    ];

    setTracks(initialTracks);
  }, []);

  const handleToggleEnvelope = () => {
    setEnvelopeMode(!envelopeMode);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Determine which track was clicked
    const clickedTrackIndex = Math.floor(y / (TRACK_HEIGHT + TRACK_GAP));
    if (clickedTrackIndex >= 0 && clickedTrackIndex < tracks.length) {
      setSelectedTrackIndices([clickedTrackIndex]);
    }

    // Check for clip header dragging (works in both modes)
    for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
      const track = tracks[trackIndex];
      const trackY = trackIndex * (TRACK_HEIGHT + TRACK_GAP);

      if (y < trackY || y > trackY + TRACK_HEIGHT) continue;

      for (const clip of track.clips) {
        const clipX = LEFT_PADDING + clip.startTime * PIXELS_PER_SECOND;
        const clipWidth = clip.duration * PIXELS_PER_SECOND;
        const clipHeaderY = trackY;

        // Only allow dragging if clicking on the header
        if (x >= clipX && x <= clipX + clipWidth && y >= clipHeaderY && y <= clipHeaderY + CLIP_HEADER_HEIGHT) {
          // Select the clip
          const newTracks = [...tracks];
          newTracks.forEach((track) => {
            track.clips.forEach((c) => {
              c.selected = c.id === clip.id;
            });
          });
          setTracks(newTracks);

          // Set time selection to the clip's duration
          setTimeSelection({
            startTime: clip.startTime,
            endTime: clip.startTime + clip.duration,
          });

          dragStateRef.current = {
            clip,
            trackIndex,
            offsetX: x - clipX,
            initialX: x,
            initialTrackIndex: trackIndex,
          };
          canvas.style.cursor = 'grabbing';
          return;
        }
      }
    }

    // Check for envelope point interaction (envelope mode only)
    if (envelopeMode) {
      const envelopeInteraction = handleEnvelopeClick(x, y);
      if (envelopeInteraction) {
        // Don't start time selection if we're interacting with envelope
        return;
      }
    }

    // Start time selection if clicking anywhere else
    timeSelectionDragStateRef.current = {
      startX: x,
      currentX: x,
      startTrackIndex: clickedTrackIndex,
    };
    setTimeSelection(null);
  };

  const handleEnvelopeClick = (x: number, y: number): boolean => {
    const CLICK_THRESHOLD = 15;

    const dbToY = (db: number, trackY: number, height: number) => {
      const minDb = -60;
      const maxDb = 12;
      const normalized = (db - minDb) / (maxDb - minDb);
      return trackY + height - normalized * height;
    };

    const yToDb = (y: number, trackY: number, height: number) => {
      const minDb = -60;
      const maxDb = 12;
      const normalized = (trackY + height - y) / height;
      return minDb + normalized * (maxDb - minDb);
    };

    for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
      const track = tracks[trackIndex];
      const trackY = trackIndex * (TRACK_HEIGHT + TRACK_GAP);

      if (y < trackY || y > trackY + TRACK_HEIGHT) continue;

      for (const clip of track.clips) {
        const clipX = LEFT_PADDING + clip.startTime * PIXELS_PER_SECOND;
        const clipWidth = clip.duration * PIXELS_PER_SECOND;
        const clipY = trackY + CLIP_HEADER_HEIGHT;
        const clipHeight = TRACK_HEIGHT - CLIP_HEADER_HEIGHT;

        if (x >= clipX && x <= clipX + clipWidth) {
          // Check for existing point
          for (let i = 0; i < clip.envelopePoints.length; i++) {
            const point = clip.envelopePoints[i];
            const px = clipX + (point.time / clip.duration) * clipWidth;
            const py = dbToY(point.db, clipY, clipHeight);

            const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
            if (distance <= CLICK_THRESHOLD) {
              envelopeDragStateRef.current = {
                clip,
                pointIndex: i,
                trackIndex,
                clipX,
                clipWidth,
                clipY,
                clipHeight,
                startX: x,
                startY: y,
                deletedPoints: [],
                originalTime: point.time,
              };
              return true;
            }
          }

          // Create new point only if clicking within 16px of the envelope curve
          // Calculate distance from click point to the nearest point on the envelope line

          // Helper function to calculate distance from point to line segment
          const distanceToLineSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
            const A = px - x1;
            const B = py - y1;
            const C = x2 - x1;
            const D = y2 - y1;

            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            let param = -1;

            if (lenSq !== 0) {
              param = dot / lenSq;
            }

            let xx, yy;

            if (param < 0) {
              xx = x1;
              yy = y1;
            } else if (param > 1) {
              xx = x2;
              yy = y2;
            } else {
              xx = x1 + param * C;
              yy = y1 + param * D;
            }

            const dx = px - xx;
            const dy = py - yy;
            return Math.sqrt(dx * dx + dy * dy);
          };

          // Build the envelope line segments
          const buildEnvelopeSegments = (): Array<{x1: number, y1: number, x2: number, y2: number}> => {
            const segments: Array<{x1: number, y1: number, x2: number, y2: number}> = [];

            if (clip.envelopePoints.length === 0) {
              // Default 0dB line
              const y0 = dbToY(0, clipY, clipHeight);
              segments.push({
                x1: clipX,
                y1: y0,
                x2: clipX + clipWidth,
                y2: y0
              });
            } else {
              const points = clip.envelopePoints;

              // Segment from clip start to first point
              const startY = points[0].time === 0 ? dbToY(points[0].db, clipY, clipHeight) : dbToY(0, clipY, clipHeight);
              const firstPointX = clipX + (points[0].time / clip.duration) * clipWidth;
              const firstPointY = dbToY(points[0].db, clipY, clipHeight);

              if (points[0].time > 0) {
                segments.push({
                  x1: clipX,
                  y1: startY,
                  x2: firstPointX,
                  y2: firstPointY
                });
              }

              // Segments between points
              for (let i = 0; i < points.length - 1; i++) {
                const p1x = clipX + (points[i].time / clip.duration) * clipWidth;
                const p1y = dbToY(points[i].db, clipY, clipHeight);
                const p2x = clipX + (points[i + 1].time / clip.duration) * clipWidth;
                const p2y = dbToY(points[i + 1].db, clipY, clipHeight);

                segments.push({ x1: p1x, y1: p1y, x2: p2x, y2: p2y });
              }

              // Segment from last point to clip end
              const lastPoint = points[points.length - 1];
              if (lastPoint.time < clip.duration) {
                const lastPointX = clipX + (lastPoint.time / clip.duration) * clipWidth;
                const lastPointY = dbToY(lastPoint.db, clipY, clipHeight);
                segments.push({
                  x1: lastPointX,
                  y1: lastPointY,
                  x2: clipX + clipWidth,
                  y2: lastPointY
                });
              }
            }

            return segments;
          };

          const segments = buildEnvelopeSegments();
          let minDistance = Infinity;

          for (const segment of segments) {
            const dist = distanceToLineSegment(x, y, segment.x1, segment.y1, segment.x2, segment.y2);
            minDistance = Math.min(minDistance, dist);
          }

          if (minDistance <= 16) {
            const relativeTime = ((x - clipX) / clipWidth) * clip.duration;
            const db = yToDb(y, clipY, clipHeight);
            const newPoint: EnvelopePoint = { time: relativeTime, db };
            const newTracks = [...tracks];
            newTracks[trackIndex].clips = newTracks[trackIndex].clips.map((c) =>
              c.id === clip.id
                ? {
                    ...c,
                    envelopePoints: [...c.envelopePoints, newPoint].sort(
                      (a, b) => a.time - b.time
                    ),
                  }
                : c
            );

            setTracks(newTracks);

            // Immediately start dragging the newly created point
            const updatedClip = newTracks[trackIndex].clips.find((c) => c.id === clip.id);
            if (updatedClip) {
              const newPointIndex = updatedClip.envelopePoints.findIndex(
                p => p.time === relativeTime && p.db === db
              );
              if (newPointIndex !== -1) {
                envelopeDragStateRef.current = {
                  clip: updatedClip,
                  pointIndex: newPointIndex,
                  trackIndex,
                  clipX,
                  clipWidth,
                  clipY,
                  clipHeight,
                  startX: x,
                  startY: y,
                  deletedPoints: [],
                  originalTime: relativeTime,
                };
              }
            }

            return true;
          }
        }
      }
    }

    return false;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle time selection dragging
    if (timeSelectionDragStateRef.current) {
      timeSelectionDragStateRef.current.currentX = x;

      const startTime = (timeSelectionDragStateRef.current.startX - LEFT_PADDING) / PIXELS_PER_SECOND;
      const endTime = (x - LEFT_PADDING) / PIXELS_PER_SECOND;

      setTimeSelection({
        startTime: Math.min(startTime, endTime),
        endTime: Math.max(startTime, endTime),
      });

      // Update selected tracks based on drag range
      const currentTrackIndex = Math.floor(y / (TRACK_HEIGHT + TRACK_GAP));
      const startTrackIndex = timeSelectionDragStateRef.current.startTrackIndex;
      const minTrack = Math.max(0, Math.min(startTrackIndex, currentTrackIndex));
      const maxTrack = Math.min(tracks.length - 1, Math.max(startTrackIndex, currentTrackIndex));

      const selectedTracks: number[] = [];
      for (let i = minTrack; i <= maxTrack; i++) {
        selectedTracks.push(i);
      }
      setSelectedTrackIndices(selectedTracks);

      return;
    }

    // Handle envelope point dragging
    if (envelopeDragStateRef.current) {
      const { clip, pointIndex, clipX, clipWidth, clipY, clipHeight, trackIndex } =
        envelopeDragStateRef.current;

      const yToDb = (y: number, trackY: number, height: number) => {
        const minDb = -60;
        const maxDb = 12;
        const normalized = (trackY + height - y) / height;
        return Math.max(minDb, Math.min(maxDb, minDb + normalized * (maxDb - minDb)));
      };

      const relativeTime = Math.max(0, Math.min(clip.duration, ((x - clipX) / clipWidth) * clip.duration));
      const db = yToDb(y, clipY, clipHeight);

      // Show tooltip with dB value
      setTooltip({
        x: e.clientX,
        y: e.clientY,
        db,
        visible: true,
      });

      const newTracks = [...tracks];
      const targetClip = newTracks[trackIndex].clips.find((c) => c.id === clip.id);
      if (targetClip && envelopeDragStateRef.current) {
        const { originalTime, deletedPoints } = envelopeDragStateRef.current;

        // Check which deleted points should be restored
        const pointsToRestore: EnvelopePoint[] = [];
        const stillDeletedPoints: EnvelopePoint[] = [];

        deletedPoints.forEach((deletedPoint) => {
          // A point should be restored if it's no longer between originalTime and relativeTime
          const minTime = Math.min(originalTime, relativeTime);
          const maxTime = Math.max(originalTime, relativeTime);

          const isBetween = deletedPoint.time > minTime && deletedPoint.time < maxTime;

          if (!isBetween) {
            // No longer crossed, restore it
            pointsToRestore.push(deletedPoint);
          } else {
            // Still crossed, keep it deleted
            stillDeletedPoints.push(deletedPoint);
          }
        });

        // Restore points that are no longer crossed
        pointsToRestore.forEach((point) => {
          targetClip.envelopePoints.push(point);
        });

        // Update the point position
        targetClip.envelopePoints[pointIndex] = { time: relativeTime, db };

        // Check if we're crossing any new points
        const pointsToDelete: { index: number; point: EnvelopePoint }[] = [];

        for (let i = 0; i < targetClip.envelopePoints.length; i++) {
          if (i === pointIndex) continue;

          const otherPoint = targetClip.envelopePoints[i];

          // If we moved right and crossed a point on the right, delete it
          if (relativeTime > originalTime && otherPoint.time > originalTime && otherPoint.time <= relativeTime) {
            // Only delete if not already in deletedPoints
            if (!stillDeletedPoints.some(p => p.time === otherPoint.time && p.db === otherPoint.db)) {
              pointsToDelete.push({ index: i, point: otherPoint });
            }
          }
          // If we moved left and crossed a point on the left, delete it
          else if (relativeTime < originalTime && otherPoint.time < originalTime && otherPoint.time >= relativeTime) {
            // Only delete if not already in deletedPoints
            if (!stillDeletedPoints.some(p => p.time === otherPoint.time && p.db === otherPoint.db)) {
              pointsToDelete.push({ index: i, point: otherPoint });
            }
          }
        }

        // Delete newly crossed points (in reverse order to maintain indices)
        pointsToDelete.sort((a, b) => b.index - a.index).forEach(({ index, point }) => {
          targetClip.envelopePoints.splice(index, 1);
          stillDeletedPoints.push(point);
          // Adjust pointIndex if we deleted points before it
          if (index < pointIndex) {
            envelopeDragStateRef.current!.pointIndex--;
          }
        });

        // Update the deleted points list
        envelopeDragStateRef.current.deletedPoints = stillDeletedPoints;

        targetClip.envelopePoints.sort((a, b) => a.time - b.time);
        setTracks(newTracks);
      }

      return;
    }

    if (!dragStateRef.current) {
      updateCursor(canvas, x, y);
      return;
    }

    // Update clip position
    const newStartTime = Math.max(0, (x - dragStateRef.current.offsetX - LEFT_PADDING) / PIXELS_PER_SECOND);
    const newTrackIndex = Math.floor(y / (TRACK_HEIGHT + TRACK_GAP));

    const newTracks = [...tracks];
    const { clip, trackIndex } = dragStateRef.current;

    if (
      newTrackIndex >= 0 &&
      newTrackIndex < tracks.length &&
      newTrackIndex !== trackIndex
    ) {
      // Move to different track
      newTracks[trackIndex].clips = newTracks[trackIndex].clips.filter((c) => c.id !== clip.id);
      newTracks[newTrackIndex].clips.push({ ...clip, startTime: newStartTime });
      dragStateRef.current.trackIndex = newTrackIndex;
      // Update selected track when clip moves to a different track
      setSelectedTrackIndices([newTrackIndex]);
    } else {
      // Update in same track
      newTracks[trackIndex].clips = newTracks[trackIndex].clips.map((c) =>
        c.id === clip.id ? { ...c, startTime: newStartTime } : c
      );
    }

    // Update time selection to follow the clip
    if (timeSelection) {
      setTimeSelection({
        startTime: newStartTime,
        endTime: newStartTime + clip.duration,
      });
    }

    setTracks(newTracks);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;

    // End time selection
    if (timeSelectionDragStateRef.current) {
      timeSelectionDragStateRef.current = null;
      return;
    }

    if (envelopeDragStateRef.current) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const distance = Math.sqrt(
        (x - envelopeDragStateRef.current.startX) ** 2 +
          (y - envelopeDragStateRef.current.startY) ** 2
      );

      // If no movement, delete the point
      if (distance < 3) {
        const { clip, pointIndex, trackIndex } = envelopeDragStateRef.current;
        const newTracks = [...tracks];
        const targetClip = newTracks[trackIndex].clips.find((c) => c.id === clip.id);
        if (targetClip) {
          targetClip.envelopePoints.splice(pointIndex, 1);
          setTracks(newTracks);
        }
      }

      // Hide tooltip
      setTooltip({ ...tooltip, visible: false });

      envelopeDragStateRef.current = null;
      return;
    }

    if (dragStateRef.current) {
      dragStateRef.current = null;
      canvas.style.cursor = 'default';
    }
  };

  const updateCursor = (canvas: HTMLCanvasElement, x: number, y: number) => {
    let overClipHeader = false;
    let foundHoveredHeader: { clipId: number; trackIndex: number } | null = null;

    for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
      const track = tracks[trackIndex];
      const trackY = trackIndex * (TRACK_HEIGHT + TRACK_GAP);

      if (y < trackY || y > trackY + TRACK_HEIGHT) continue;

      for (const clip of track.clips) {
        const clipX = LEFT_PADDING + clip.startTime * PIXELS_PER_SECOND;
        const clipWidth = clip.duration * PIXELS_PER_SECOND;
        const clipHeaderY = trackY;

        if (x >= clipX && x <= clipX + clipWidth && y >= clipHeaderY && y <= clipHeaderY + CLIP_HEADER_HEIGHT) {
          overClipHeader = true;
          foundHoveredHeader = { clipId: clip.id, trackIndex };
          break;
        }
      }
      if (overClipHeader) break;
    }

    // Update hovered clip header state
    if (foundHoveredHeader) {
      if (!hoveredClipHeader || hoveredClipHeader.clipId !== foundHoveredHeader.clipId || hoveredClipHeader.trackIndex !== foundHoveredHeader.trackIndex) {
        setHoveredClipHeader(foundHoveredHeader);
      }
    } else if (hoveredClipHeader) {
      setHoveredClipHeader(null);
    }

    canvas.style.cursor = overClipHeader ? 'grab' : 'default';
  };

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: theme.canvas }}>
      <Toolbar envelopeMode={envelopeMode} onToggleEnvelope={handleToggleEnvelope} />

      <div className="flex flex-1 overflow-hidden">
        {/* Track headers */}
        <div
          className="w-[200px] border-r flex flex-col"
          style={{
            backgroundColor: theme.trackHeaderPanel,
            borderColor: theme.trackHeaderBorder,
          }}
        >
          {/* Track header panel */}
          <div
            className="h-[40px] flex items-center justify-between px-3 border-b"
            style={{
              borderColor: theme.trackHeaderBorder,
            }}
          >
            <span
              className="font-medium text-sm"
              style={{ color: theme.text }}
            >
              Tracks
            </span>
            <button
              className="h-[28px] px-3 text-sm rounded border"
              style={{
                backgroundColor: theme.toolbar,
                color: theme.text,
                borderColor: theme.trackHeaderBorder,
              }}
              onClick={() => {
                const newTrack: Track = {
                  id: tracks.length + 1,
                  name: `Track ${tracks.length + 1}`,
                  clips: [],
                };
                setTracks([...tracks, newTrack]);
              }}
            >
              Add track
            </button>
          </div>

          {/* Track list */}
          <div className="flex-1 overflow-y-auto">
            {tracks.map((track) => (
              <TrackHeader key={track.id} trackName={track.name} />
            ))}
          </div>
        </div>

        {/* Canvas container */}
        <div className="flex-1 overflow-auto relative flex flex-col">
          {/* Timeline ruler */}
          <div className="sticky top-0 z-10">
            <TimelineRuler
              canvasWidth={CANVAS_WIDTH}
              pixelsPerSecond={PIXELS_PER_SECOND}
              height={40}
              leftPadding={12}
              timeSelection={timeSelection}
            />
          </div>

          {/* Track canvas */}
          <TrackCanvas
            tracks={tracks}
            envelopeMode={envelopeMode}
            trackHeight={TRACK_HEIGHT}
            pixelsPerSecond={PIXELS_PER_SECOND}
            canvasWidth={CANVAS_WIDTH}
            selectedTrackIndices={selectedTrackIndices}
            timeSelection={timeSelection}
            hoveredClipHeader={hoveredClipHeader}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
        </div>

        {/* Rulers (fixed on right) */}
        <div
          className="fixed right-0 top-[50px] w-[50px] h-[calc(100vh-50px)] pointer-events-none z-10 border-l"
          style={{
            backgroundColor: theme.ruler,
            borderColor: theme.rulerBorder,
            paddingTop: '40px',
          }}
        >
          {tracks.map((track) => (
            <Ruler key={track.id} />
          ))}
        </div>
      </div>

      {/* Tooltip */}
      <Tooltip x={tooltip.x} y={tooltip.y} db={tooltip.db} visible={tooltip.visible} />
    </div>
  );
}
