import {
  DEFAULT_ROOM_FLOOR_THICKNESS_M,
  DEFAULT_WALL_HEIGHT_M,
  DOOR_HEIGHT_M,
  SEAM_GAP_M,
  WINDOW_HEIGHT_M,
  WINDOW_SILL_M
} from '../config/constants';
import { floorColorHex, wallColorHex } from '../editor/exportBlender';
import { isWallOpeningFixture, projectPointOnWall } from '../editor/utils';
import { buildRooms } from '../editor/derived';
import { dist, mToPx, pointPxToM } from './geometry';
import { buildFurnitureParts } from './furniture3d';
import { resolveRoomElevationM, resolveWallHeightM } from './heights';
import { buildRoofMesh, roofHeightAt } from './roofGeometry';
import { buildStairsGeometry } from './stairs';
import { WINDOW_HEIGHT_PRESETS } from '../editor/catalog';
import { polygonContainsPoint } from './polygonMesh';

const WALL_CAP_SAMPLES = 10;
const STAIR_COLOR_HEX = '#a08662';

// buildRooms (grid rasterization + hole subtraction) is one of the more
// expensive steps here, and buildFloorWindowModel3D always ends up asking
// for the SAME floor's rooms twice in one call - once as `aboveFloor` while
// building the floor below it, and again as the "current" floor a moment
// later. Keyed by the floor object itself (not its id), so a genuine edit -
// which always produces a new floor object - naturally invalidates it,
// while unrelated re-renders of an unchanged floor keep reusing it.
const roomsCache = new WeakMap();
function getRoomsForFloor(floor, wallThicknessByTypeM, baseUnitM, defaultFloor) {
  const configKey = `${baseUnitM}|${defaultFloor}|${JSON.stringify(wallThicknessByTypeM)}`;
  const cached = roomsCache.get(floor);
  if (cached && cached.configKey === configKey) return cached.rooms;
  const rooms = buildRooms(floor.walls || [], wallThicknessByTypeM, baseUnitM, floor.roomMeta || {}, defaultFloor);
  roomsCache.set(floor, { configKey, rooms });
  return rooms;
}

function lerpPoint(a, b, t) {
  return { x: a.x + ((b.x - a.x) * t), y: a.y + ((b.y - a.y) * t) };
}

// A window's sill/height come from its chosen height preset (standard,
// clerestory/ranma, or full-height) rather than a single fixed value for
// every window - `heightM: null` on the "full" preset means "reach the
// wall's own height", i.e. a floor-to-ceiling opening, so that's resolved
// against this wall's actual flatWallHeightM rather than a constant.
function resolveWindowVerticalRange(fixture, flatWallHeightM) {
  const preset = WINDOW_HEIGHT_PRESETS.find((p) => p.value === fixture.windowHeightPreset)
    || WINDOW_HEIGHT_PRESETS.find((p) => p.value === 'standard')
    || { sillM: WINDOW_SILL_M, heightM: WINDOW_HEIGHT_M };
  const sillM = Math.min(preset.sillM, flatWallHeightM);
  const topM = preset.heightM === null
    ? flatWallHeightM
    : Math.min(sillM + preset.heightM, flatWallHeightM);
  return { sillM, topM };
}

function openingRanges(wall, fixtures, baseUnitM, flatWallHeightM) {
  const wallLenPx = Math.max(1e-6, dist(wall.start, wall.end));
  return fixtures
    .filter((fixture) => isWallOpeningFixture(fixture) && fixture.wallId === wall.id)
    .map((fixture) => {
      const widthPx = mToPx(Number(fixture.widthM) || 0.8, baseUnitM);
      const projection = projectPointOnWall(fixture.position, wall);
      const halfT = (widthPx / 2) / wallLenPx;
      const isDoor = fixture.kind === 'door';
      const isOpen = isDoor ? (fixture.doorType || 'open') === 'open' : (fixture.windowType || 'fixed') === 'open';
      const { sillM, topM } = isDoor
        ? { sillM: 0, topM: DOOR_HEIGHT_M }
        : resolveWindowVerticalRange(fixture, flatWallHeightM);
      return {
        from: Math.max(0, projection.t - halfT),
        to: Math.min(1, projection.t + halfT),
        kind: fixture.kind,
        isOpen,
        sillM,
        topM,
        fixture
      };
    })
    .sort((a, b) => a.from - b.from);
}

// Splits one wall into a stack of solid prisms (fill above/below/beside
// every opening) plus separate leaf/glazing panels for closed openings,
// mirroring the sill/header decomposition artifact.html used, but driven
// by real per-wall/per-floor height data instead of hardcoded constants.
//
// Where a roof covers the wall, each "fill to the top" region becomes a
// sloped mesh following the roof's height field exactly across ITS OWN
// sub-range, instead of a flat box up to some shared "ceiling" height. That
// matters because walls are drawn as many short segments - if two adjacent
// segments each picked their own flat ceiling (e.g. the lowest point the
// roof reaches somewhere along their own length), they could disagree at
// the exact corner where they meet, showing up as a visible step. A sloped
// mesh's edge at a given wall endpoint is roofHeightAt() evaluated at that
// literal (x,y) point, so two segments sharing a corner always agree there.
function buildWallPieces(wall, fixtures, baseUnitM, wallThicknessByTypeM, rawFlatWallHeightM, roofHeightAtFn) {
  const thicknessM = Number(wallThicknessByTypeM[wall.type]) || 0.115;
  const colorHex = wallColorHex(wall.material);
  // A wall's own height is exactly the offset the floor above gets stacked
  // at, but that floor's room slabs extrude downward from a slightly lower
  // top surface (their own ROOM_FLOOR_SEAM_EPS) - trimmed a hair short here
  // so the wall's top edge sits safely below that slab instead of poking
  // through it wherever there's no roof to clamp it down instead.
  const flatWallHeightM = rawFlatWallHeightM - SEAM_GAP_M;
  const openings = openingRanges(wall, fixtures, baseUnitM, flatWallHeightM);
  const toPoint = (t) => lerpPoint(wall.start, wall.end, t);
  const toPointM = (t) => pointPxToM(toPoint(t), baseUnitM);

  const solids = [];
  const panels = [];
  // "Body" caps stand in for the ordinary wall itself (just non-box shaped,
  // because a roofed wall's true top can vary along its length) - they must
  // always render, exactly like a plain wall solid would. "Attic" caps are
  // the genuinely roof-dependent extra bit above the normal wall height, and
  // stay tied to roof visibility like the roof mesh itself.
  const bodyCapMeshes = [];
  const atticCapMeshes = [];

  // Under a roof, a fill region is never a single sloped surface running
  // straight from baseZ up to the roof - that would rake the whole wall
  // face on a diagonal even down at head height. Instead it is a "body"
  // capped at the normal flat wall height (sloping down early only where
  // the roof itself dips below that, e.g. a shed's low eave) plus, only
  // where the roof rises above the flat height, a separate "attic" sliver
  // filling that gap - matching how a real wall meets a real roof.
  const addFill = (tFrom, tTo, baseZ) => {
    if (tTo <= tFrom + 1e-6) return;
    if (roofHeightAtFn) {
      const flatCapM = Math.max(baseZ, flatWallHeightM);
      if (flatCapM > baseZ + 1e-6) {
        const bodyTopAtFn = (p) => {
          const roofZ = roofHeightAtFn(p);
          if (!Number.isFinite(roofZ) || roofZ >= flatCapM) return flatCapM;
          return roofZ - SEAM_GAP_M;
        };
        const bodyMesh = buildSlopedWallCap(toPointM(tFrom), toPointM(tTo), thicknessM, baseZ, bodyTopAtFn);
        if (bodyMesh) bodyCapMeshes.push({ colorHex, mesh: bodyMesh });
      }
      const atticTopAtFn = (p) => {
        const roofZ = roofHeightAtFn(p);
        return Number.isFinite(roofZ) ? roofZ - SEAM_GAP_M : flatCapM;
      };
      const atticMesh = buildSlopedWallCap(toPointM(tFrom), toPointM(tTo), thicknessM, flatCapM, atticTopAtFn);
      if (atticMesh) atticCapMeshes.push({ colorHex, mesh: atticMesh });
      return;
    }
    if (flatWallHeightM > baseZ + 1e-6) {
      solids.push({ tFrom, tTo, z0: baseZ, z1: flatWallHeightM });
    }
  };

  let cursor = 0;
  openings.forEach((op) => {
    let topM = op.topM;
    if (roofHeightAtFn) {
      const centerM = toPointM((op.from + op.to) / 2);
      const roofZ = roofHeightAtFn(centerM);
      if (Number.isFinite(roofZ)) topM = Math.min(topM, Math.max(op.sillM, roofZ - SEAM_GAP_M));
    }

    addFill(cursor, op.from, 0);
    if (op.sillM > 1e-6) {
      solids.push({ tFrom: op.from, tTo: op.to, z0: 0, z1: op.sillM });
    }
    addFill(op.from, op.to, topM);
    if (!op.isOpen) {
      panels.push({
        tFrom: op.from,
        tTo: op.to,
        z0: op.sillM,
        z1: topM,
        kind: op.kind
      });
    }
    cursor = Math.max(cursor, op.to);
  });
  addFill(cursor, 1, 0);

  const toPrism = (piece) => ({
    startM: toPointM(piece.tFrom),
    endM: toPointM(piece.tTo),
    thicknessM,
    z0: piece.z0,
    z1: piece.z1
  });

  return {
    solids: solids.filter((p) => p.tTo > p.tFrom + 1e-6 && p.z1 > p.z0 + 1e-6).map((p) => ({ ...toPrism(p), colorHex })),
    panels: panels.filter((p) => p.tTo > p.tFrom + 1e-6).map((p) => ({
      ...toPrism(p),
      thicknessM: thicknessM * 0.4,
      kind: p.kind
    })),
    bodyCapMeshes,
    atticCapMeshes
  };
}

// Builds a mesh spanning from a flat baseZ up to a per-point top height (a
// gable end, or any wall under a shed roof) - without this, a wall under a
// gable roof stops flat at the eave and leaves the triangular gap up to the
// ridge wide open. Samples the roof's height field along BOTH long faces of
// the wall (not just its centerline - a roof's height can change across the
// wall's thickness too, e.g. a shed's cross-slope wall) and builds a sloped
// prism spanning from baseZ up to it on each face independently. `topAtFn`
// must already be fully resolved (seam-gap subtracted where it touches an
// actual roof surface, clamped otherwise) - this only floors it at baseZ.
function buildSlopedWallCap(startM, endM, thicknessM, baseZ, topAtFn) {
  const dx = endM.x - startM.x;
  const dy = endM.y - startM.y;
  const len = Math.hypot(dx, dy) || 1e-6;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy * (thicknessM / 2);
  const ny = ux * (thicknessM / 2);

  const resolveTop = (p) => Math.max(baseZ, topAtFn(p));

  const samples = [];
  for (let i = 0; i <= WALL_CAP_SAMPLES; i += 1) {
    const t = i / WALL_CAP_SAMPLES;
    const cx = startM.x + (dx * t);
    const cy = startM.y + (dy * t);
    const leftP = { x: cx - nx, y: cy - ny };
    const rightP = { x: cx + nx, y: cy + ny };
    samples.push({ leftP, rightP, leftTop: resolveTop(leftP), rightTop: resolveTop(rightP) });
  }
  if (samples.every(({ leftTop, rightTop }) => leftTop <= baseZ + 1e-3 && rightTop <= baseZ + 1e-3)) return null;

  const vertices = [];
  const faces = [];
  const bl = [];
  const br = [];
  const tl = [];
  const tr = [];
  samples.forEach(({ leftP, rightP, leftTop, rightTop }) => {
    bl.push(vertices.push([leftP.x, leftP.y, baseZ]) - 1);
    br.push(vertices.push([rightP.x, rightP.y, baseZ]) - 1);
    tl.push(vertices.push([leftP.x, leftP.y, leftTop]) - 1);
    tr.push(vertices.push([rightP.x, rightP.y, rightTop]) - 1);
  });

  for (let i = 0; i < WALL_CAP_SAMPLES; i += 1) {
    const j = i + 1;
    faces.push([tl[i], tr[i], tr[j]], [tl[i], tr[j], tl[j]]);
    faces.push([bl[i], br[j], br[i]], [bl[i], bl[j], br[j]]);
    faces.push([bl[i], tl[i], tl[j]], [bl[i], tl[j], bl[j]]);
    faces.push([br[i], br[j], tr[j]], [br[i], tr[j], tr[i]]);
  }
  faces.push([bl[0], br[0], tr[0]], [bl[0], tr[0], tl[0]]);
  const last = WALL_CAP_SAMPLES;
  faces.push([bl[last], tr[last], br[last]], [bl[last], tl[last], tr[last]]);

  return { vertices, faces };
}

// Points along both long faces of a wall (not just its centerline - a
// roof's height can vary across the wall's thickness too), used both to
// decide whether a roof covers this wall and to sample its height there.
function wallEdgeSamplePoints(startM, endM, thicknessM) {
  const dx = endM.x - startM.x;
  const dy = endM.y - startM.y;
  const len = Math.hypot(dx, dy) || 1e-6;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy * (thicknessM / 2);
  const ny = ux * (thicknessM / 2);

  const points = [];
  for (let i = 0; i <= WALL_CAP_SAMPLES; i += 1) {
    const t = i / WALL_CAP_SAMPLES;
    const cx = startM.x + (dx * t);
    const cy = startM.y + (dy * t);
    points.push({ x: cx - nx, y: cy - ny }, { x: cx + nx, y: cy + ny });
  }
  return points;
}

// Whether any roof covers this wall at all (sampling both long faces along
// its length, not just the centerline) - used only to decide whether to
// enter the roofed wall-cap path at all.
function isWallRoofed(roofsMeters, floor, startM, endM, thicknessM) {
  const points = wallEdgeSamplePoints(startM, endM, thicknessM);
  return roofsMeters.some((roof) => points.some((p) => Number.isFinite(roofHeightAt(roof, floor, p))));
}

// A wall's cap height at any given point is the TALLEST of every roof that
// actually covers that point there - not just whichever single roof "owns"
// the wall as a whole. Two independently-configured roofs meeting at a
// shared corner (e.g. a low porch roof against a taller adjoining section)
// don't coordinate with each other, so binding an entire wall to one
// roof's height field can leave a visible height cliff (and a rendering
// gap) right at that shared corner; querying per-point instead makes the
// transition ramp smoothly across the boundary. Prefers roofs whose own
// drawn footprint (before overhang) contains the point over ones that only
// reach it via overhang bleed, for the same reason overhang-only matches
// were deprioritized before - otherwise a neighboring roof's overhang could
// win the max purely by sweeping past a point it doesn't really own.
function roofHeightAtAnyRoof(roofsMeters, floor, point) {
  const ownFootprintRoofs = roofsMeters.filter((roof) => polygonContainsPoint(point, roof.polygon));
  const pool = ownFootprintRoofs.length ? ownFootprintRoofs : roofsMeters;
  let tallest = null;
  pool.forEach((roof) => {
    const z = roofHeightAt(roof, floor, point);
    if (Number.isFinite(z) && (tallest === null || z > tallest)) tallest = z;
  });
  return tallest;
}

function buildRoomFloors(floor, wallThicknessByTypeM, baseUnitM, defaultFloor) {
  const rooms = getRoomsForFloor(floor, wallThicknessByTypeM, baseUnitM, defaultFloor);
  return rooms.map((room) => ({
    polygonM: (room.vertices || []).map((v) => pointPxToM(v, baseUnitM)),
    colorHex: floorColorHex(room.floor),
    label: room.label,
    elevationM: resolveRoomElevationM(floor.roomMeta?.[room.key], floor),
    thicknessM: DEFAULT_ROOM_FLOOR_THICKNESS_M
  }));
}

// Builds a plain, three.js-agnostic description of one floor's 3D model:
// wall prisms (with openings already cut), door/window panels, room floor
// slabs, and roof meshes. Shared by the in-app 3D viewport and the
// elevation view so both render from the exact same geometry.
function buildModel3D(floor, { baseUnitM, wallThicknessByTypeM, defaultFloor }, aboveFloor) {
  const walls = floor?.walls || [];
  const fixtures = floor?.fixtures || [];
  const roofsMeters = (floor?.roofs || []).map((roof) => ({
    ...roof,
    polygon: (roof.polygon || []).map((v) => pointPxToM(v, baseUnitM))
  }));

  // A floor's roof must never render inside the footprint of a floor that
  // continues to exist above it (e.g. a low single-story wing's roof whose
  // overhang reaches slightly under a taller adjoining section) - carved out
  // per-roof in buildRoofMesh below using the floor-above's own room shapes.
  const aboveRoomPolygonsM = aboveFloor
    ? getRoomsForFloor(aboveFloor, wallThicknessByTypeM, baseUnitM, defaultFloor)
      .map((room) => (room.vertices || []).map((v) => pointPxToM(v, baseUnitM)))
      .filter((poly) => poly.length >= 3)
    : [];

  // Same reasoning as the roof carve-out above, applied to wall caps: a
  // wall that happens to sit under where the floor above continues isn't
  // really under an open roof there, so it must not chase the roof's
  // height field upward either - that would poke the cap up through the
  // floor above's own slab. Points under that footprint are treated as
  // "not covered", so those wall stretches fall back to a plain flat top.
  const isUnderAboveFloor = (p) => aboveRoomPolygonsM.some((poly) => polygonContainsPoint(p, poly));

  const wallPieces = walls.map((wall) => {
    const flatWallHeightM = resolveWallHeightM(wall, floor);
    const startM = pointPxToM(wall.start, baseUnitM);
    const endM = pointPxToM(wall.end, baseUnitM);
    const thicknessM = Number(wallThicknessByTypeM[wall.type]) || 0.115;

    // A wall with its own explicit height override (a half-height wall used
    // as a railing/parapet, say) is deliberately that height - it must never
    // chase a roof upward to meet it, unlike ordinary walls that inherit the
    // floor's default height and are expected to reach whatever's above them.
    const hasFixedHeight = Number(wall?.heightM) > 0;
    const roofed = !hasFixedHeight
      && roofsMeters.length > 0
      && isWallRoofed(roofsMeters, floor, startM, endM, thicknessM);
    const roofHeightAtFn = roofed
      ? (p) => (isUnderAboveFloor(p) ? null : roofHeightAtAnyRoof(roofsMeters, floor, p))
      : null;

    return buildWallPieces(wall, fixtures, baseUnitM, wallThicknessByTypeM, flatWallHeightM, roofHeightAtFn);
  });

  const roofs = roofsMeters.map((roof) => ({
    id: roof.id,
    colorHex: roof.colorHex || '#8a5a3b',
    mesh: buildRoofMesh(roof, floor, aboveRoomPolygonsM)
  }));

  // A stair fixture climbs from its own floor's ground up to the next
  // floor's level, so it rises exactly this floor's own story height -
  // the same value computeFloorBaseElevations sums to stack floors.
  const storyHeightM = Number(floor?.wallHeightM) > 0 ? Number(floor.wallHeightM) : DEFAULT_WALL_HEIGHT_M;
  const stairPieces = fixtures
    .filter((fixture) => fixture.kind === 'furniture' && fixture.furnitureType === 'stairs')
    .map((fixture) => buildStairsGeometry(fixture, baseUnitM, storyHeightM));

  const furnitureSolids = fixtures
    .filter((fixture) => fixture.kind === 'furniture' && fixture.furnitureType !== 'stairs')
    .flatMap((fixture) => buildFurnitureParts(fixture, baseUnitM));

  return {
    wallSolids: wallPieces.flatMap((p) => p.solids),
    wallPanels: wallPieces.flatMap((p) => p.panels),
    wallBodyCaps: wallPieces.flatMap((p) => p.bodyCapMeshes),
    wallSlopeCaps: wallPieces.flatMap((p) => p.atticCapMeshes),
    rooms: buildRoomFloors(floor, wallThicknessByTypeM, baseUnitM, defaultFloor),
    roofs,
    stairSolids: stairPieces.flatMap((p) => p.solids.map((solid) => ({ ...solid, colorHex: STAIR_COLOR_HEX }))),
    stairMeshes: stairPieces.flatMap((p) => p.meshes.map((mesh) => ({ colorHex: STAIR_COLOR_HEX, mesh }))),
    furnitureSolids
  };
}

function offsetPrismZ(prism, baseZ) {
  return { ...prism, z0: prism.z0 + baseZ, z1: prism.z1 + baseZ };
}

// Shifts a {mesh: {vertices, faces}, ...} entry's height by baseZ - used for
// both roofs and the sloped wall caps, which share that same plain shape.
function offsetMeshEntryZ(entry, baseZ) {
  return {
    ...entry,
    mesh: {
      vertices: entry.mesh.vertices.map(([x, y, z]) => [x, y, z + baseZ]),
      faces: entry.mesh.faces
    }
  };
}

function appendOffsetFloor(target, floor, config, offsetZ, { includeRoofs = true } = {}, aboveFloor) {
  const model = buildModel3D(floor, config, aboveFloor);
  target.wallSolids.push(...model.wallSolids.map((p) => offsetPrismZ(p, offsetZ)));
  target.wallPanels.push(...model.wallPanels.map((p) => offsetPrismZ(p, offsetZ)));
  target.wallBodyCaps.push(...model.wallBodyCaps.map((c) => offsetMeshEntryZ(c, offsetZ)));
  target.rooms.push(...model.rooms.map((r) => ({ ...r, elevationM: r.elevationM + offsetZ })));
  target.stairSolids.push(...model.stairSolids.map((p) => offsetPrismZ(p, offsetZ)));
  target.stairMeshes.push(...model.stairMeshes.map((c) => offsetMeshEntryZ(c, offsetZ)));
  target.furnitureSolids.push(...model.furnitureSolids.map((p) => offsetPrismZ(p, offsetZ)));
  if (includeRoofs) {
    target.roofs.push(...model.roofs.map((r) => offsetMeshEntryZ(r, offsetZ)));
    target.wallSlopeCaps.push(...model.wallSlopeCaps.map((c) => offsetMeshEntryZ(c, offsetZ)));
  }
}

// Cumulative base elevation for every floor - story N's base is the sum of
// the wall heights (each floor's own default, not per-wall overrides) of
// every floor below it.
function computeFloorBaseElevations(floors) {
  const baseZByIndex = [];
  let z = 0;
  (floors || []).forEach((floor, i) => {
    baseZByIndex[i] = z;
    const storyHeightM = Number(floor?.wallHeightM) > 0 ? Number(floor.wallHeightM) : DEFAULT_WALL_HEIGHT_M;
    z += storyHeightM;
  });
  return baseZByIndex;
}

// Windowed for the 3D/plan-style "walk through the building" view: shows
// only the current floor plus the one below it (so you always see how the
// current story rests on the previous one, without every other floor
// cluttering the view). Paging one step past the top real floor (viewIndex
// === floors.length) is the "roof level" - same two floors, but with the
// roof(s) drawn on the top floor added in. The visible pair is re-based so
// its lower floor sits at z=0, so the camera doesn't have to keep climbing
// as you page up a tall building.
export function buildFloorWindowModel3D(floors, config, viewIndex) {
  const list = floors || [];
  const target = {
    wallSolids: [], wallPanels: [], wallBodyCaps: [], wallSlopeCaps: [], rooms: [], roofs: [],
    stairSolids: [], stairMeshes: [], furnitureSolids: []
  };
  if (!list.length) return target;

  const baseZByIndex = computeFloorBaseElevations(list);
  const topIndex = list.length - 1;
  const roofLevel = viewIndex >= list.length;
  const currentIndex = Math.min(Math.max(viewIndex, 0), topIndex);
  const indicesToShow = currentIndex - 1 >= 0 ? [currentIndex - 1, currentIndex] : [currentIndex];
  const rebase = baseZByIndex[indicesToShow[0]];

  indicesToShow.forEach((i) => {
    appendOffsetFloor(target, list[i], config, baseZByIndex[i] - rebase, { includeRoofs: roofLevel }, list[i + 1]);
  });

  return target;
}
