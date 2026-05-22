import { GRID, VIEW_H, VIEW_W } from '../config/constants';

export function getPlanBounds(walls, fixtures) {
  if (!walls.length && !fixtures.length) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const wall of walls) {
    minX = Math.min(minX, wall.start.x, wall.end.x);
    minY = Math.min(minY, wall.start.y, wall.end.y);
    maxX = Math.max(maxX, wall.start.x, wall.end.x);
    maxY = Math.max(maxY, wall.start.y, wall.end.y);
  }

  for (const fixture of fixtures) {
    if (!fixture?.position) continue;
    minX = Math.min(minX, fixture.position.x);
    minY = Math.min(minY, fixture.position.y);
    maxX = Math.max(maxX, fixture.position.x);
    maxY = Math.max(maxY, fixture.position.y);
  }

  return { minX, minY, maxX, maxY };
}

export function buildDefaultCamera(canvasAspect) {
  const w = VIEW_W;
  const safeAspect = Number.isFinite(canvasAspect) && canvasAspect > 0 ? canvasAspect : (VIEW_W / VIEW_H);
  const h = Math.max(GRID, Math.round(w / safeAspect));
  return { x: 0, y: 0, w, h };
}

export function buildFittedCamera({
  walls,
  fixtures,
  canvasAspect,
  fitMarginCells,
  minCameraSizeCells,
  maxCameraSizeCells
}) {
  const bounds = getPlanBounds(walls, fixtures);
  if (!bounds) return buildDefaultCamera(canvasAspect);
  const { minX, minY, maxX, maxY } = bounds;

  const margin = fitMarginCells * GRID;
  const minSize = minCameraSizeCells * GRID;
  const maxSize = maxCameraSizeCells * GRID;
  const rawW = Math.max(minSize, (maxX - minX) + margin * 2);
  const rawH = Math.max(minSize, (maxY - minY) + margin * 2);
  let w = rawW;
  let h = rawH;

  if (w / h > canvasAspect) h = w / canvasAspect;
  else w = h * canvasAspect;

  w = Math.min(maxSize, w);
  h = Math.min(maxSize, h);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  return {
    x: Math.round(cx - (w / 2)),
    y: Math.round(cy - (h / 2)),
    w: Math.round(w),
    h: Math.round(h)
  };
}
