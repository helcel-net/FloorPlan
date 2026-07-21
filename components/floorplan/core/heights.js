import { DEFAULT_WALL_HEIGHT_M } from '../config/constants';

export function resolveWallHeightM(wall, floor) {
  const override = Number(wall?.heightM);
  if (override > 0) return override;
  const floorDefault = Number(floor?.wallHeightM);
  return floorDefault > 0 ? floorDefault : DEFAULT_WALL_HEIGHT_M;
}

export function resolveRoofEaveHeightM(roof, floor) {
  const override = Number(roof?.eaveHeightM);
  if (override > 0) return override;
  const floorDefault = Number(floor?.wallHeightM);
  return floorDefault > 0 ? floorDefault : DEFAULT_WALL_HEIGHT_M;
}

// Room floor slabs raise/lower like walls do: a per-floor default that any
// individual room can override (0 is a valid override, so it's distinguished
// from "no override" via null/undefined rather than a falsy check).
export function resolveRoomElevationM(roomMeta, floor) {
  const override = roomMeta?.elevationM;
  if (override !== null && override !== undefined && Number.isFinite(Number(override))) {
    return Number(override);
  }
  const floorDefault = Number(floor?.floorRaiseM);
  return Number.isFinite(floorDefault) ? floorDefault : 0;
}
