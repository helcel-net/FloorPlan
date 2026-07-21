import { DEFAULT_WALL_HEIGHT_M } from '../config/constants';

function buildFloorId(index) {
  return `floor-${index + 1}`;
}

export function createEmptyPlanFloor(index = 0) {
  return {
    id: buildFloorId(index),
    name: `Floor ${index + 1}`,
    walls: [],
    fixtures: [],
    roomMeta: {},
    wallHeightM: DEFAULT_WALL_HEIGHT_M,
    floorRaiseM: 0,
    roofs: []
  };
}

function normalizePlanFloor(floor, index = 0) {
  return {
    id: floor?.id || buildFloorId(index),
    name: floor?.name || `Floor ${index + 1}`,
    walls: Array.isArray(floor?.walls) ? floor.walls : [],
    fixtures: Array.isArray(floor?.fixtures) ? floor.fixtures : [],
    roomMeta: floor?.roomMeta && typeof floor.roomMeta === 'object' ? floor.roomMeta : {},
    wallHeightM: Number(floor?.wallHeightM) > 0 ? Number(floor.wallHeightM) : DEFAULT_WALL_HEIGHT_M,
    floorRaiseM: Number.isFinite(Number(floor?.floorRaiseM)) ? Number(floor.floorRaiseM) : 0,
    roofs: Array.isArray(floor?.roofs) ? floor.roofs : []
  };
}

export function normalizePlanFloors(plan) {
  if (Array.isArray(plan?.floors) && plan.floors.length) {
    return plan.floors.map((floor, index) => normalizePlanFloor(floor, index));
  }

  return [
    normalizePlanFloor({
      id: plan?.floorId,
      name: 'Floor 1',
      walls: plan?.walls,
      fixtures: plan?.fixtures,
      roomMeta: plan?.roomMeta
    }, 0)
  ];
}

export function clampFloorIndex(index, floorCount) {
  if (!Number.isInteger(index)) return 0;
  if (floorCount <= 0) return 0;
  return Math.max(0, Math.min(floorCount - 1, index));
}
