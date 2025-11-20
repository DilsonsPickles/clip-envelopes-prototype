'use client';

import { ResizablePanel, TrackControlPanel } from '@audacity-ui/components';
import { Track } from './types';

interface ResizableTrackHeaderProps {
  track: Track;
  index: number;
  isSelected: boolean;
  isFocused: boolean;
  height: number;
  onSelect: () => void;
  onHeightChange: (newHeight: number) => void;
  isFirstTrack?: boolean;
}

export default function ResizableTrackHeader({
  track,
  index,
  isSelected,
  isFocused,
  height,
  onSelect,
  onHeightChange,
  isFirstTrack = false,
}: ResizableTrackHeaderProps) {
  // Determine which height variant to use for TrackControlPanel
  const getHeightVariant = (): 'default' | 'truncated' | 'collapsed' => {
    if (height < 44) return 'collapsed';
    if (height < 80) return 'truncated';
    return 'default';
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Focus border */}
      {isFocused && (
        <>
          <div style={{ position: 'absolute', top: '-2px', left: 0, right: 0, height: '2px', backgroundColor: '#84B5FF', zIndex: 10 }} />
          <div style={{ position: 'absolute', bottom: '-2px', left: 0, right: 0, height: '2px', backgroundColor: '#84B5FF', zIndex: 10 }} />
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '2px', backgroundColor: '#84B5FF', zIndex: 10 }} />
        </>
      )}

      <ResizablePanel
        initialHeight={height}
        minHeight={44}
        resizeEdge="bottom"
        resizeThreshold={8}
        onHeightChange={onHeightChange}
        isFirstPanel={isFirstTrack}
      >
        <div onClick={onSelect} style={{ height: '100%' }}>
          <TrackControlPanel
            trackName={track.name}
            height={getHeightVariant()}
            state={isSelected ? 'active' : 'idle'}
          />
        </div>
      </ResizablePanel>
    </div>
  );
}
