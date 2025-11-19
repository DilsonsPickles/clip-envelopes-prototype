import React from 'react';
import './TrackControlPanel.css';

export interface TrackControlPanelProps {
  trackName: string;
  trackType?: 'mono' | 'stereo';
  volume?: number; // 0-100
  pan?: number; // -100 to 100
  isMuted?: boolean;
  isSolo?: boolean;
  isRecording?: boolean;
  onVolumeChange?: (volume: number) => void;
  onPanChange?: (pan: number) => void;
  onMuteToggle?: () => void;
  onSoloToggle?: () => void;
  onRecordToggle?: () => void;
  onEffectsClick?: () => void;
  onMenuClick?: () => void;
  className?: string;
}

export const TrackControlPanel: React.FC<TrackControlPanelProps> = ({
  trackName,
  trackType = 'mono',
  volume = 75,
  pan = 0,
  isMuted = false,
  isSolo = false,
  isRecording = false,
  onVolumeChange,
  onPanChange,
  onMuteToggle,
  onSoloToggle,
  onRecordToggle,
  onEffectsClick,
  onMenuClick,
  className = '',
}) => {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    onVolumeChange?.(value);
  };

  return (
    <div className={`track-control-panel ${className}`}>
      {/* Header */}
      <div className="track-control-header">
        <div className="track-name">
          <svg
            className="track-icon"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z"
              fill="currentColor"
            />
            <path
              d="M17 11C17 14.31 14.31 17 11 17C7.69 17 5 14.31 5 11H3C3 15.42 6.58 19 11 19V22H13V19C17.42 19 21 15.42 21 11H19C19 14.31 16.31 17 13 17C9.69 17 7 14.31 7 11H17Z"
              fill="currentColor"
            />
          </svg>
          <span className="track-name-text">{trackName}</span>
        </div>
        <button
          className="track-menu-button"
          onClick={onMenuClick}
          aria-label="Track menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="6" r="2" fill="currentColor" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            <circle cx="12" cy="18" r="2" fill="currentColor" />
          </svg>
        </button>
      </div>

      {/* Controls Row */}
      <div className="track-controls-row">
        {/* Record/Meter Button */}
        <button
          className={`record-button ${isRecording ? 'recording' : ''}`}
          onClick={onRecordToggle}
          aria-label="Record"
        >
          <div className="record-meter">
            <div className="meter-indicator" />
          </div>
        </button>

        {/* Volume/Pan Slider */}
        <div className="slider-container">
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleSliderChange}
            className="volume-slider"
            aria-label="Volume"
          />
          <div className="slider-track">
            <div
              className="slider-fill"
              style={{ width: `${volume}%` }}
            />
          </div>
        </div>

        {/* Mute Button */}
        <button
          className={`toggle-button mute-button ${isMuted ? 'active' : ''}`}
          onClick={onMuteToggle}
          aria-label="Mute"
        >
          M
        </button>

        {/* Solo Button */}
        <button
          className={`toggle-button solo-button ${isSolo ? 'active' : ''}`}
          onClick={onSoloToggle}
          aria-label="Solo"
        >
          S
        </button>
      </div>

      {/* Effects Button */}
      <button className="effects-button" onClick={onEffectsClick}>
        Effects
      </button>
    </div>
  );
};

export default TrackControlPanel;
