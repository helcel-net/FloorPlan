import { EPS, GRID, GRID_CELL_M2 } from '../config/constants';
import { regionIdFromCentroid, toGridVertexKey, toKey } from './geometry';

// Closets, cupboards, and technical shafts are typically 0.4-0.7m in their
// narrow dimension, so the minimum has to clear that band to keep them from
// being auto-detected as rooms, while still allowing small real rooms
// (a compact WC, a utility nook) through.
const MIN_ROOM_DIMENSION_M = 0.9;
const MIN_ROOM_FIT_DIAMETER_M = 0.7;
const MIN_ROOM_AREA_M2 = 0.8;

function parseVertexKey(key) {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

function polygonSignedArea(vertices) {
  let sum = 0;
  for (let i = 0; i < vertices.length; i += 1) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    sum += (a.x * b.y) - (b.x * a.y);
  }
  return sum / 2;
}

function polygonCentroid(vertices, signedArea) {
  if (Math.abs(signedArea) < EPS) {
    let sx = 0;
    let sy = 0;
    for (const v of vertices) {
      sx += v.x;
      sy += v.y;
    }
    return { x: sx / Math.max(1, vertices.length), y: sy / Math.max(1, vertices.length) };
  }

  let cx = 0;
  let cy = 0;
  for (let i = 0; i < vertices.length; i += 1) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const cross = (a.x * b.y) - (b.x * a.y);
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  const denom = 6 * signedArea;
  return { x: cx / denom, y: cy / denom };
}

function pointOnSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const cross = ((point.x - a.x) * dy) - ((point.y - a.y) * dx);
  if (Math.abs(cross) > EPS) return false;
  const dot = ((point.x - a.x) * (point.x - b.x)) + ((point.y - a.y) * (point.y - b.y));
  return dot <= EPS;
}

function pointInPolygon(point, polygon) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[j];
    const b = polygon[i];

    if (pointOnSegment(point, a, b)) return true;

    const intersects = ((a.y > point.y) !== (b.y > point.y))
      && (point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || EPS) + a.x);
    if (intersects) inside = !inside;
  }

  return inside;
}

function pointToSegmentDistance(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = (dx * dx) + (dy * dy);
  if (len2 < EPS) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, (((point.x - a.x) * dx) + ((point.y - a.y) * dy)) / len2));
  const px = a.x + (t * dx);
  const py = a.y + (t * dy);
  return Math.hypot(point.x - px, point.y - py);
}

function minDistanceToPolygonEdges(point, polygon) {
  let minD = Infinity;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    minD = Math.min(minD, pointToSegmentDistance(point, a, b));
  }
  return minD;
}

function canPlaceCircleInRoom(vertices, cells, requiredDiameterPx, centroid) {
  const requiredRadius = requiredDiameterPx / 2;
  if (requiredRadius <= EPS) return true;

  // Try centroid first; if it fails, try cell centers (robust for irregular shapes).
  if (pointInPolygon(centroid, vertices) && minDistanceToPolygonEdges(centroid, vertices) + EPS >= requiredRadius) {
    return true;
  }

  for (const cell of cells) {
    const p = { x: (cell.x + 0.5) * GRID, y: (cell.y + 0.5) * GRID };
    if (!pointInPolygon(p, vertices)) continue;
    if (minDistanceToPolygonEdges(p, vertices) + EPS >= requiredRadius) return true;
    const p2 = { x: (cell.x) * GRID, y: (cell.y) * GRID };
    if (!pointInPolygon(p2, vertices)) continue;
    if (minDistanceToPolygonEdges(p2, vertices) + EPS >= requiredRadius) return true;
  }

  return false;
}

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

  const extentUM = (maxU - minU + 1) * baseUnitM;
  const extentVM = (maxV - minV + 1) * baseUnitM;
  return {
    widthM: Math.max(extentUM, extentVM),
    heightM: Math.min(extentUM, extentVM)
  };
}

function canonicalCycle(vertexKeys) {
  const n = vertexKeys.length;
  if (!n) return '';

  const forward = [];
  const backward = [];
  for (let shift = 0; shift < n; shift += 1) {
    const f = [];
    const b = [];
    for (let i = 0; i < n; i += 1) {
      f.push(vertexKeys[(shift + i) % n]);
      b.push(vertexKeys[(shift - i + n) % n]);
    }
    forward.push(f.join('|'));
    backward.push(b.join('|'));
  }

  return [...forward, ...backward].sort()[0];
}

function buildFacesFromWalls(walls) {
  const outgoingByVertex = new Map();

  function addHalfEdge(from, to, wallId) {
    if (!outgoingByVertex.has(from)) outgoingByVertex.set(from, []);
    const fromP = parseVertexKey(from);
    const toP = parseVertexKey(to);
    outgoingByVertex.get(from).push({
      from,
      to,
      wallId,
      angle: Math.atan2(toP.y - fromP.y, toP.x - fromP.x)
    });
  }

  for (const wall of walls || []) {
    const a = toGridVertexKey(wall.start);
    const b = toGridVertexKey(wall.end);
    if (a === b) continue;
    addHalfEdge(a, b, wall.id);
    addHalfEdge(b, a, wall.id);
  }

  for (const edges of outgoingByVertex.values()) {
    edges.sort((a, b) => a.angle - b.angle);
  }

  const visited = new Set();
  const faces = [];

  function halfEdgeKey(edge) {
    return `${edge.from}>${edge.to}@${edge.wallId}`;
  }

  const allEdges = [];
  for (const edges of outgoingByVertex.values()) allEdges.push(...edges);

  for (const seed of allEdges) {
    const seedKey = halfEdgeKey(seed);
    if (visited.has(seedKey)) continue;

    const cycleEdges = [];
    const cycleVertices = [];
    let cur = seed;
    let guard = 0;
    const maxSteps = Math.max(8, allEdges.length * 2);

    while (guard < maxSteps) {
      guard += 1;
      const curKey = halfEdgeKey(cur);
      if (visited.has(curKey)) break;
      visited.add(curKey);
      cycleEdges.push(cur);
      cycleVertices.push(cur.from);

      const outgoing = outgoingByVertex.get(cur.to) || [];
      if (!outgoing.length) break;

      const reverseIdx = outgoing.findIndex((e) => e.to === cur.from && e.wallId === cur.wallId);
      if (reverseIdx < 0) break;

      const next = outgoing[(reverseIdx - 1 + outgoing.length) % outgoing.length];
      cur = next;

      if (cur.from === seed.from && cur.to === seed.to && cur.wallId === seed.wallId) {
        const points = cycleVertices.map(parseVertexKey);
        const signedArea = polygonSignedArea(points);
        if (Math.abs(signedArea) > EPS && cycleVertices.length >= 3) {
          faces.push({
            vertexKeys: cycleVertices,
            wallIds: Array.from(new Set(cycleEdges.map((e) => e.wallId))),
            signedArea
          });
        }
        break;
      }
    }
  }

  const dedup = new Map();
  for (const face of faces) {
    const key = canonicalCycle(face.vertexKeys);
    if (!key) continue;
    const prev = dedup.get(key);
    if (!prev || Math.abs(face.signedArea) > Math.abs(prev.signedArea)) dedup.set(key, face);
  }

  return [...dedup.values()];
}

function rasterizeRoomCellsFromPolygon(vertices) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const v of vertices) {
    minX = Math.min(minX, v.x);
    minY = Math.min(minY, v.y);
    maxX = Math.max(maxX, v.x);
    maxY = Math.max(maxY, v.y);
  }

  const minCellX = Math.floor(minX / GRID) - 1;
  const maxCellX = Math.ceil(maxX / GRID) + 1;
  const minCellY = Math.floor(minY / GRID) - 1;
  const maxCellY = Math.ceil(maxY / GRID) + 1;

  const cells = [];
  for (let y = minCellY; y <= maxCellY; y += 1) {
    for (let x = minCellX; x <= maxCellX; x += 1) {
      const center = { x: (x + 0.5) * GRID, y: (y + 0.5) * GRID };
      if (!pointInPolygon(center, vertices)) continue;
      cells.push({ x, y, coverage: 1 });
    }
  }

  return cells;
}

export function buildRoomRegions(walls, _wallThicknessByTypeM, baseUnitM) {
  if (!walls?.length) return[];// || !Number.isFinite(baseUnitM) || baseUnitM <= EPS) return [];

  const faces = buildFacesFromWalls(walls);
  if (!faces.length) return [];

  const regions = [];

  for (const face of faces) {
    if (face.signedArea <= EPS) continue;

    const vertices = face.vertexKeys.map(parseVertexKey);
    const cells = rasterizeRoomCellsFromPolygon(vertices);
    if (cells.length < 2) continue;

    const centroid = polygonCentroid(vertices, face.signedArea);
    const { widthM, heightM } = computePrincipalExtentsM(cells, baseUnitM);
    if (widthM < MIN_ROOM_DIMENSION_M || heightM < MIN_ROOM_DIMENSION_M) continue;
    const minRoomFitDiameterPx = (MIN_ROOM_FIT_DIAMETER_M / baseUnitM) * GRID;
    if (!canPlaceCircleInRoom(vertices, cells, minRoomFitDiameterPx, centroid)) continue;

    const areaPx2 = Math.abs(face.signedArea);
    const areaInGridCells = areaPx2 / (GRID * GRID);
    const areaM2 = areaInGridCells * GRID_CELL_M2 * baseUnitM * baseUnitM;
    if (areaM2 < MIN_ROOM_AREA_M2) continue;

    const stableKey = `${regionIdFromCentroid(centroid)}:${Math.round(areaInGridCells / 2)}`;
    regions.push({
      key: stableKey,
      cells,
      centroid,
      areaM2,
      widthM,
      heightM,
      wallIds: face.wallIds,
      vertices
    });
  }

  // A region whose cells are entirely enclosed inside another region (e.g. a
  // courtyard, light well, or free-standing structure with its own closed
  // wall loop, sharing no walls with the outer perimeter) is a hole in that
  // outer region, not extra floor area - subtract it out. Adjacent rooms
  // that share a wall are unaffected: face-tracing already gives them
  // disjoint, non-overlapping cells, so they never look "contained".
  for (const outer of regions) {
    for (const inner of regions) {
      if (inner === outer || inner.cells.length >= outer.cells.length) continue;
      const outerKeys = new Set(outer.cells.map((c) => toKey(c.x, c.y)));
      const isHole = inner.cells.every((c) => outerKeys.has(toKey(c.x, c.y)));
      if (!isHole) continue;

      const innerKeys = new Set(inner.cells.map((c) => toKey(c.x, c.y)));
      outer.cells = outer.cells.filter((c) => !innerKeys.has(toKey(c.x, c.y)));
      outer.areaM2 = Math.max(0, outer.areaM2 - inner.areaM2);
    }
  }

  return regions;
}

export function collectRoomWallIds(region, walls) {
  if (Array.isArray(region?.wallIds) && region.wallIds.length) return region.wallIds;

  const roomCells = new Set((region?.cells || []).map((c) => toKey(c.x, c.y)));
  if (!roomCells.size) return [];

  const wallIds = [];
  const sideProbe = GRID * 0.35;

  for (const wall of walls || []) {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const len = Math.hypot(dx, dy);
    if (len < EPS) continue;

    const nx = -dy / len;
    const ny = dx / len;
    const steps = Math.max(1, Math.ceil(len / (GRID / 3)));

    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const px = wall.start.x + dx * t;
      const py = wall.start.y + dy * t;

      const leftInside = roomCells.has(toKey(Math.floor((px + nx * sideProbe) / GRID), Math.floor((py + ny * sideProbe) / GRID)));
      const rightInside = roomCells.has(toKey(Math.floor((px - nx * sideProbe) / GRID), Math.floor((py - ny * sideProbe) / GRID)));
      if (leftInside !== rightInside) {
        wallIds.push(wall.id);
        break;
      }
    }
  }

  return wallIds;
}

export function isRegionBoundedByClosedConnectedWalls(region, walls) {
  const wallIds = collectRoomWallIds(region, walls);
  if (wallIds.length < 3) return false;

  const ids = new Set(wallIds);
  const roomWalls = (walls || []).filter((wall) => ids.has(wall.id));
  if (roomWalls.length < 3) return false;

  const edges = roomWalls.map((wall) => ({
    wall,
    a: toGridVertexKey(wall.start),
    b: toGridVertexKey(wall.end)
  }));

  const degreeByVertex = new Map();
  for (const edge of edges) {
    degreeByVertex.set(edge.a, (degreeByVertex.get(edge.a) || 0) + 1);
    degreeByVertex.set(edge.b, (degreeByVertex.get(edge.b) || 0) + 1);
  }

  // Dangling partial walls (e.g. a partition that only reaches partway into
  // the room) show up as an edge with a free-hanging, degree-1 endpoint.
  // They don't break the room's enclosure, so peel them off before checking
  // that what's left forms a single closed, connected loop.
  let activeEdges = edges;
  let changed = true;
  while (changed) {
    changed = false;
    const nextEdges = [];
    for (const edge of activeEdges) {
      const degA = degreeByVertex.get(edge.a) || 0;
      const degB = degreeByVertex.get(edge.b) || 0;
      if (degA < 2 || degB < 2) {
        degreeByVertex.set(edge.a, degA - 1);
        degreeByVertex.set(edge.b, degB - 1);
        changed = true;
        continue;
      }
      nextEdges.push(edge);
    }
    activeEdges = nextEdges;
  }

  if (activeEdges.length < 3) return false;

  const adjacency = new Map();
  for (const edge of activeEdges) {
    if (!adjacency.has(edge.a)) adjacency.set(edge.a, new Set());
    if (!adjacency.has(edge.b)) adjacency.set(edge.b, new Set());
    adjacency.get(edge.a).add(edge.b);
    adjacency.get(edge.b).add(edge.a);
  }

  const vertices = [...adjacency.keys()];
  if (!vertices.length) return false;

  const seen = new Set([vertices[0]]);
  const queue = [vertices[0]];
  let qIndex = 0;

  while (qIndex < queue.length) {
    const cur = queue[qIndex++];
    for (const next of adjacency.get(cur) || []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }

  if (seen.size !== vertices.length) return false;
  return activeEdges.length >= vertices.length;
}

function vertexIsCorner(dirs) {
  if (!dirs.length) return false;
  if (dirs.length === 1) return true;

  for (let i = 0; i < dirs.length; i += 1) {
    for (let j = i + 1; j < dirs.length; j += 1) {
      const dot = dirs[i].dx * dirs[j].dx + dirs[i].dy * dirs[j].dy;
      if (Math.abs(dot) < 0.999) return true;
    }
  }

  return false;
}

export function collectRoomCornerVertexKeysFromCells(cells) {
  const roomCells = new Set((cells || []).map((c) => toKey(c.x, c.y)));
  const vertexDirs = new Map();

  function addDir(vx, vy, dx, dy) {
    const key = toKey(vx, vy);
    if (!vertexDirs.has(key)) vertexDirs.set(key, []);
    vertexDirs.get(key).push({ dx, dy });
  }

  for (const cell of cells || []) {
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
  for (const [vertexKey, dirs] of vertexDirs.entries()) {
    if (!vertexIsCorner(dirs)) continue;
    const [vx, vy] = vertexKey.split(',').map(Number);
    out.push(toKey(vx * GRID, vy * GRID));
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

  for (const wall of walls || []) {
    if (!ids.has(wall.id)) continue;

    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const len = Math.hypot(dx, dy);
    if (len < EPS) continue;

    const ux = dx / len;
    const uy = dy / len;
    const sKey = toGridVertexKey(wall.start);
    const eKey = toGridVertexKey(wall.end);

    addDir(sKey, ux, uy);
    addDir(eKey, -ux, -uy);
  }

  const out = [];
  for (const [vertexKey, dirs] of dirsByVertex.entries()) {
    if (vertexIsCorner(dirs)) out.push(vertexKey);
  }

  return out;
}

export function collectRoomCornerEndpointHandles(walls, room) {
  const cornerKeys = new Set([
    ...collectRoomCornerVertexKeysFromCells(room?.cells || []),
    ...collectRoomCornerVertexKeysFromWalls(walls, room?.wallIds || [])
  ]);
  const roomWallIds = new Set(room?.wallIds || []);
  const handles = [];

  for (const wall of walls || []) {
    if (!roomWallIds.has(wall.id)) continue;
    if (cornerKeys.has(toGridVertexKey(wall.start))) handles.push({ wallId: wall.id, endpoint: 'start' });
    if (cornerKeys.has(toGridVertexKey(wall.end))) handles.push({ wallId: wall.id, endpoint: 'end' });
  }

  return handles;
}

export function collectRoomCornerVertexKeys(walls, room) {
  return Array.from(new Set([
    ...collectRoomCornerVertexKeysFromCells(room?.cells || []),
    ...collectRoomCornerVertexKeysFromWalls(walls, room?.wallIds || [])
  ]));
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
