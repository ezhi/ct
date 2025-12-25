import type { GpxPoint, GpxTrack } from '../types/gpx';

const TRACK_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

let colorIndex = 0;

function getNextColor(): string {
  const color = TRACK_COLORS[colorIndex % TRACK_COLORS.length];
  colorIndex++;
  return color;
}

export function resetColorIndex(): void {
  colorIndex = 0;
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function calculateDistance(points: GpxPoint[]): number {
  let distance = 0;
  for (let i = 1; i < points.length; i++) {
    distance += haversineDistance(
      points[i - 1].lat,
      points[i - 1].lon,
      points[i].lat,
      points[i].lon
    );
  }
  return distance;
}

export function calculateDistanceBetweenPoints(
  p1: GpxPoint,
  p2: GpxPoint
): number {
  return haversineDistance(p1.lat, p1.lon, p2.lat, p2.lon);
}

export async function parseGpxFile(file: File): Promise<GpxTrack> {
  const text = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');

  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Invalid GPX file format');
  }

  const points: GpxPoint[] = [];

  // Parse track points (trkpt)
  const trkpts = doc.querySelectorAll('trkpt');
  trkpts.forEach((trkpt) => {
    const lat = parseFloat(trkpt.getAttribute('lat') || '0');
    const lon = parseFloat(trkpt.getAttribute('lon') || '0');
    const eleNode = trkpt.querySelector('ele');
    const timeNode = trkpt.querySelector('time');

    const point: GpxPoint = { lat, lon };

    if (eleNode?.textContent) {
      point.ele = parseFloat(eleNode.textContent);
    }

    if (timeNode?.textContent) {
      point.time = new Date(timeNode.textContent);
    }

    points.push(point);
  });

  // If no track points, try route points (rtept)
  if (points.length === 0) {
    const rtepts = doc.querySelectorAll('rtept');
    rtepts.forEach((rtept) => {
      const lat = parseFloat(rtept.getAttribute('lat') || '0');
      const lon = parseFloat(rtept.getAttribute('lon') || '0');
      const eleNode = rtept.querySelector('ele');
      const timeNode = rtept.querySelector('time');

      const point: GpxPoint = { lat, lon };

      if (eleNode?.textContent) {
        point.ele = parseFloat(eleNode.textContent);
      }

      if (timeNode?.textContent) {
        point.time = new Date(timeNode.textContent);
      }

      points.push(point);
    });
  }

  // If still no points, try waypoints (wpt)
  if (points.length === 0) {
    const wpts = doc.querySelectorAll('wpt');
    wpts.forEach((wpt) => {
      const lat = parseFloat(wpt.getAttribute('lat') || '0');
      const lon = parseFloat(wpt.getAttribute('lon') || '0');
      const eleNode = wpt.querySelector('ele');
      const timeNode = wpt.querySelector('time');

      const point: GpxPoint = { lat, lon };

      if (eleNode?.textContent) {
        point.ele = parseFloat(eleNode.textContent);
      }

      if (timeNode?.textContent) {
        point.time = new Date(timeNode.textContent);
      }

      points.push(point);
    });
  }

  if (points.length === 0) {
    throw new Error('No track points found in GPX file');
  }

  // Get track name
  const nameNode = doc.querySelector('trk > name') ||
                   doc.querySelector('rte > name') ||
                   doc.querySelector('metadata > name');
  const name = nameNode?.textContent || file.name.replace(/\.gpx$/i, '');

  // Calculate time bounds
  const pointsWithTime = points.filter((p) => p.time);
  const startTime = pointsWithTime.length > 0
    ? new Date(Math.min(...pointsWithTime.map((p) => p.time!.getTime())))
    : undefined;
  const endTime = pointsWithTime.length > 0
    ? new Date(Math.max(...pointsWithTime.map((p) => p.time!.getTime())))
    : undefined;

  const distance = calculateDistance(points);

  return {
    id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    color: getNextColor(),
    points,
    startTime,
    endTime,
    distance,
  };
}

export function getPositionAtTime(track: GpxTrack, time: number): GpxPoint | null {
  const pointsWithTime = track.points.filter((p) => p.time);

  if (pointsWithTime.length === 0) {
    // If no timestamps, interpolate based on progress
    return null;
  }

  // Find the two points surrounding the current time
  for (let i = 0; i < pointsWithTime.length - 1; i++) {
    const p1 = pointsWithTime[i];
    const p2 = pointsWithTime[i + 1];
    const t1 = p1.time!.getTime();
    const t2 = p2.time!.getTime();

    if (time >= t1 && time <= t2) {
      // Interpolate between p1 and p2
      const ratio = (time - t1) / (t2 - t1);
      return {
        lat: p1.lat + (p2.lat - p1.lat) * ratio,
        lon: p1.lon + (p2.lon - p1.lon) * ratio,
        ele: p1.ele !== undefined && p2.ele !== undefined
          ? p1.ele + (p2.ele - p1.ele) * ratio
          : undefined,
        time: new Date(time),
      };
    }
  }

  // If time is before track start, return first point
  if (time < pointsWithTime[0].time!.getTime()) {
    return pointsWithTime[0];
  }

  // If time is after track end, return last point
  return pointsWithTime[pointsWithTime.length - 1];
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}
