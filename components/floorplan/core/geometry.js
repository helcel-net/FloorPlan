import { EPS, GRID, VIEW_H, VIEW_W } from '../config/constants';

const WORKSPACE_MIN_X = -VIEW_W * 4;
const WORKSPACE_MAX_X = VIEW_W * 5;
const WORKSPACE_MIN_Y = -VIEW_H * 4;
const WORKSPACE_MAX_Y = VIEW_H * 5;

export function toKey(x, y) {
  return `${x},${y}`;
}

export function regionIdFromCentroid(centroid) {
  const gx = Math.round(centroid.x / GRID);
  const gy = Math.round(centroid.y / GRID);
  return `${gx}:${gy}`;
}

export function clampPoint(point) {
  return {
    x: Math.max(WORKSPACE_MIN_X, Math.min(WORKSPACE_MAX_X, point.x)),
    y: Math.max(WORKSPACE_MIN_Y, Math.min(WORKSPACE_MAX_Y, point.y))
  };
}

export function snapToGrid(x, y) {
  return clampPoint({ x: Math.round(x / GRID) * GRID, y: Math.round(y / GRID) * GRID });
}

export function toGridVertexKey(point) {
  return toKey(Math.round(point.x / GRID) * GRID, Math.round(point.y / GRID) * GRID);
}

export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function getSvgPoint(event, svg) {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const x = (event.clientX - ctm.e) / ctm.a;
  const y = (event.clientY - ctm.f) / ctm.d;
  return clampPoint({ x, y });
}

export function pointToSegmentDistance(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < EPS) return dist(point, start);
  const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / len2;
  const clamped = Math.max(0, Math.min(1, t));
  const px = start.x + clamped * dx;
  const py = start.y + clamped * dy;
  return Math.hypot(point.x - px, point.y - py);
}

export function cloneWalls(walls) {
  return walls.map((w) => ({ ...w, start: { ...w.start }, end: { ...w.end } }));
}
