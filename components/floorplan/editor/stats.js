import { GRID } from '../config/constants';
import { getPlanBounds } from './camera';

export function sumRoomAreaM2(rooms) {
  return rooms.reduce((sum, room) => sum + (Number(room.areaM2) || 0), 0);
}

export function computeBoundingBoxAreaM2({ walls, fixtures, baseUnitM }) {
  const bounds = getPlanBounds(walls, fixtures);
  if (!bounds) return 0;

  const { minX, minY, maxX, maxY } = bounds;
  const widthCells = Math.max(0, (maxX - minX) / GRID);
  const heightCells = Math.max(0, (maxY - minY) / GRID);
  return widthCells * heightCells * baseUnitM * baseUnitM;
}
