import { EPS, GRID } from '../config/constants';
import { dist, snapToGrid } from './geometry';

export function wallMetersToPx(thicknessM, baseUnitM) {
  const safeBaseUnit = Number(baseUnitM) > 0 ? Number(baseUnitM) : 1;
  const meters = Number(thicknessM) > 0 ? Number(thicknessM) : 0.115;
  return (meters / safeBaseUnit) * GRID;
}

export function thicknessOptionValue(value) {
  return Number(value).toFixed(3);
}

function normalizeWall(wall) {
  const start = snapToGrid(wall.start.x, wall.start.y);
  const end = snapToGrid(wall.end.x, wall.end.y);
  if (dist(start, end) < EPS) return null;
  return { ...wall, start, end };
}

function cross(a, b) {
  return a.x * b.y - a.y * b.x;
}

function subtract(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

function segmentIntersection(a1, a2, b1, b2) {
  const r = subtract(a2, a1);
  const s = subtract(b2, b1);
  const denom = cross(r, s);
  const qp = subtract(b1, a1);

  if (Math.abs(denom) < EPS) {
    return null;
  }

  const t = cross(qp, s) / denom;
  const u = cross(qp, r) / denom;

  if (t >= -EPS && t <= 1 + EPS && u >= -EPS && u <= 1 + EPS) {
    return {
      point: { x: a1.x + t * r.x, y: a1.y + t * r.y },
      t,
      u
    };
  }

  return null;
}

export function normalizeAndSplitWalls(inputWalls) {
  const base = inputWalls.map(normalizeWall).filter(Boolean);
  const tBuckets = base.map(() => new Set([0, 1]));

  for (let i = 0; i < base.length; i += 1) {
    for (let j = i + 1; j < base.length; j += 1) {
      const a = base[i];
      const b = base[j];
      const hit = segmentIntersection(a.start, a.end, b.start, b.end);
      if (!hit) continue;

      if (hit.t > EPS && hit.t < 1 - EPS) tBuckets[i].add(Number(hit.t.toFixed(6)));
      if (hit.u > EPS && hit.u < 1 - EPS) tBuckets[j].add(Number(hit.u.toFixed(6)));
    }
  }

  const out = [];

  for (let i = 0; i < base.length; i += 1) {
    const wall = base[i];
    const ts = [...tBuckets[i]].sort((a, b) => a - b);
    for (let k = 0; k < ts.length - 1; k += 1) {
      const t1 = ts[k];
      const t2 = ts[k + 1];
      if (t2 - t1 < EPS) continue;

      const p1 = snapToGrid(
        wall.start.x + (wall.end.x - wall.start.x) * t1,
        wall.start.y + (wall.end.y - wall.start.y) * t1
      );
      const p2 = snapToGrid(
        wall.start.x + (wall.end.x - wall.start.x) * t2,
        wall.start.y + (wall.end.y - wall.start.y) * t2
      );

      if (dist(p1, p2) < EPS) continue;

      out.push({
        id: crypto.randomUUID(),
        start: p1,
        end: p2,
        type: wall.type,
        material: wall.material
      });
    }
  }

  const dedup = new Map();
  for (const w of out) {
    const a = `${w.start.x},${w.start.y}`;
    const b = `${w.end.x},${w.end.y}`;
    const order = a <= b ? `${a}|${b}` : `${b}|${a}`;
    const key = `${order}|${w.type}|${w.material}`;
    if (!dedup.has(key)) dedup.set(key, w);
  }

  return [...dedup.values()];
}
