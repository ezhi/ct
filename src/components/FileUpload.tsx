import { useCallback, useRef } from 'react';
import type { GpxTrack } from '../types/gpx';
import { formatDistance, formatDuration } from '../utils/gpxParser';

interface FileUploadProps {
  tracks: GpxTrack[];
  onFilesSelected: (files: FileList) => void;
  onRemoveTrack: (trackId: string) => void;
  onClearAll: () => void;
  isLoading: boolean;
}

export default function FileUpload({
  tracks,
  onFilesSelected,
  onRemoveTrack,
  onClearAll,
  isLoading,
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFilesSelected(files);
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [onFilesSelected]
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="file-upload-section">
      <div
        className="drop-zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".gpx"
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <div className="drop-zone-content">
          {isLoading ? (
            <span>Loading...</span>
          ) : (
            <>
              <span className="drop-icon">+</span>
              <span>Drop GPX files here or click to browse</span>
            </>
          )}
        </div>
      </div>

      {tracks.length > 0 && (
        <div className="tracks-list">
          <div className="tracks-header">
            <h3>Loaded Tracks ({tracks.length})</h3>
            <button className="clear-btn" onClick={onClearAll}>
              Clear All
            </button>
          </div>
          <ul>
            {tracks.map((track) => (
              <li key={track.id} className="track-item">
                <div
                  className="track-color"
                  style={{ backgroundColor: track.color }}
                />
                <div className="track-info">
                  <span className="track-name">{track.name}</span>
                  <span className="track-details">
                    {formatDistance(track.distance)}
                    {track.startTime && track.endTime && (
                      <> &middot; {formatDuration(track.endTime.getTime() - track.startTime.getTime())}</>
                    )}
                  </span>
                </div>
                <button
                  className="remove-btn"
                  onClick={() => onRemoveTrack(track.id)}
                  title="Remove track"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
