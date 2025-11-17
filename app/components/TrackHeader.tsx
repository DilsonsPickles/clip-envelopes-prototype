'use client';

import { theme } from '../theme';

interface TrackHeaderProps {
  trackName: string;
}

export default function TrackHeader({ trackName }: TrackHeaderProps) {
  return (
    <div
      className="h-[150px] p-2 flex flex-col border-b"
      style={{ borderColor: theme.trackHeaderBorder }}
    >
      <h3 className="text-sm font-medium mb-2" style={{ color: theme.text }}>
        {trackName}
      </h3>
      <div className="flex gap-2 mt-auto">
        <button
          className="px-2 py-1 text-xs rounded border"
          style={{
            backgroundColor: theme.buttonBg,
            borderColor: theme.buttonBorder,
            color: theme.buttonText,
          }}
        >
          M
        </button>
        <button
          className="px-2 py-1 text-xs rounded border"
          style={{
            backgroundColor: theme.buttonBg,
            borderColor: theme.buttonBorder,
            color: theme.buttonText,
          }}
        >
          S
        </button>
      </div>
    </div>
  );
}
