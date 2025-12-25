import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { GpxTrack, TrackPosition } from '../types/gpx';
import 'leaflet/dist/leaflet.css';

interface MapProps {
  tracks: GpxTrack[];
  positions: TrackPosition[];
}

function createMarkerIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 16px;
      height: 16px;
      background-color: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function FitBounds({ tracks }: { tracks: GpxTrack[] }) {
  const map = useMap();

  useEffect(() => {
    if (tracks.length === 0) return;

    const allPoints = tracks.flatMap((track) =>
      track.points.map((p) => [p.lat, p.lon] as [number, number])
    );

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [tracks, map]);

  return null;
}

function DistanceLines({ positions }: { positions: TrackPosition[] }) {
  const activePositions = positions.filter((p) => p.position !== null);

  if (activePositions.length < 2) return null;

  const lines: React.ReactNode[] = [];

  for (let i = 0; i < activePositions.length - 1; i++) {
    for (let j = i + 1; j < activePositions.length; j++) {
      const p1 = activePositions[i];
      const p2 = activePositions[j];

      if (p1.position && p2.position) {
        lines.push(
          <Polyline
            key={`gap-${p1.trackId}-${p2.trackId}`}
            positions={[
              [p1.position.lat, p1.position.lon],
              [p2.position.lat, p2.position.lon],
            ]}
            color="#666"
            weight={2}
            dashArray="5, 10"
            opacity={0.7}
          />
        );
      }
    }
  }

  return <>{lines}</>;
}

export default function Map({ tracks, positions }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);

  const center = useMemo<[number, number]>(() => {
    if (tracks.length > 0 && tracks[0].points.length > 0) {
      const point = tracks[0].points[0];
      return [point.lat, point.lon];
    }
    return [51.505, -0.09];
  }, [tracks]);

  return (
    <MapContainer
      center={center}
      zoom={13}
      className="map-container"
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitBounds tracks={tracks} />

      {/* Render track polylines */}
      {tracks.map((track) => (
        <Polyline
          key={track.id}
          positions={track.points.map((p) => [p.lat, p.lon])}
          color={track.color}
          weight={4}
          opacity={0.8}
        />
      ))}

      {/* Render distance lines between active positions */}
      <DistanceLines positions={positions} />

      {/* Render position markers */}
      {positions.map((pos) =>
        pos.position ? (
          <Marker
            key={pos.trackId}
            position={[pos.position.lat, pos.position.lon]}
            icon={createMarkerIcon(pos.color)}
          >
            <Popup>
              <strong>{pos.name}</strong>
              <br />
              Progress: {Math.round(pos.progress * 100)}%
              {pos.position.ele !== undefined && (
                <>
                  <br />
                  Elevation: {Math.round(pos.position.ele)} m
                </>
              )}
            </Popup>
          </Marker>
        ) : null
      )}
    </MapContainer>
  );
}
