import { EPS, GRID, STAIR_GOING_M, VIEW_H, VIEW_W } from '../config/constants';

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

// Rotates a local-frame point by angleDeg around the origin (standard 2D
// rotation matrix) - the one rotation formula every fixture-placement path
// (furniture boxes, stairs, hit-testing) needs, in degrees to match the
// fixture.angleDeg convention used throughout the editor/3D model.
export function rotateDeg(point, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: (point.x * cos) - (point.y * sin), y: (point.x * sin) + (point.y * cos) };
}

// Local +X = width, local +Y = depth, matching FixtureLayer.jsx's un-rotated
// left/top convention - rotates a local-frame point by angleDeg and
// translates it into world/plan space around a fixture's own position.
export function localToWorld(local, origin, angleDeg) {
  const r = rotateDeg(local, angleDeg);
  return { x: origin.x + r.x, y: origin.y + r.y };
}

// Inverse of localToWorld: expresses a world/plan point in a fixture's own
// rotated local frame - used for hit-testing whether a click point falls
// inside a rotated fixture's unrotated bounding box.
export function worldToLocal(point, origin, angleDeg) {
  return rotateDeg({ x: point.x - origin.x, y: point.y - origin.y }, -angleDeg);
}

export function pxToM(px, baseUnitM) {
  return (px / GRID) * baseUnitM;
}

export function mToPx(m, baseUnitM) {
  return (m / baseUnitM) * GRID;
}

export function pointPxToM(point, baseUnitM) {
  return { x: pxToM(point.x, baseUnitM), y: pxToM(point.y, baseUnitM) };
}

export function pointMToPx(point, baseUnitM) {
  return { x: mToPx(point.x, baseUnitM), y: mToPx(point.y, baseUnitM) };
}

// Tread count for a stair run of this length, per the DIN 18065 going
// formula - shared so the 2D plan icon and 3D model never disagree on
// how many steps a given stair fixture draws.
export function stepCountForRunM(runLengthM, minSteps = 3) {
  return Math.max(minSteps, Math.round(runLengthM / STAIR_GOING_M));
}
