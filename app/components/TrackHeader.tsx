'use client';

import { useState } from 'react';
import { theme } from '../theme';

interface TrackHeaderProps {
  trackName: string;
  isSelected?: boolean;
  onSelect?: () => void;
}

export default function TrackHeader({ trackName, isSelected = false, onSelect }: TrackHeaderProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getBackgroundColor = () => {
    if (isSelected) return '#F8F8F9';
    if (isHovered) return '#F2F2F7';
    return '#EEEEF1';
  };

  return (
    <div
      className="h-[114px] p-3 flex flex-col mb-[2px] transition-colors cursor-pointer"
      style={{ backgroundColor: getBackgroundColor() }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
    >
      {/* Row 1: Icon, Track name, Ellipsis button */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-5 h-5 flex items-center justify-center text-sm"
          style={{ color: theme.text }}
        >
          🎵
        </div>
        <h3 className="text-sm font-medium flex-1" style={{ color: theme.text }}>
          {trackName}
        </h3>
        <button
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/10 transition-colors"
          style={{ color: theme.text, fontSize: '16px' }}
          onClick={(e) => e.stopPropagation()}
        >
          ⋯
        </button>
      </div>

      {/* Row 2: Pan knob, Volume slider, Mute/Solo buttons */}
      <div className="flex items-center mb-2">
        {/* Pan knob placeholder */}
        <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs" style={{ borderColor: theme.trackHeaderBorder }}>
          ⟳
        </div>

        {/* 8px gap */}
        <div className="w-2" />

        {/* Volume slider placeholder */}
        <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: theme.trackHeaderBorder }}>
          <div className="w-3/4 h-full rounded-full" style={{ backgroundColor: '#CDCED7' }}></div>
        </div>

        {/* 8px gap */}
        <div className="w-2" />

        {/* Mute button */}
        <button
          className="w-5 h-5 flex items-center justify-center text-xs rounded border"
          style={{
            backgroundColor: '#CDCED7',
            borderColor: theme.trackHeaderBorder,
            color: theme.text,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          M
        </button>

        {/* 4px gap */}
        <div className="w-1" />

        {/* Solo button */}
        <button
          className="w-5 h-5 flex items-center justify-center text-xs rounded border"
          style={{
            backgroundColor: '#CDCED7',
            borderColor: theme.trackHeaderBorder,
            color: theme.text,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          S
        </button>
      </div>

      <div className="flex-1" />

      {/* Effects button */}
      <button
        className="w-full h-6 px-3 text-sm rounded border flex items-center justify-center"
        style={{
          backgroundColor: '#CDCED7',
          borderColor: theme.trackHeaderBorder,
          color: theme.text,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        Effects
      </button>
    </div>
  );
}
