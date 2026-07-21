import { SNAP_RADIUS } from '../config/constants';
import { dist, getSvgPoint, pointToSegmentDistance, snapToGrid, worldToLocal } from '../core/geometry';
import { isWallOpeningFixture } from './utils';

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
    if (isWallOpeningFixture(fixture)) {
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
    const angleDeg = Number(fixture.angleDeg) || 0;
    const local = worldToLocal(point, fixture.position, angleDeg);
    if (Math.abs(local.x) <= widthPx / 2 && Math.abs(local.y) <= depthPx / 2) return fixture;
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
