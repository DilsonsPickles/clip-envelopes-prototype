'use client';

import { theme } from '../theme';

interface ToolbarProps {
  envelopeMode: boolean;
  onToggleEnvelope: () => void;
}

export default function Toolbar({ envelopeMode, onToggleEnvelope }: ToolbarProps) {
  return (
    <div
      className="h-[50px] flex items-center px-4 gap-2"
      style={{
        backgroundColor: theme.toolbar,
        borderBottom: `1px solid ${theme.toolbarBorder}`
      }}
    >
      <button
        onClick={onToggleEnvelope}
        className="flex items-center gap-2 px-4 py-2 rounded border transition-all"
        style={{
          backgroundColor: envelopeMode ? theme.buttonActiveBg : theme.buttonBg,
          borderColor: envelopeMode ? theme.buttonActiveBorder : theme.buttonBorder,
          color: envelopeMode ? theme.buttonActiveText : theme.buttonText,
        }}
        onMouseEnter={(e) => {
          if (!envelopeMode) {
            e.currentTarget.style.backgroundColor = theme.buttonHoverBg;
            e.currentTarget.style.borderColor = theme.buttonHoverBorder;
          }
        }}
        onMouseLeave={(e) => {
          if (!envelopeMode) {
            e.currentTarget.style.backgroundColor = theme.buttonBg;
            e.currentTarget.style.borderColor = theme.buttonBorder;
          }
        }}
      >
        <i className="fas fa-wave-square text-base"></i>
        <span className="text-sm">Clip Envelopes</span>
      </button>
    </div>
  );
}
