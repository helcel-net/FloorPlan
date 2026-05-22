import { EPS, GRID, GRID_CELL_M2 } from '../config/constants';
import { pointToSegmentDistance, regionIdFromCentroid, toGridVertexKey, toKey } from './geometry';
import { wallMetersToPx } from './walls';

function computePrincipalExtentsM(cells, baseUnitM) {
  if (!cells.length) return { widthM: 0, heightM: 0 };

  let meanX = 0;
  let meanY = 0;
  for (const cell of cells) {
    meanX += cell.x + 0.5;
    meanY += cell.y + 0.5;
  }
  meanX /= cells.length;
  meanY /= cells.length;

  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const cell of cells) {
    const dx = (cell.x + 0.5) - meanX;
    const dy = (cell.y + 0.5) - meanY;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  // Principal axis angle from covariance matrix.
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const ux = Math.cos(theta);
  const uy = Math.sin(theta);
  const vx = -uy;
  const vy = ux;

  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;

  for (const cell of cells) {
    const px = cell.x + 0.5;
    const py = cell.y + 0.5;
    const u = (px * ux) + (py * uy);
    const v = (px * vx) + (py * vy);
    minU = Math.min(minU, u);
    maxU = Math.max(maxU, u);
    minV = Math.min(minV, v);
    maxV = Math.max(maxV, v);
  }

  // +1 cell keeps parity with cell-based dimension interpretation.
  const extentUM = (maxU - minU + 1) * baseUnitM;
  const extentVM = (maxV - minV + 1) * baseUnitM;
  return {
    widthM: Math.max(extentUM, extentVM),
    heightM: Math.min(extentUM, extentVM)
  };
}

export function buildRoomRegions(walls, wallThicknessByTypeM, baseUnitM) {
  if (!walls?.length) return [];
  const MIN_ROOM_DIMENSION_M = 0.5;

  let minWorldX = Infinity;
  let minWorldY = Infinity;
  let maxWorldX = -Infinity;
  let maxWorldY = -Infinity;

  for (const wall of walls) {
    minWorldX = Math.min(minWorldX, wall.start.x, wall.end.x);
    minWorldY = Math.min(minWorldY, wall.start.y, wall.end.y);
    maxWorldX = Math.max(maxWorldX, wall.start.x, wall.end.x);
    maxWorldY = Math.max(maxWorldY, wall.start.y, wall.end.y);
  }

  const BOUNDS_MARGIN_CELLS = 4;
  const margin = BOUNDS_MARGIN_CELLS * GRID;
  const originX = Math.floor((minWorldX - margin) / GRID) * GRID;
  const originY = Math.floor((minWorldY - margin) / GRID) * GRID;
  const endX = Math.ceil((maxWorldX + margin) / GRID) * GRID;
  const endY = Math.ceil((maxWorldY + margin) / GRID) * GRID;
  const cols = Math.max(1, Math.round((endX - originX) / GRID));
  const rows = Math.max(1, Math.round((endY - originY) / GRID));
  const SUPER = 6;
  const superCols = cols * SUPER;
  const superRows = rows * SUPER;
  const superCellSize = GRID / SUPER;
  const MIN_REGION_SUPER_CELLS = 2;
  const blocked = new Set();

  function superKey(x, y) {
    return `${x},${y}`;
  }

  function markSuper(x, y) {
    if (x < 0 || y < 0 || x >= superCols || y >= superRows) return;
    blocked.add(superKey(x, y));
  }

  function dilateBlockedOnce() {
    const extra = [];
    for (const key of blocked) {
      const [x, y] = key.split(',').map(Number);
      for (const d of [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 }
      ]) {
        const nx = x + d.dx;
        const ny = y + d.dy;
        if (nx < 0 || ny < 0 || nx >= superCols || ny >= superRows) continue;
        const nKey = superKey(nx, ny);
        if (!blocked.has(nKey)) extra.push(nKey);
      }
    }
    for (const key of extra) blocked.add(key);
  }

  for (const wall of walls) {
    const wallWidth = wallMetersToPx(wallThicknessByTypeM?.[wall.type], baseUnitM);
    const wallHalfThickness = Math.max(superCellSize * 0.5, wallWidth / 2);
    const minX = Math.max(0, Math.floor((Math.min(wall.start.x, wall.end.x) - originX) / superCellSize) - 1);
    const maxX = Math.min(superCols - 1, Math.ceil((Math.max(wall.start.x, wall.end.x) - originX) / superCellSize) + 1);
    const minY = Math.max(0, Math.floor((Math.min(wall.start.y, wall.end.y) - originY) / superCellSize) - 1);
    const maxY = Math.min(superRows - 1, Math.ceil((Math.max(wall.start.y, wall.end.y) - originY) / superCellSize) + 1);

    for (let sy = minY; sy <= maxY; sy += 1) {
      for (let sx = minX; sx <= maxX; sx += 1) {
        const px = originX + (sx + 0.5) * superCellSize;
        const py = originY + (sy + 0.5) * superCellSize;
        const d = pointToSegmentDistance({ x: px, y: py }, wall.start, wall.end);
        if (d <= wallHalfThickness + EPS) markSuper(sx, sy);
      }
    }
  }

  dilateBlockedOnce();

  const outside = new Set();
  const outsideQueue = [];
  const componentSeen = new Set();

  function pushOutside(x, y) {
    if (x < 0 || y < 0 || x >= superCols || y >= superRows) return;
    const key = superKey(x, y);
    if (outside.has(key) || blocked.has(key)) return;
    outside.add(key);
    outsideQueue.push({ x, y });
  }

  for (let x = 0; x < superCols; x += 1) {
    pushOutside(x, 0);
    pushOutside(x, superRows - 1);
  }
  for (let y = 0; y < superRows; y += 1) {
    pushOutside(0, y);
    pushOutside(superCols - 1, y);
  }

  while (outsideQueue.length) {
    const cur = outsideQueue.shift();
    for (const d of [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 }
    ]) {
      const nx = cur.x + d.dx;
      const ny = cur.y + d.dy;
      if (nx < 0 || ny < 0 || nx >= superCols || ny >= superRows) continue;
      const key = superKey(nx, ny);
      if (blocked.has(key) || outside.has(key)) continue;
      outside.add(key);
      outsideQueue.push({ x: nx, y: ny });
    }
  }

  const regions = [];
  for (let sy = 0; sy < superRows; sy += 1) {
    for (let sx = 0; sx < superCols; sx += 1) {
      const seed = superKey(sx, sy);
      if (blocked.has(seed) || outside.has(seed) || componentSeen.has(seed)) continue;

      const q = [{ x: sx, y: sy }];
      componentSeen.add(seed);
      const coverage = new Map();
      let sumX = 0;
      let sumY = 0;
      let count = 0;

      while (q.length) {
        const cur = q.shift();
        const worldCenterX = originX + (cur.x + 0.5) * superCellSize;
        const worldCenterY = originY + (cur.y + 0.5) * superCellSize;
        const bx = Math.floor(worldCenterX / GRID);
        const by = Math.floor(worldCenterY / GRID);
        const bKey = toKey(bx, by);
        coverage.set(bKey, (coverage.get(bKey) || 0) + 1);

        sumX += worldCenterX / GRID;
        sumY += worldCenterY / GRID;
        count += 1;

        for (const d of [
          { dx: 1, dy: 0 },
          { dx: -1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: 0, dy: -1 }
        ]) {
          const nx = cur.x + d.dx;
          const ny = cur.y + d.dy;
          if (nx < 0 || ny < 0 || nx >= superCols || ny >= superRows) continue;
          const key = superKey(nx, ny);
          if (blocked.has(key) || outside.has(key) || componentSeen.has(key)) continue;
          componentSeen.add(key);
          q.push({ x: nx, y: ny });
        }
      }

      if (count < MIN_REGION_SUPER_CELLS) continue;

      const cells = [...coverage.entries()].map(([cellKey, hits]) => {
        const [x, y] = cellKey.split(',').map(Number);
        return { x, y, coverage: hits / (SUPER * SUPER) };
      });
      if (!cells.length) continue;

      const { widthM, heightM } = computePrincipalExtentsM(cells, baseUnitM);
      if (widthM < MIN_ROOM_DIMENSION_M || heightM < MIN_ROOM_DIMENSION_M) continue;

      const centroid = {
        x: (sumX / count) * GRID,
        y: (sumY / count) * GRID
      };
      const stableKey = `${regionIdFromCentroid(centroid)}:${Math.round(count / 8)}`;
      const areaM2 = cells.length * GRID_CELL_M2 * baseUnitM * baseUnitM;
      regions.push({ key: stableKey, cells, centroid, areaM2, widthM, heightM });
    }
  }

  return regions;
}

export function collectRoomWallIds(region, walls) {
  const roomCells = new Set(region.cells.map((c) => toKey(c.x, c.y)));
  const wallIds = [];
  const sideProbe = GRID * 0.35;

  for (const wall of walls) {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const len = Math.hypot(dx, dy);
    if (len < EPS) continue;
    const nx = -dy / len;
    const ny = dx / len;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (GRID / 3)));
    let boundsRoom = false;

    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const px = wall.start.x + dx * t;
      const py = wall.start.y + dy * t;

      const leftCellX = Math.floor((px + nx * sideProbe) / GRID);
      const leftCellY = Math.floor((py + ny * sideProbe) / GRID);
      const rightCellX = Math.floor((px - nx * sideProbe) / GRID);
      const rightCellY = Math.floor((py - ny * sideProbe) / GRID);

      const leftInside = roomCells.has(toKey(leftCellX, leftCellY));
      const rightInside = roomCells.has(toKey(rightCellX, rightCellY));

      if (leftInside !== rightInside) {
        boundsRoom = true;
        break;
      }
    }

    if (boundsRoom) wallIds.push(wall.id);
  }

  return wallIds;
}

export function isRegionBoundedByClosedConnectedWalls(region, walls) {
  const wallIds = collectRoomWallIds(region, walls);
  if (wallIds.length < 3) return false;

  const ids = new Set(wallIds);
  const roomWalls = (walls || []).filter((wall) => ids.has(wall.id));
  if (roomWalls.length < 3) return false;

  const degreeByVertex = new Map();
  const adjacency = new Map();

  function addEdge(a, b) {
    degreeByVertex.set(a, (degreeByVertex.get(a) || 0) + 1);
    degreeByVertex.set(b, (degreeByVertex.get(b) || 0) + 1);
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a).add(b);
    adjacency.get(b).add(a);
  }

  for (const wall of roomWalls) {
    const startKey = toGridVertexKey(wall.start);
    const endKey = toGridVertexKey(wall.end);
    addEdge(startKey, endKey);
  }

  // Closed loops should not have dangling ends.
  for (const degree of degreeByVertex.values()) {
    if (degree < 2) return false;
  }

  // Boundary graph must be one connected component.
  const vertices = [...degreeByVertex.keys()];
  if (!vertices.length) return false;
  const seen = new Set([vertices[0]]);
  const queue = [vertices[0]];
  while (queue.length) {
    const current = queue.shift();
    for (const next of adjacency.get(current) || []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  if (seen.size !== vertices.length) return false;

  // At least one cycle must exist.
  if (roomWalls.length < vertices.length) return false;

  return true;
}

export function collectRoomCornerVertexKeysFromCells(cells) {
  const roomCells = new Set(cells.map((c) => toKey(c.x, c.y)));
  const vertexDirs = new Map();

  function addDir(vx, vy, dx, dy) {
    const key = toKey(vx, vy);
    if (!vertexDirs.has(key)) vertexDirs.set(key, []);
    vertexDirs.get(key).push({ dx, dy });
  }

  for (const cell of cells) {
    const x = cell.x;
    const y = cell.y;

    if (!roomCells.has(toKey(x - 1, y))) {
      addDir(x, y, 0, 1);
      addDir(x, y + 1, 0, -1);
    }
    if (!roomCells.has(toKey(x + 1, y))) {
      addDir(x + 1, y, 0, 1);
      addDir(x + 1, y + 1, 0, -1);
    }
    if (!roomCells.has(toKey(x, y - 1))) {
      addDir(x, y, 1, 0);
      addDir(x + 1, y, -1, 0);
    }
    if (!roomCells.has(toKey(x, y + 1))) {
      addDir(x, y + 1, 1, 0);
      addDir(x + 1, y + 1, -1, 0);
    }
  }

  const out = [];
  for (const [k, dirs] of vertexDirs.entries()) {
    if (!dirs.length) continue;
    if (dirs.length === 1) {
      const [cx, cy] = k.split(',').map(Number);
      out.push(toKey(cx * GRID, cy * GRID));
      continue;
    }

    let isCorner = false;
    for (let i = 0; i < dirs.length && !isCorner; i += 1) {
      for (let j = i + 1; j < dirs.length; j += 1) {
        const dot = dirs[i].dx * dirs[j].dx + dirs[i].dy * dirs[j].dy;
        if (Math.abs(dot) < 0.999) {
          isCorner = true;
          break;
        }
      }
    }

    if (isCorner) {
      const [cx, cy] = k.split(',').map(Number);
      out.push(toKey(cx * GRID, cy * GRID));
    }
  }
  return out;
}

export function collectRoomCornerVertexKeysFromWalls(walls, wallIds) {
  const ids = new Set(wallIds || []);
  const dirsByVertex = new Map();

  function addDir(key, dx, dy) {
    if (!dirsByVertex.has(key)) dirsByVertex.set(key, []);
    dirsByVertex.get(key).push({ dx, dy });
  }

  for (const wall of walls) {
    if (!ids.has(wall.id)) continue;
    const sKey = toGridVertexKey(wall.start);
    const eKey = toGridVertexKey(wall.end);
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const len = Math.hypot(dx, dy);
    if (len < EPS) continue;

    const ux = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0;
    const uy = Math.abs(dy) >= Math.abs(dx) ? Math.sign(dy) : 0;
    addDir(sKey, ux, uy);
    addDir(eKey, -ux, -uy);
  }

  const out = [];
  for (const [key, dirs] of dirsByVertex.entries()) {
    if (!dirs.length) continue;
    if (dirs.length === 1) {
      out.push(key);
      continue;
    }

    let isCorner = false;
    for (let i = 0; i < dirs.length && !isCorner; i += 1) {
      for (let j = i + 1; j < dirs.length; j += 1) {
        const dot = dirs[i].dx * dirs[j].dx + dirs[i].dy * dirs[j].dy;
        if (Math.abs(dot) < 0.999) {
          isCorner = true;
          break;
        }
      }
    }
    if (isCorner) out.push(key);
  }

  return out;
}

export function collectRoomCornerEndpointHandles(walls, room) {
  const cornerKeys = new Set([
    ...collectRoomCornerVertexKeysFromCells(room.cells || []),
    ...collectRoomCornerVertexKeysFromWalls(walls, room.wallIds || [])
  ]);
  const roomWallIds = new Set(room.wallIds || []);
  const handles = [];

  for (const wall of walls) {
    if (!roomWallIds.has(wall.id)) continue;
    const startKey = toGridVertexKey(wall.start);
    const endKey = toGridVertexKey(wall.end);
    if (cornerKeys.has(startKey)) handles.push({ wallId: wall.id, endpoint: 'start' });
    if (cornerKeys.has(endKey)) handles.push({ wallId: wall.id, endpoint: 'end' });
  }

  return handles;
}

export function collectRoomCornerVertexKeys(walls, room) {
  return Array.from(
    new Set([
      ...collectRoomCornerVertexKeysFromCells(room.cells || []),
      ...collectRoomCornerVertexKeysFromWalls(walls, room.wallIds || [])
    ])
  );
}

export function collectRoomBoundaryVertexKeys(walls, room) {
  const roomWallIds = new Set(room?.wallIds || []);
  const keys = new Set();

  for (const wall of walls || []) {
    if (!roomWallIds.has(wall.id)) continue;
    keys.add(toGridVertexKey(wall.start));
    keys.add(toGridVertexKey(wall.end));
  }

  return Array.from(keys);
}

export function collectRoomBoundaryEndpointHandles(walls, room) {
  const roomWallIds = new Set(room?.wallIds || []);
  const handles = [];

  for (const wall of walls || []) {
    if (!roomWallIds.has(wall.id)) continue;
    handles.push({ wallId: wall.id, endpoint: 'start' });
    handles.push({ wallId: wall.id, endpoint: 'end' });
  }

  return handles;
}
