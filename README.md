# Audacity Clip Envelope Prototype

A Next.js prototype demonstrating clip envelope editing for Audacity.

## Features

- **Multi-track canvas** with draggable clips
- **Clip envelope editing** with visual control points
- **Real-time waveform gain visualization**
- **Time selection** across single or multiple tracks
- **Track selection** with visual feedback
- **Envelope visualization** with translucent fill showing applied gain

## Getting Started

```bash
cd clip-envelope
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the prototype.

## Usage

### Basic Operations
- **Click and drag** on empty space to create a time selection
- **Drag vertically** across tracks to select multiple tracks
- **Click on a clip header** to select the clip and create a time selection matching its duration
- **Drag a clip header** to move the clip horizontally or between tracks

### Envelope Editing
1. Click the "Clip Envelopes" button in the toolbar to enable envelope mode
2. **Click near the envelope line** (within 16px) to create control points
3. **Click and drag control points** to adjust gain (-60dB to +12dB)
4. **Click on a control point** without dragging to delete it
5. **Dragging a point past another** point deletes the crossed point
6. The waveform updates in real-time to show the applied gain
7. Envelope changes persist when switching off envelope mode

## Technologies

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- HTML Canvas for rendering

## License

This is a prototype for Audacity development.
