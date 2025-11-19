# @audacity-ui/components

UI component library for Audacity Design System.

## Installation

```bash
pnpm add @audacity-ui/components
```

## Components

### TrackControlPanel

A comprehensive track control panel component with volume slider, mute/solo buttons, and effects access.

**Features:**
- Track name display with microphone icon
- Record/meter indicator button
- Volume/pan slider
- Mute and Solo toggle buttons
- Effects button
- Menu access

**Usage:**

```tsx
import { TrackControlPanel } from '@audacity-ui/components';
import '@audacity-ui/components/style.css';

function App() {
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [isSolo, setIsSolo] = useState(false);

  return (
    <TrackControlPanel
      trackName="Mono track 1"
      trackType="mono"
      volume={volume}
      pan={0}
      isMuted={isMuted}
      isSolo={isSolo}
      onVolumeChange={setVolume}
      onMuteToggle={() => setIsMuted(!isMuted)}
      onSoloToggle={() => setIsSolo(!isSolo)}
      onEffectsClick={() => console.log('Effects clicked')}
      onMenuClick={() => console.log('Menu clicked')}
    />
  );
}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `trackName` | `string` | - | Name of the track (required) |
| `trackType` | `'mono' \| 'stereo'` | `'mono'` | Type of audio track |
| `volume` | `number` | `75` | Volume level (0-100) |
| `pan` | `number` | `0` | Pan position (-100 to 100) |
| `isMuted` | `boolean` | `false` | Mute state |
| `isSolo` | `boolean` | `false` | Solo state |
| `isRecording` | `boolean` | `false` | Recording state |
| `onVolumeChange` | `(volume: number) => void` | - | Volume change callback |
| `onPanChange` | `(pan: number) => void` | - | Pan change callback |
| `onMuteToggle` | `() => void` | - | Mute toggle callback |
| `onSoloToggle` | `() => void` | - | Solo toggle callback |
| `onRecordToggle` | `() => void` | - | Record toggle callback |
| `onEffectsClick` | `() => void` | - | Effects button callback |
| `onMenuClick` | `() => void` | - | Menu button callback |
| `className` | `string` | `''` | Additional CSS class |

## Development

```bash
# Build the package
pnpm build

# Watch mode for development
pnpm dev
```

## License

MIT
