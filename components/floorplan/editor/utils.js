import { EPS, GRID } from '../config/constants';
import { pointToSegmentDistance } from '../core/geometry';

export function snapToHalfGrid(x, y) {
  const step = GRID / 2;
  return {
    x: Math.round(x / step) * step,
    y: Math.round(y / step) * step
  };
}

export function normalizeAngleDeg(value) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function roundOutToGrid(value) {
  if (!Number.isFinite(value)) return 0;
  if (value >= 0) return Math.ceil(value / GRID) * GRID;
  return Math.floor(value / GRID) * GRID;
}

export function roundOutToStep(value, step) {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return 0;
  if (value >= 0) return Math.ceil(value / step) * step;
  return Math.floor(value / step) * step;
}

export function normalizeFurnitureType(type) {
  if (type === 'kitchen_appliance') return 'kitchen';
  if (type === 'laundry_appliance') return 'laundry';
  if (type === 'bath_appliance') return 'bath';
  return type || '';
}

export function findWallAtPointInSet(point, wallSet, maxDistance = Infinity) {
  let hit = null;
  let min = maxDistance;
  for (const wall of wallSet) {
    const d = pointToSegmentDistance(point, wall.start, wall.end);
    if (d < min) {
      min = d;
      hit = wall;
    }
  }
  return hit;
}

export function projectPointOnWall(point, wall) {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < EPS) return { x: wall.start.x, y: wall.start.y, t: 0 };
  const t = ((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) / len2;
  const clampedT = Math.max(0, Math.min(1, t));
  return {
    x: wall.start.x + clampedT * dx,
    y: wall.start.y + clampedT * dy,
    t: clampedT
  };
}
