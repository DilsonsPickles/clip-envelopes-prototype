export interface Theme {
  // Main backgrounds
  canvas: string;
  toolbar: string;
  trackHeaderPanel: string;
  ruler: string;

  // Borders
  toolbarBorder: string;
  trackHeaderBorder: string;
  rulerBorder: string;

  // Track backgrounds (overlays on canvas)
  trackIdle: string;
  trackSelected: string;

  // Clip colors per track
  clipBackground: {
    track1: string;
    track2: string;
    track3: string;
    default: string;
  };

  clipHeader: {
    track1: string;
    track2: string;
    track3: string;
    default: string;
  };

  clipHeaderHover: {
    track1: string;
    track2: string;
    track3: string;
    default: string;
  };

  // Clip selected state
  clipBackgroundSelected: {
    track1: string;
    track2: string;
    track3: string;
    default: string;
  };

  clipHeaderSelected: {
    track1: string;
    track2: string;
    track3: string;
    default: string;
  };

  clipHeaderSelectedHover: {
    track1: string;
    track2: string;
    track3: string;
    default: string;
  };

  clipBorder: {
    normal: string;
    envelope: string;
  };

  clipBorderSelected: string;

  // Waveform
  waveform: string;
  waveformCenterLine: string;

  // Envelope
  envelopeLine: string;
  envelopeLineHover: string;
  envelopeFill: string;
  envelopeFillIdle: string; // When envelope mode is off
  envelopeHitZone: string;
  envelopePoint: string;
  envelopePointCenter: string;

  // Time selection
  timeSelection: string;
  timeSelectionBorder: string;

  // Text
  text: string;
  textInverted: string;

  // UI elements
  buttonBg: string;
  buttonBorder: string;
  buttonHoverBg: string;
  buttonHoverBorder: string;
  buttonActiveBg: string;
  buttonActiveBorder: string;
  buttonText: string;
  buttonActiveText: string;
}

export const lightTheme: Theme = {
  // Main backgrounds
  canvas: '#212433',
  toolbar: '#F9F9FA',
  trackHeaderPanel: '#E3E3E8',
  ruler: '#262932',

  // Borders
  toolbarBorder: '#e0e0e5',
  trackHeaderBorder: '#d0d0d5',
  rulerBorder: '#3B3E4B',

  // Track backgrounds (overlays on canvas)
  trackIdle: 'rgba(255, 255, 255, 0.05)',
  trackSelected: 'rgba(255, 255, 255, 0.1)',

  // Clip colors per track
  clipBackground: {
    track1: '#6DB9FF', // Blue body
    track2: '#C1BFFE',
    track3: '#ECA0D9', // Magenta body non-selected
    default: '#3a5a7a',
  },

  clipHeader: {
    track1: '#3FA8FF', // Blue header
    track2: '#ADABFC',
    track3: '#E787D0', // Magenta header
    default: '#2a3a4a',
  },

  clipHeaderHover: {
    track1: '#66A3FF',
    track2: '#9996FC',
    track3: '#DA8CCC',
    default: '#3a4a5a',
  },

  // Clip selected state
  clipBackgroundSelected: {
    track1: '#C0D9FF',
    track2: '#D5D3FE',
    track3: '#EFD1EA',
    default: '#5a7a9a',
  },

  clipHeaderSelected: {
    track1: '#DEEBFF',
    track2: '#E9E8FF',
    track3: '#F6E8F4',
    default: '#4a5a6a',
  },

  clipHeaderSelectedHover: {
    track1: '#F2F7FF',
    track2: '#F7F6FF',
    track3: '#FBF4FC',
    default: '#5a6a7a',
  },

  clipBorder: {
    normal: '#000000',
    envelope: '#000000',
  },

  clipBorderSelected: '#ffffff',

  // Waveform
  waveform: 'rgba(0, 0, 0, 0.7)',
  waveformCenterLine: '#4a4a4a',

  // Envelope
  envelopeLine: '#ff6600',
  envelopeLineHover: '#ffaa00',
  envelopeFill: 'rgba(255, 255, 255, 0.5)',
  envelopeFillIdle: 'rgba(255, 255, 255, 0.6)',
  envelopeHitZone: 'rgba(255, 102, 0, 0.15)',
  envelopePoint: '#ff6600',
  envelopePointCenter: '#fff',

  // Time selection
  timeSelection: 'rgba(255, 255, 255, 0.2)',
  timeSelectionBorder: '#ffffff',

  // Text
  text: '#14151A',
  textInverted: '#ffffff',

  // UI elements
  buttonBg: '#e0e0e5',
  buttonBorder: '#c0c0c5',
  buttonHoverBg: '#d0d0d5',
  buttonHoverBorder: '#b0b0b5',
  buttonActiveBg: '#4a7a9a',
  buttonActiveBorder: '#5a8aba',
  buttonText: '#333',
  buttonActiveText: '#fff',
};

export const darkTheme: Theme = {
  // Main backgrounds
  canvas: '#1a1a1a',
  toolbar: '#2a2a2a',
  trackHeaderPanel: '#2e2e2e',
  ruler: '#252525',

  // Borders
  toolbarBorder: '#3a3a3a',
  trackHeaderBorder: '#3a3a3a',
  rulerBorder: '#3a3a3a',

  // Track backgrounds (overlays on canvas)
  trackIdle: 'rgba(255, 255, 255, 0.03)',
  trackSelected: 'rgba(255, 255, 255, 0.08)',

  // Clip colors per track
  clipBackground: {
    track1: '#4a7a9a',
    track2: '#7a6a9a',
    track3: '#9a6a7a',
    default: '#3a5a7a',
  },

  clipHeader: {
    track1: '#3a6a8a',
    track2: '#6a5a8a',
    track3: '#8a5a6a',
    default: '#2a3a4a',
  },

  clipHeaderHover: {
    track1: '#4a7a9a',
    track2: '#7a6a9a',
    track3: '#9a6a7a',
    default: '#3a4a5a',
  },

  // Clip selected state (dark theme)
  clipBackgroundSelected: {
    track1: '#5a8aba',
    track2: '#8a7aba',
    track3: '#aa7a9a',
    default: '#6a8aaa',
  },

  clipHeaderSelected: {
    track1: '#4a7aaa',
    track2: '#7a6aaa',
    track3: '#9a6a8a',
    default: '#5a7a9a',
  },

  clipHeaderSelectedHover: {
    track1: '#5a8aba',
    track2: '#8a7aba',
    track3: '#aa7a9a',
    default: '#6a8aaa',
  },

  clipBorder: {
    normal: '#5a8aba',
    envelope: '#6a6a8a',
  },

  clipBorderSelected: '#ffffff',

  // Waveform
  waveform: 'rgba(255, 255, 255, 0.7)',
  waveformCenterLine: '#4a4a4a',

  // Envelope
  envelopeLine: '#ff6600',
  envelopeLineHover: '#ffaa00',
  envelopeFill: 'rgba(255, 255, 255, 0.5)',
  envelopeFillIdle: 'rgba(255, 255, 255, 0.6)',
  envelopeHitZone: 'rgba(255, 102, 0, 0.15)',
  envelopePoint: '#ff6600',
  envelopePointCenter: '#fff',

  // Time selection
  timeSelection: 'rgba(255, 255, 255, 0.2)',
  timeSelectionBorder: '#ffffff',

  // Text
  text: '#e0e0e0',
  textInverted: '#1a1a1a',

  // UI elements
  buttonBg: '#3a3a3a',
  buttonBorder: '#4a4a4a',
  buttonHoverBg: '#4a4a4a',
  buttonHoverBorder: '#5a5a5a',
  buttonActiveBg: '#4a7a9a',
  buttonActiveBorder: '#5a8aba',
  buttonText: '#ccc',
  buttonActiveText: '#fff',
};

// Default theme
export const theme = lightTheme;
