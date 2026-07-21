import { estimateFurnitureHeightM } from '../editor/catalog';
import { normalizeFurnitureType } from '../editor/utils';
import { localToWorld, pointPxToM, rotateDeg } from './geometry';

const FURNITURE_COLOR_HEX = '#8a7f6e';

function rect(xFrom, xTo, yFrom, yTo, z0, z1) {
  return { xFrom, xTo, yFrom, yTo, z0, z1 };
}

// Converts one local-frame rect (xFrom..xTo = width axis, yFrom..yTo = depth
// axis, local -Y = the back/head edge - matching FixtureLayer.jsx's
// un-rotated left/top convention) into the {startM, endM, thicknessM, z0, z1}
// oriented-box shape wall/stair solids already render through.
function toWorldBox(positionM, angleDeg, localRect, colorHex) {
  const cx = (localRect.xFrom + localRect.xTo) / 2;
  const cy = (localRect.yFrom + localRect.yTo) / 2;
  const center = localToWorld({ x: cx, y: cy }, positionM, angleDeg);
  const halfLen = (localRect.xTo - localRect.xFrom) / 2;
  const u = rotateDeg({ x: 1, y: 0 }, angleDeg);
  return {
    startM: { x: center.x - (u.x * halfLen), y: center.y - (u.y * halfLen) },
    endM: { x: center.x + (u.x * halfLen), y: center.y + (u.y * halfLen) },
    thicknessM: localRect.yTo - localRect.yFrom,
    z0: localRect.z0,
    z1: localRect.z1,
    colorHex
  };
}

// Four corner posts (from legZ0 to legZ1) plus a flat slab on top (from
// topZ0 to topZ1) spanning the same footprint - the shape shared by chairs
// (seat-on-legs) and tables (top-on-legs).
function legsAndTop(xFrom, xTo, yFrom, yTo, legSizeM, legZ0, legZ1, topZ0, topZ1) {
  const half = Math.min(legSizeM, (xTo - xFrom) / 2, (yTo - yFrom) / 2) / 2;
  const legs = [];
  [xFrom + half, xTo - half].forEach((lx) => {
    [yFrom + half, yTo - half].forEach((ly) => {
      legs.push(rect(lx - half, lx + half, ly - half, ly + half, legZ0, legZ1));
    });
  });
  return [...legs, rect(xFrom, xTo, yFrom, yTo, topZ0, topZ1)];
}

// Seat-on-legs plus a backrest slab at the back (-Y) edge - the proportions
// mirror the seat-rect/backrest-arc drawn in FixtureLayer.jsx's chair block
// (seat inset 16-84% width, 34-92% depth) so the 3D silhouette matches the
// 2D icon from directly above.
function chairParts(widthM, depthM, heightM) {
  const seatXFrom = -0.34 * widthM;
  const seatXTo = 0.34 * widthM;
  const seatYFrom = -0.16 * depthM;
  const seatYTo = 0.42 * depthM;
  const seatZ0 = heightM * 0.42;
  const seatZ1 = heightM * 0.5;
  const legSize = Math.min(widthM, depthM) * 0.08;
  return [
    ...legsAndTop(seatXFrom, seatXTo, seatYFrom, seatYTo, legSize, 0, seatZ0, seatZ0, seatZ1),
    rect(seatXFrom, seatXTo, -0.48 * depthM, seatYFrom, seatZ1, heightM)
  ];
}

// Chair plus two full-depth arm slabs along the side edges, matching
// FixtureLayer.jsx's armchair block (near-full-depth arm rects at 10-92%).
function armchairParts(widthM, depthM, heightM) {
  const armWidthM = widthM * 0.12;
  const armYFrom = -0.4 * depthM;
  const armYTo = 0.42 * depthM;
  const armZ0 = heightM * 0.42;
  const armZ1 = heightM * 0.72;
  return [
    ...chairParts(widthM, depthM, heightM),
    rect(-0.5 * widthM, (-0.5 * widthM) + armWidthM, armYFrom, armYTo, armZ0, armZ1),
    rect((0.5 * widthM) - armWidthM, 0.5 * widthM, armYFrom, armYTo, armZ0, armZ1)
  ];
}

// Star-base office chair as four stacked primitives - flat base, center
// pole, seat disc, backrest - approximating the caster-base/seat/backrest
// silhouette FixtureLayer.jsx draws for `office-chair-hag-*`.
function officeChairParts(widthM, depthM, heightM) {
  const r = Math.min(widthM, depthM) / 2;
  const baseR = r * 0.88;
  const poleHalf = r * 0.06;
  const seatR = r * 0.5;
  const seatCy = seatR * 0.25;
  const backHalfW = seatR * 0.85;
  const backHalfH = seatR * 0.45;
  const backCy = -seatR * 0.85;
  const baseZ1 = heightM * 0.06;
  const seatZ0 = heightM * 0.42;
  const seatZ1 = heightM * 0.5;
  return [
    rect(-baseR, baseR, -baseR, baseR, 0, baseZ1),
    rect(-poleHalf, poleHalf, -poleHalf, poleHalf, baseZ1, seatZ0),
    rect(-seatR, seatR, seatCy - seatR, seatCy + seatR, seatZ0, seatZ1),
    rect(-backHalfW, backHalfW, backCy - backHalfH, backCy + backHalfH, seatZ1, heightM)
  ];
}

// Flat top-on-legs, used for every dining/coffee/garden table and desk.
function tableParts(widthM, depthM, heightM) {
  const topThicknessM = Math.max(0.03, heightM * 0.05);
  const legSize = Math.min(widthM, depthM) * 0.06;
  return legsAndTop(
    -0.45 * widthM, 0.45 * widthM, -0.45 * depthM, 0.45 * depthM,
    legSize, 0, heightM - topThicknessM, heightM - topThicknessM, heightM
  );
}

// Tank-over-bowl, matching FixtureLayer.jsx's toilet block (tank flush
// against the back/-Y edge, bowl filling the remaining depth in front).
function toiletParts(widthM, depthM, heightM) {
  const tankHalfW = widthM * 0.4;
  const tankYFrom = -0.5 * depthM;
  const tankYTo = tankYFrom + (0.2 * depthM);
  const bowlHalfW = widthM * 0.36;
  const bowlYFrom = tankYTo + (0.02 * depthM);
  const bowlYTo = 0.48 * depthM;
  return [
    rect(-tankHalfW, tankHalfW, tankYFrom, tankYTo, heightM * 0.55, heightM),
    rect(-bowlHalfW, bowlHalfW, bowlYFrom, bowlYTo, 0, heightM * 0.6)
  ];
}

// Mattress plus a tall headboard slab at the back/-Y edge, matching
// FixtureLayer.jsx's bed block (headboard line right at the top edge).
function bedParts(widthM, depthM, heightM) {
  const mattressZ0 = heightM * 0.3;
  return [
    rect(-0.47 * widthM, 0.47 * widthM, -0.42 * depthM, 0.42 * depthM, mattressZ0, heightM),
    rect(-0.48 * widthM, 0.48 * widthM, -0.5 * depthM, -0.44 * depthM, 0, heightM * 1.9)
  ];
}

// L-shaped chaise sofa as three slabs: a full-depth "foot" strip on the
// chaise side, a shallower "seat" strip on the other side, and a raised
// back-cushion slab along the seat strip's back edge - reproducing the
// notched L-outline FixtureLayer.jsx draws for `sofa-chaise-l-*/-r-*`.
function chaiseParts(widthM, depthM, heightM, chaiseOnRight) {
  const footWidthM = widthM * 0.42;
  const seatDepthM = depthM * 0.62;
  const seatZ1 = heightM * 0.55;
  const backDepthM = seatDepthM * 0.22;
  const halfW = widthM / 2;
  const footXFrom = chaiseOnRight ? halfW - footWidthM : -halfW;
  const footXTo = chaiseOnRight ? halfW : -halfW + footWidthM;
  const seatXFrom = chaiseOnRight ? -halfW : footXTo;
  const seatXTo = chaiseOnRight ? footXFrom : halfW;
  const seatYFrom = -0.5 * depthM;
  const seatYTo = seatYFrom + seatDepthM;
  return [
    rect(footXFrom, footXTo, -0.5 * depthM, 0.5 * depthM, 0, seatZ1),
    rect(seatXFrom, seatXTo, seatYFrom, seatYTo, 0, seatZ1),
    rect(seatXFrom, seatXTo, seatYFrom, seatYFrom + backDepthM, seatZ1, heightM)
  ];
}

const RE_ARMCHAIR = /^chair-armchair-/;
const RE_CHAIR = /^chair-(?!armchair-)/;
const RE_OFFICE_CHAIR = /^office-chair-/;
const RE_CHAISE = /^sofa-chaise-/;
const RE_TOILET = /^toilet-/;
const RE_BED = /^bed-/;
const RE_TABLE = /^(table|coffee-table|office-desk)-/;
const RE_PROJECTOR_SCREEN = /^projector-screen-/;

// A pull-down projector screen hangs from near the ceiling rather than
// sitting on the floor like every other single-box fallback item - raised
// by a fixed sill so it reads as mounted, not as a floor-to-low-wall panel.
const PROJECTOR_SCREEN_SILL_M = 1.0;

function partsForPreset(presetId, widthM, depthM, heightM) {
  const id = presetId || '';
  if (RE_ARMCHAIR.test(id)) return armchairParts(widthM, depthM, heightM);
  if (RE_CHAIR.test(id)) return chairParts(widthM, depthM, heightM);
  if (RE_OFFICE_CHAIR.test(id)) return officeChairParts(widthM, depthM, heightM);
  if (RE_CHAISE.test(id)) return chaiseParts(widthM, depthM, heightM, id.includes('-r-'));
  if (RE_TOILET.test(id)) return toiletParts(widthM, depthM, heightM);
  if (RE_BED.test(id)) return bedParts(widthM, depthM, heightM);
  if (RE_TABLE.test(id)) return tableParts(widthM, depthM, heightM);
  if (RE_PROJECTOR_SCREEN.test(id)) {
    return [rect(-widthM / 2, widthM / 2, -depthM / 2, depthM / 2, PROJECTOR_SCREEN_SILL_M, PROJECTOR_SCREEN_SILL_M + heightM)];
  }
  return [rect(-widthM / 2, widthM / 2, -depthM / 2, depthM / 2, 0, heightM)];
}

// Builds one furniture fixture's 3D geometry as a list of oriented boxes
// (plain plan-space meters, ready to offset by a floor's base elevation
// like any other piece of the model) - most types get a single box, but a
// handful with a very recognizable silhouette (chairs, tables, toilets,
// beds, chaise sofas) get a small stack of boxes instead for a closer match
// to their 2D icon.
export function buildFurnitureParts(fixture, baseUnitM) {
  const positionM = pointPxToM(fixture.position, baseUnitM);
  const angleDeg = Number(fixture.angleDeg) || 0;
  const widthM = Number(fixture.widthM) > 0 ? Number(fixture.widthM) : 0.5;
  const depthM = Number(fixture.depthM) > 0 ? Number(fixture.depthM) : 0.5;
  const heightM = estimateFurnitureHeightM(normalizeFurnitureType(fixture.furnitureType), fixture.presetId);
  const parts = partsForPreset(fixture.presetId, widthM, depthM, heightM);
  return parts.map((localRect) => toWorldBox(positionM, angleDeg, localRect, FURNITURE_COLOR_HEX));
}
