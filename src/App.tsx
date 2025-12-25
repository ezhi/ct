import { useState, useCallback, useEffect, useRef } from 'react';
import Map from './components/Map';
import FileUpload from './components/FileUpload';
import PlaybackControls from './components/PlaybackControls';
import GapDisplay from './components/GapDisplay';
import type { GpxTrack, PlaybackState, TrackPosition } from './types/gpx';
import { parseGpxFile, getPositionAtTime, resetColorIndex } from './utils/gpxParser';
import './App.css';

function App() {
  const [tracks, setTracks] = useState<GpxTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playback, setPlayback] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    speed: 1,
    minTime: 0,
    maxTime: 0,
  });
  const [positions, setPositions] = useState<TrackPosition[]>([]);

  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Calculate time bounds when tracks change
  useEffect(() => {
    if (tracks.length === 0) {
      setPlayback((prev) => ({
        ...prev,
        minTime: 0,
        maxTime: 0,
        currentTime: 0,
        isPlaying: false,
      }));
      setPositions([]);
      return;
    }

    const tracksWithTime = tracks.filter((t) => t.startTime && t.endTime);

    if (tracksWithTime.length === 0) {
      setPlayback((prev) => ({
        ...prev,
        minTime: 0,
        maxTime: 0,
        currentTime: 0,
        isPlaying: false,
      }));
      setPositions([]);
      return;
    }

    const minTime = Math.min(...tracksWithTime.map((t) => t.startTime!.getTime()));
    const maxTime = Math.max(...tracksWithTime.map((t) => t.endTime!.getTime()));

    setPlayback((prev) => ({
      ...prev,
      minTime,
      maxTime,
      currentTime: minTime,
    }));

    // Initialize positions
    updatePositions(minTime);
  }, [tracks]);

  const updatePositions = useCallback(
    (time: number) => {
      const newPositions: TrackPosition[] = tracks.map((track) => {
        const position = getPositionAtTime(track, time);
        let progress = 0;

        if (track.startTime && track.endTime) {
          const trackDuration = track.endTime.getTime() - track.startTime.getTime();
          const elapsed = time - track.startTime.getTime();
          progress = Math.max(0, Math.min(1, elapsed / trackDuration));
        }

        return {
          trackId: track.id,
          name: track.name,
          color: track.color,
          position,
          progress,
        };
      });

      setPositions(newPositions);
    },
    [tracks]
  );

  // Animation loop
  useEffect(() => {
    if (!playback.isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (lastFrameTimeRef.current === 0) {
        lastFrameTimeRef.current = timestamp;
      }

      const deltaTime = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;

      setPlayback((prev) => {
        // Real time in ms * playback speed = simulated time
        const newTime = prev.currentTime + deltaTime * prev.speed;

        if (newTime >= prev.maxTime) {
          return {
            ...prev,
            currentTime: prev.maxTime,
            isPlaying: false,
          };
        }

        return {
          ...prev,
          currentTime: newTime,
        };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    lastFrameTimeRef.current = 0;
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [playback.isPlaying]);

  // Update positions when currentTime changes
  useEffect(() => {
    updatePositions(playback.currentTime);
  }, [playback.currentTime, updatePositions]);

  const handleFilesSelected = useCallback(async (files: FileList) => {
    setIsLoading(true);
    setError(null);

    const newTracks: GpxTrack[] = [];

    for (const file of Array.from(files)) {
      if (!file.name.toLowerCase().endsWith('.gpx')) {
        continue;
      }

      try {
        const track = await parseGpxFile(file);
        newTracks.push(track);
      } catch (err) {
        console.error(`Error parsing ${file.name}:`, err);
        setError(`Failed to parse ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    if (newTracks.length > 0) {
      setTracks((prev) => [...prev, ...newTracks]);
    }

    setIsLoading(false);
  }, []);

  const handleRemoveTrack = useCallback((trackId: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
  }, []);

  const handleClearAll = useCallback(() => {
    setTracks([]);
    resetColorIndex();
    setPlayback({
      isPlaying: false,
      currentTime: 0,
      speed: 1,
      minTime: 0,
      maxTime: 0,
    });
    setPositions([]);
  }, []);

  const handleTogglePlay = useCallback(() => {
    setPlayback((prev) => {
      // If at the end, restart from beginning
      if (!prev.isPlaying && prev.currentTime >= prev.maxTime) {
        return {
          ...prev,
          isPlaying: true,
          currentTime: prev.minTime,
        };
      }
      return {
        ...prev,
        isPlaying: !prev.isPlaying,
      };
    });
  }, []);

  const handleSeek = useCallback((time: number) => {
    setPlayback((prev) => ({
      ...prev,
      currentTime: time,
    }));
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setPlayback((prev) => ({
      ...prev,
      speed,
    }));
  }, []);

  const handleReset = useCallback(() => {
    setPlayback((prev) => ({
      ...prev,
      isPlaying: false,
      currentTime: prev.minTime,
    }));
  }, []);

  const hasTimeData = playback.maxTime > playback.minTime;

  return (
    <div className="app">
      <header className="header">
        <h1>GPX Track Comparator</h1>
        <p>Upload GPX tracks and compare them side by side</p>
      </header>

      <div className="main-content">
        <aside className="sidebar">
          <FileUpload
            tracks={tracks}
            onFilesSelected={handleFilesSelected}
            onRemoveTrack={handleRemoveTrack}
            onClearAll={handleClearAll}
            isLoading={isLoading}
          />

          {error && <div className="error-message">{error}</div>}

          {tracks.length > 0 && (
            <>
              <PlaybackControls
                playback={playback}
                onTogglePlay={handleTogglePlay}
                onSeek={handleSeek}
                onSpeedChange={handleSpeedChange}
                onReset={handleReset}
                disabled={!hasTimeData}
              />

              <GapDisplay positions={positions} />
            </>
          )}
        </aside>

        <main className="map-wrapper">
          <Map tracks={tracks} positions={positions} />
        </main>
      </div>
    </div>
  );
}

export default App;
