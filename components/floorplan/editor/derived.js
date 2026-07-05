import { EPS, FLOOR_MATERIALS, GRID, WALL_MATERIALS } from '../config/constants';
import { clampPoint, dist } from '../core/geometry';
import { buildRoomRegions, collectRoomWallIds, isRegionBoundedByClosedConnectedWalls } from '../core/rooms';
import {
  buildPlacedDoorFixture,
  buildPlacedFurnitureFixture,
  buildPlacedWindowFixture
} from './fixtures';
import { isWallOpeningFixture, projectPointOnWall } from './utils';

export function buildFloorColorByValue() {
  return Object.fromEntries(FLOOR_MATERIALS.map((item) => [item.value, item.color]));
}

export function buildEffectiveWalls(walls, fixtures, baseUnitM) {
  return walls.flatMap((wall) => {
    const wallLen = Math.max(EPS, dist(wall.start, wall.end));
    const ranges = fixtures
      .filter((fixture) => isWallOpeningFixture(fixture) && fixture.wallId === wall.id)
      .map((fixture) => {
        const widthPx = ((Number(fixture.widthM) || 0.8) / baseUnitM) * GRID;
        const projection = projectPointOnWall(fixture.position, wall);
        const halfT = (widthPx / 2) / wallLen;
        return {
          from: Math.max(0, projection.t - halfT),
          to: Math.min(1, projection.t + halfT)
        };
      })
      .sort((a, b) => a.from - b.from);

    if (!ranges.length) return [wall];

    const merged = [];
    for (const range of ranges) {
      if (!merged.length || range.from > merged[merged.length - 1].to + EPS) merged.push({ ...range });
      else merged[merged.length - 1].to = Math.max(merged[merged.length - 1].to, range.to);
    }

    const segments = [];
    let cursor = 0;
    for (const range of merged) {
      if (range.from > cursor + EPS) segments.push({ from: cursor, to: range.from });
      cursor = Math.max(cursor, range.to);
    }
    if (cursor < 1 - EPS) segments.push({ from: cursor, to: 1 });

    return segments.map((segment, i) => ({
      ...wall,
      id: `${wall.id}::seg-${i}`,
      sourceWallId: wall.id,
      start: {
        x: wall.start.x + (wall.end.x - wall.start.x) * segment.from,
        y: wall.start.y + (wall.end.y - wall.start.y) * segment.from
      },
      end: {
        x: wall.start.x + (wall.end.x - wall.start.x) * segment.to,
        y: wall.start.y + (wall.end.y - wall.start.y) * segment.to
      }
    }));
  });
}

export function buildRooms(walls, wallThicknessByTypeM, baseUnitM, roomMeta, defaultFloor) {
  return buildRoomRegions(walls, wallThicknessByTypeM, baseUnitM)
    .filter((region) => isRegionBoundedByClosedConnectedWalls(region, walls))
    .filter((region) => !roomMeta[region.key]?.hidden)
    .map((region, i) => {
      const meta = roomMeta[region.key] || {};
      return {
        ...region,
        label: meta.label || `Room ${i + 1}`,
        floor: meta.floor || defaultFloor,
        wallIds: collectRoomWallIds(region, walls)
      };
    });
}

export function buildDrawPreviewMeasurement(toolMode, startPoint, hoverPoint, baseUnitM) {
  if (!(toolMode === 'draw' && startPoint && hoverPoint)) return null;
  const lenPx = dist(startPoint, hoverPoint);
  if (lenPx < EPS) return null;
  return {
    x: (startPoint.x + hoverPoint.x) / 2,
    y: (startPoint.y + hoverPoint.y) / 2 - 8,
    meters: (lenPx / GRID) * baseUnitM
  };
}

export function buildDraggedVertexMeasurements(dragState, dragPreviewPoint, walls, baseUnitM) {
  if (!dragState || !dragPreviewPoint) return [];

  if (dragState.kind === 'vertex') {
    const dx = dragPreviewPoint.x - dragState.anchor.x;
    const dy = dragPreviewPoint.y - dragState.anchor.y;
    const movedPoint = clampPoint({ x: dragState.originalPoint.x + dx, y: dragState.originalPoint.y + dy });

    return walls
      .filter((wall) => dist(wall.start, movedPoint) < EPS || dist(wall.end, movedPoint) < EPS)
      .map((wall) => ({
        id: wall.id,
        x: (wall.start.x + wall.end.x) / 2,
        y: (wall.start.y + wall.end.y) / 2 - 8,
        meters: (dist(wall.start, wall.end) / GRID) * baseUnitM
      }));
  }

  if (dragState.kind === 'wall') {
    const dx = dragPreviewPoint.x - dragState.anchor.x;
    const dy = dragPreviewPoint.y - dragState.anchor.y;
    const movedStart = clampPoint({ x: dragState.original.start.x + dx, y: dragState.original.start.y + dy });
    const movedEnd = clampPoint({ x: dragState.original.end.x + dx, y: dragState.original.end.y + dy });
    const targetId = dragState.original.id;
    const isDraggedWallGeometry = (wall) => (
      (dist(wall.start, movedStart) < EPS && dist(wall.end, movedEnd) < EPS) ||
      (dist(wall.start, movedEnd) < EPS && dist(wall.end, movedStart) < EPS)
    );
    const seen = new Set();

    return walls
      .filter((wall) => {
        if (wall.id === targetId || isDraggedWallGeometry(wall)) return false;
        const touchesStart = dist(wall.start, movedStart) < EPS || dist(wall.end, movedStart) < EPS;
        const touchesEnd = dist(wall.start, movedEnd) < EPS || dist(wall.end, movedEnd) < EPS;
        if (!(touchesStart || touchesEnd)) return false;
        if (seen.has(wall.id)) return false;
        seen.add(wall.id);
        return true;
      })
      .map((wall) => ({
        id: wall.id,
        x: (wall.start.x + wall.end.x) / 2,
        y: (wall.start.y + wall.end.y) / 2 - 8,
        meters: (dist(wall.start, wall.end) / GRID) * baseUnitM
      }));
  }

  return [];
}

export function buildPlacePreviewFixture({
  toolMode,
  hoverRawPoint,
  placeKind,
  activeFurniturePresets,
  furniturePresetId,
  furnitureType,
  furnitureAngleDeg,
  doorType,
  doorHinge,
  doorWidthM,
  windowType,
  windowWidthM,
  findWallAtPoint
}) {
  if (toolMode !== 'place' || !hoverRawPoint) return null;

  if (placeKind === 'furniture') {
    const preset = activeFurniturePresets.find((item) => item.id === furniturePresetId);
    if (!preset) return null;
    return buildPlacedFurnitureFixture({
      id: 'preview-furniture',
      rawPoint: hoverRawPoint,
      preset,
      furnitureType,
      furnitureAngleDeg,
      isPreview: true
    });
  }

  const wall = findWallAtPoint(hoverRawPoint, 14);
  if (!wall) return null;

  if (placeKind === 'door') {
    return buildPlacedDoorFixture({
      id: 'preview-door',
      rawPoint: hoverRawPoint,
      wall,
      doorType,
      doorHinge,
      doorWidthM,
      isPreview: true
    });
  }

  return buildPlacedWindowFixture({
    id: 'preview-window',
    rawPoint: hoverRawPoint,
    wall,
    windowType,
    windowWidthM,
    isPreview: true
  });
}

export function buildRenderFixtures(fixtures, previewFixture) {
  return [...fixtures, ...(previewFixture ? [previewFixture] : [])];
}

export function wallStyleFor(wall, wallThicknessByTypeM, baseUnitM, wallMetersToPx) {
  const width = wallMetersToPx(wallThicknessByTypeM[wall.type], baseUnitM);
  const color = WALL_MATERIALS.find((x) => x.value === wall.material)?.color || '#6e7480';
  return { width, color };
}
