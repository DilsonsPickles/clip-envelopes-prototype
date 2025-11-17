export interface EnvelopePoint {
  time: number;
  db: number;
}

export interface Clip {
  id: number;
  name: string;
  startTime: number;
  duration: number;
  waveform: number[];
  envelopePoints: EnvelopePoint[];
  selected?: boolean;
}

export interface Track {
  id: number;
  name: string;
  clips: Clip[];
}

export interface DragState {
  clip: Clip;
  trackIndex: number;
  offsetX: number;
  initialX: number;
  initialTrackIndex: number;
}

export interface EnvelopeDragState {
  clip: Clip;
  pointIndex: number;
  trackIndex: number;
  clipX: number;
  clipWidth: number;
  clipY: number;
  clipHeight: number;
  startX: number;
  startY: number;
  deletedPoints: EnvelopePoint[];
  originalTime: number;
  isNewPoint?: boolean; // Track if this point was just created
  hiddenPointIndices: number[]; // Indices of points hidden because dragged point passed them
}

export interface TimeSelection {
  startTime: number;
  endTime: number;
}

export interface TimeSelectionDragState {
  startX: number;
  currentX: number;
  startTrackIndex: number;
}
