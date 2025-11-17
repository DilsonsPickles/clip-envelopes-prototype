'use client';

interface TooltipProps {
  x: number;
  y: number;
  db: number;
  visible: boolean;
}

export default function Tooltip({ x, y, db, visible }: TooltipProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed pointer-events-none z-50 bg-black/90 text-white px-2 py-1 rounded text-xs font-mono"
      style={{
        left: x + 10,
        top: y - 25,
      }}
    >
      {db === -Infinity ? '-∞ dB' : `${db >= 0 ? '+' : ''}${db.toFixed(1)} dB`}
    </div>
  );
}
