import { useCallback } from 'react';
import type { PlaybackState } from '../types/gpx';
import { formatDuration } from '../utils/gpxParser';

interface PlaybackControlsProps {
  playback: PlaybackState;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
  disabled: boolean;
}

const SPEED_OPTIONS = [0.5, 1, 2, 5, 10, 20, 50];

export default function PlaybackControls({
  playback,
  onTogglePlay,
  onSeek,
  onSpeedChange,
  onReset,
  disabled,
}: PlaybackControlsProps) {
  const { isPlaying, currentTime, speed, minTime, maxTime } = playback;
  const duration = maxTime - minTime;
  const progress = duration > 0 ? ((currentTime - minTime) / duration) * 100 : 0;

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      const time = minTime + (value / 100) * duration;
      onSeek(time);
    },
    [minTime, duration, onSeek]
  );

  const handleSpeedChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onSpeedChange(parseFloat(e.target.value));
    },
    [onSpeedChange]
  );

  const elapsed = currentTime - minTime;

  return (
    <div className={`playback-controls ${disabled ? 'disabled' : ''}`}>
      <div className="controls-row">
        <button
          className="control-btn reset-btn"
          onClick={onReset}
          disabled={disabled}
          title="Reset to start"
        >
          &#x21BA;
        </button>

        <button
          className="control-btn play-btn"
          onClick={onTogglePlay}
          disabled={disabled}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '&#10074;&#10074;' : '&#9658;'}
        </button>

        <div className="time-display">
          <span className="elapsed">{formatDuration(elapsed)}</span>
          <span className="separator">/</span>
          <span className="total">{formatDuration(duration)}</span>
        </div>

        <div className="speed-control">
          <label>Speed:</label>
          <select
            value={speed}
            onChange={handleSpeedChange}
            disabled={disabled}
          >
            {SPEED_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="timeline-row">
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={progress}
          onChange={handleSliderChange}
          disabled={disabled}
          className="timeline-slider"
        />
      </div>
    </div>
  );
}
