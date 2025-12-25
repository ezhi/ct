import { useMemo } from 'react';
import type { TrackPosition } from '../types/gpx';
import { calculateDistanceBetweenPoints, formatDistance } from '../utils/gpxParser';

interface GapDisplayProps {
  positions: TrackPosition[];
}

interface GapInfo {
  track1: string;
  track2: string;
  color1: string;
  color2: string;
  distance: number;
}

export default function GapDisplay({ positions }: GapDisplayProps) {
  const gaps = useMemo((): GapInfo[] => {
    const activePositions = positions.filter((p) => p.position !== null);
    const result: GapInfo[] = [];

    for (let i = 0; i < activePositions.length - 1; i++) {
      for (let j = i + 1; j < activePositions.length; j++) {
        const p1 = activePositions[i];
        const p2 = activePositions[j];

        if (p1.position && p2.position) {
          const distance = calculateDistanceBetweenPoints(p1.position, p2.position);
          result.push({
            track1: p1.name,
            track2: p2.name,
            color1: p1.color,
            color2: p2.color,
            distance,
          });
        }
      }
    }

    return result.sort((a, b) => a.distance - b.distance);
  }, [positions]);

  if (gaps.length === 0) {
    return (
      <div className="gap-display empty">
        <p>Load tracks with timestamps to see gaps during playback</p>
      </div>
    );
  }

  return (
    <div className="gap-display">
      <h3>Current Gaps</h3>
      <ul className="gap-list">
        {gaps.map((gap, index) => (
          <li key={index} className="gap-item">
            <div className="gap-tracks">
              <span className="track-indicator">
                <span
                  className="color-dot"
                  style={{ backgroundColor: gap.color1 }}
                />
                {gap.track1}
              </span>
              <span className="gap-arrow">&harr;</span>
              <span className="track-indicator">
                <span
                  className="color-dot"
                  style={{ backgroundColor: gap.color2 }}
                />
                {gap.track2}
              </span>
            </div>
            <div className="gap-distance">{formatDistance(gap.distance)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
