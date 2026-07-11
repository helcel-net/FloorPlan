import { FLOOR_MATERIALS, GRID, WALL_MATERIALS } from '../config/constants';
import { buildRooms } from './derived';

const FORMAT_VERSION = 1;

function wallColorHex(material) {
  return WALL_MATERIALS.find((item) => item.value === material)?.color || '#6e7480';
}

function floorColorHex(material) {
  return FLOOR_MATERIALS.find((item) => item.value === material)?.color || '#d8b082';
}

function toMeters(baseUnitM) {
  return (px) => (px / GRID) * baseUnitM;
}

function toPx(baseUnitM) {
  return (m) => (m / baseUnitM) * GRID;
}

function pointToMeters(point, toM) {
  return { x: toM(point.x), y: toM(point.y) };
}

function pointToPx(point, fromM) {
  return { x: fromM(point.x), y: fromM(point.y) };
}

function buildFloorExport(floor, wallThicknessByTypeM, baseUnitM, defaultFloor) {
  const toM = toMeters(baseUnitM);
  const walls = floor.walls || [];
  const fixtures = floor.fixtures || [];

  const wallsExport = walls.map((wall) => ({
    id: wall.id,
    startM: pointToMeters(wall.start, toM),
    endM: pointToMeters(wall.end, toM),
    thicknessM: Number(wallThicknessByTypeM[wall.type]) || 0.115,
    type: wall.type,
    material: wall.material,
    colorHex: wallColorHex(wall.material)
  }));

  const openingsExport = fixtures
    .filter((fixture) => fixture.kind === 'door' || fixture.kind === 'window')
    .map((fixture) => ({
      id: fixture.id,
      kind: fixture.kind,
      wallId: fixture.wallId,
      positionM: pointToMeters(fixture.position, toM),
      angleRad: fixture.angle || 0,
      widthM: Number(fixture.widthM) || 0.8,
      doorType: fixture.kind === 'door' ? fixture.doorType : null,
      hinge: fixture.kind === 'door' ? (fixture.hinge || 'left') : null,
      windowType: fixture.kind === 'window' ? fixture.windowType : null,
      swingSide: Number(fixture.swingSide) >= 0 ? 1 : -1
    }));

  const rooms = buildRooms(walls, wallThicknessByTypeM, baseUnitM, floor.roomMeta || {}, defaultFloor);
  const roomsExport = rooms.map((room) => ({
    key: room.key,
    label: room.label,
    material: room.floor,
    colorHex: floorColorHex(room.floor),
    areaM2: room.areaM2,
    polygonM: (room.vertices || []).map((v) => pointToMeters(v, toM))
  }));

  return {
    id: floor.id,
    name: floor.name,
    walls: wallsExport,
    openings: openingsExport,
    rooms: roomsExport
  };
}

export function buildBlenderExportData({ name, floors, baseUnitM, wallThicknessByTypeM, defaultFloor }) {
  return {
    formatVersion: FORMAT_VERSION,
    name: name || 'Untitled Plan',
    baseUnitM,
    defaultFloor,
    wallThicknessByTypeM,
    floors: (floors || []).map((floor, index) => ({
      index,
      ...buildFloorExport(floor, wallThicknessByTypeM, baseUnitM, defaultFloor)
    }))
  };
}

export function exportPlan({ name, floors, baseUnitM, wallThicknessByTypeM, defaultFloor }) {
  const data = buildBlenderExportData({ name, floors, baseUnitM, wallThicknessByTypeM, defaultFloor });
  const filenameBase = (name || 'floor-plan').trim().replace(/\s+/g, '-').toLowerCase() || 'floor-plan';
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filenameBase}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

// Reconstructs the editor's native (px-based) plan shape from an exported
// JSON file, so the same export doubles as a re-importable backup and as
// the Blender script's input. Room polygons aren't carried back in -
// they're always re-derived from walls at load time - only the per-room
// label/floor-material metadata (roomMeta) needs reconstructing here.
export function importPlanFromJson(data) {
  if (!data || !Array.isArray(data.floors)) {
    throw new Error('Not a recognized floor plan export (missing a "floors" list).');
  }
  const baseUnitM = Number(data.baseUnitM) || 0.25;
  const fromM = toPx(baseUnitM);

  const floors = data.floors.map((floor, index) => {
    const walls = (floor.walls || []).map((wall) => ({
      id: wall.id,
      start: pointToPx(wall.startM, fromM),
      end: pointToPx(wall.endM, fromM),
      type: wall.type,
      material: wall.material
    }));

    const fixtures = (floor.openings || []).map((opening) => ({
      id: opening.id,
      kind: opening.kind,
      wallId: opening.wallId,
      position: pointToPx(opening.positionM, fromM),
      angle: Number(opening.angleRad) || 0,
      widthM: Number(opening.widthM) || 0.8,
      doorType: opening.doorType || undefined,
      hinge: opening.hinge || undefined,
      windowType: opening.windowType || undefined,
      swingSide: Number(opening.swingSide) >= 0 ? 1 : -1
    }));

    const roomMeta = {};
    (floor.rooms || []).forEach((room) => {
      if (!room.key) return;
      roomMeta[room.key] = { label: room.label, floor: room.material };
    });

    return {
      id: floor.id || `floor-${index + 1}`,
      name: floor.name || `Floor ${index + 1}`,
      walls,
      fixtures,
      roomMeta
    };
  });

  return {
    name: data.name || 'Imported Plan',
    floors,
    defaultFloor: data.defaultFloor || 'tatami',
    baseUnitM,
    wallThicknessByTypeM: {
      inner: Number(data.wallThicknessByTypeM?.inner) || 0.115,
      outer: Number(data.wallThicknessByTypeM?.outer) || 0.24
    }
  };
}

export function importPlanFromFile(file) {
  return file.text().then((text) => importPlanFromJson(JSON.parse(text)));
}
