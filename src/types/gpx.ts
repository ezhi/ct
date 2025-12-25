export interface GpxPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: Date;
}

export interface GpxTrack {
  id: string;
  name: string;
  color: string;
  points: GpxPoint[];
  startTime?: Date;
  endTime?: Date;
  distance: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  speed: number;
  minTime: number;
  maxTime: number;
}

export interface TrackPosition {
  trackId: string;
  name: string;
  color: string;
  position: GpxPoint | null;
  progress: number;
}
