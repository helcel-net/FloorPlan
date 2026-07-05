import { EPS } from '../config/constants';
import { projectPointOnWall, snapToHalfGrid } from './utils';

function buildWallOpeningPlacement(rawPoint, wall) {
  const projected = projectPointOnWall(rawPoint, wall);
  const position = { x: projected.x, y: projected.y };
  const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
  const wallDx = wall.end.x - wall.start.x;
  const wallDy = wall.end.y - wall.start.y;
  const wallLen = Math.hypot(wallDx, wallDy);
  const nx = wallLen > EPS ? (-wallDy / wallLen) : 0;
  const ny = wallLen > EPS ? (wallDx / wallLen) : 0;
  const sideValue = ((rawPoint.x - projected.x) * nx + (rawPoint.y - projected.y) * ny) >= 0 ? 1 : -1;

  return { position, angle, sideValue };
}

function withPreviewFlag(fixture, isPreview) {
  return isPreview ? { ...fixture, isPreview: true } : fixture;
}

export function buildPlacedFurnitureFixture({
  id = crypto.randomUUID(),
  rawPoint,
  preset,
  furnitureType,
  furnitureAngleDeg,
  isPreview = false
}) {
  return withPreviewFlag({
    id,
    kind: 'furniture',
    furnitureType,
    presetId: preset.id,
    widthM: preset.widthM,
    depthM: preset.depthM,
    angleDeg: furnitureAngleDeg,
    position: snapToHalfGrid(rawPoint.x, rawPoint.y)
  }, isPreview);
}

export function buildPlacedDoorFixture({
  id = crypto.randomUUID(),
  rawPoint,
  wall,
  doorType,
  doorHinge,
  doorWidthM,
  isPreview = false
}) {
  const { position, angle, sideValue } = buildWallOpeningPlacement(rawPoint, wall);
  return withPreviewFlag({
    id,
    kind: 'door',
    doorType,
    hinge: doorHinge,
    swingSide: sideValue,
    widthM: Number(doorWidthM),
    wallId: wall.id,
    position,
    angle
  }, isPreview);
}

export function buildPlacedWindowFixture({
  id = crypto.randomUUID(),
  rawPoint,
  wall,
  windowType,
  windowWidthM,
  isPreview = false
}) {
  const { position, angle, sideValue } = buildWallOpeningPlacement(rawPoint, wall);
  return withPreviewFlag({
    id,
    kind: 'window',
    windowType,
    swingSide: sideValue,
    widthM: Number(windowWidthM),
    wallId: wall.id,
    position,
    angle
  }, isPreview);
}

export function rebindOpeningFixtureToWall(fixture, wall) {
  const projected = projectPointOnWall(fixture.position, wall);
  const position = { x: projected.x, y: projected.y };
  const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);

  if (fixture.kind !== 'door' && fixture.kind !== 'window') {
    return { ...fixture, wallId: wall.id, position, angle };
  }

  const prevAngle = Number(fixture.angle) || angle;
  const prevNx = -Math.sin(prevAngle);
  const prevNy = Math.cos(prevAngle);
  const nextNx = -Math.sin(angle);
  const nextNy = Math.cos(angle);
  const prevSide = Number(fixture.swingSide) >= 0 ? 1 : -1;
  const prevOpenX = prevNx * prevSide;
  const prevOpenY = prevNy * prevSide;
  const swingSide = ((prevOpenX * nextNx) + (prevOpenY * nextNy)) >= 0 ? 1 : -1;

  return { ...fixture, wallId: wall.id, position, angle, swingSide };
}
