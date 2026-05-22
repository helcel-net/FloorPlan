import { EPS, SNAP_RADIUS } from '../config/constants';
import { dist, getSvgPoint, pointToSegmentDistance, snapToGrid } from '../core/geometry';

export function findWallAtPointInWalls(walls, point, maxDistance = 10) {
  let hit = null;
  let min = maxDistance;
  for (const wall of walls) {
    const d = pointToSegmentDistance(point, wall.start, wall.end);
    if (d < min) {
      min = d;
      hit = wall;
    }
  }
  return hit;
}

export function findVertexAtPointInWalls(walls, point) {
  let hit = null;
  let min = SNAP_RADIUS;
  for (const wall of walls) {
    for (const endpoint of [wall.start, wall.end]) {
      const d = dist(point, endpoint);
      if (d <= min) {
        min = d;
        hit = endpoint;
      }
    }
  }
  return hit ? { x: hit.x, y: hit.y } : null;
}

export function findFixtureAtPointInFixtures(fixtures, point, baseUnitM, grid) {
  for (let i = fixtures.length - 1; i >= 0; i -= 1) {
    const fixture = fixtures[i];
    if (fixture.kind === 'door' || fixture.kind === 'window') {
      const widthPx = ((Number(fixture.widthM) || 0.8) / baseUnitM) * grid;
      const half = widthPx / 2;
      const angle = Number(fixture.angle) || 0;
      const ux = Math.cos(angle);
      const uy = Math.sin(angle);
      const x1 = fixture.position.x - ux * half;
      const y1 = fixture.position.y - uy * half;
      const x2 = fixture.position.x + ux * half;
      const y2 = fixture.position.y + uy * half;
      if (pointToSegmentDistance(point, { x: x1, y: y1 }, { x: x2, y: y2 }) <= 10) return fixture;
      continue;
    }

    const widthPx = ((Number(fixture.widthM) || 1) / baseUnitM) * grid;
    const depthPx = ((Number(fixture.depthM) || 1) / baseUnitM) * grid;
    const angle = (Number(fixture.angleDeg) || 0) * (Math.PI / 180);
    const cosA = Math.cos(-angle);
    const sinA = Math.sin(-angle);
    const dx = point.x - fixture.position.x;
    const dy = point.y - fixture.position.y;
    const localX = (dx * cosA) - (dy * sinA);
    const localY = (dx * sinA) + (dy * cosA);
    if (Math.abs(localX) <= widthPx / 2 && Math.abs(localY) <= depthPx / 2) return fixture;
  }
  return null;
}

export function getSnappedPointForEvent(event, svg, walls) {
  const raw = getSvgPoint(event, svg);
  let best = snapToGrid(raw.x, raw.y);
  let bestDist = dist(raw, best);

  for (const wall of walls) {
    for (const p of [wall.start, wall.end]) {
      const d = dist(raw, p);
      if (d < bestDist && d <= SNAP_RADIUS) {
        best = p;
        bestDist = d;
      }
    }
  }
  return best;
}

export function pointsEqualEps(a, b) {
  return dist(a, b) < EPS;
}
