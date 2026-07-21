import { localToWorld, pointPxToM, stepCountForRunM } from './geometry';
import { extrudePolygon } from './polygonMesh';

const WEDGE_ARC_SEGMENTS = 3;

// One wedge tread's footprint: an annular sector between rInner and rOuter,
// swept from angleStartDeg to angleEndDeg around pivotM (all already in
// world plan-space and world-space degrees).
function wedgeRingPolygon(pivotM, angleStartDeg, angleEndDeg, rInner, rOuter, segments) {
  const outer = [];
  const inner = [];
  for (let i = 0; i <= segments; i += 1) {
    const deg = angleStartDeg + (((angleEndDeg - angleStartDeg) * i) / segments);
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    outer.push({ x: pivotM.x + (cos * rOuter), y: pivotM.y + (sin * rOuter) });
    inner.push({ x: pivotM.x + (cos * rInner), y: pivotM.y + (sin * rInner) });
  }
  return [...outer, ...inner.reverse()];
}

// A straight flight's steps as plain oriented prisms - reuses the exact
// {startM, endM, thicknessM, z0, z1} shape wall solids already use, so they
// render through the same box-mesh path with no new geometry code needed
// downstream. Local y > 0 is the low (z=0) end and y < 0 is the high end,
// matching the ascent arrow direction already drawn in the 2D plan icon
// (FixtureLayer.jsx's isStraightStairs block). Each step only spans from
// the previous step's height to its own (not down to the ground), so the
// triangular space under the flight stays open for use.
function buildStraightStairs(positionM, angleDeg, widthM, depthM, totalRiseM) {
  const stepCount = stepCountForRunM(depthM);
  const solids = [];
  for (let i = 0; i < stepCount; i += 1) {
    const yFrom = (depthM / 2) - ((depthM * i) / stepCount);
    const yTo = (depthM / 2) - ((depthM * (i + 1)) / stepCount);
    const z0 = (totalRiseM * i) / stepCount;
    const z1 = (totalRiseM * (i + 1)) / stepCount;
    solids.push({
      startM: localToWorld({ x: 0, y: yFrom }, positionM, angleDeg),
      endM: localToWorld({ x: 0, y: yTo }, positionM, angleDeg),
      thicknessM: widthM,
      z0,
      z1
    });
  }
  return solids;
}

// Curved (quarter-turn winder) and spiral stairs both ascend around a
// pivot; each step is a wedge-shaped solid block (an annular sector
// extruded only from the previous step's height up to its own, not from
// the ground), matching the winder-tread geometry already drawn in 2D but
// built as a real solid here instead of just tread lines, while leaving
// the space under the flight open. `angleStartDeg`/`angleEndDeg` are in
// the fixture's own unrotated local frame - the fixture's rotation is
// folded in by rotating both the pivot and the sweep angles together.
function buildWedgeStairs(positionM, angleDeg, pivotLocal, rInner, rOuter, angleStartDeg, angleEndDeg, stepCount, totalRiseM) {
  const pivotWorld = localToWorld(pivotLocal, positionM, angleDeg);
  const meshes = [];
  for (let i = 0; i < stepCount; i += 1) {
    const stepStartDeg = angleStartDeg + (((angleEndDeg - angleStartDeg) * i) / stepCount);
    const stepEndDeg = angleStartDeg + (((angleEndDeg - angleStartDeg) * (i + 1)) / stepCount);
    const z0 = (totalRiseM * i) / stepCount;
    const z1 = (totalRiseM * (i + 1)) / stepCount;
    const ring = wedgeRingPolygon(pivotWorld, stepStartDeg + angleDeg, stepEndDeg + angleDeg, rInner, rOuter, WEDGE_ARC_SEGMENTS);
    meshes.push(extrudePolygon(ring, z0, z1));
  }
  return meshes;
}

// Builds one stairs fixture's 3D geometry: `solids` (plain oriented boxes,
// straight flights only) plus `meshes` (wedge-stack shells, curved/spiral
// runs) - both already in absolute plan-space meters, ready to offset by a
// floor's base elevation like any other piece of the model. `totalRiseM`
// is how far this flight climbs - the enclosing floor's own story height,
// since a stair rises from its own floor's ground up to the next floor.
export function buildStairsGeometry(fixture, baseUnitM, totalRiseM) {
  if (!(totalRiseM > 0)) return { solids: [], meshes: [] };

  const positionM = pointPxToM(fixture.position, baseUnitM);
  const angleDeg = Number(fixture.angleDeg) || 0;
  const widthM = Number(fixture.widthM) || 1;
  const depthM = Number(fixture.depthM) || 1;
  const presetId = fixture.presetId || '';

  if (presetId.startsWith('stairs-curved-') || presetId.startsWith('stairs-spiral-')) {
    const isSpiral = presetId.startsWith('stairs-spiral-');
    const pivotOnRight = presetId.includes('-r-');
    const rOuter = isSpiral ? Math.min(widthM, depthM) / 2 : Math.min(widthM, depthM);
    const rInner = rOuter * (isSpiral ? 0.2 : 0.24);
    const pivotLocal = isSpiral
      ? { x: 0, y: 0 }
      : { x: pivotOnRight ? widthM / 2 : -widthM / 2, y: -depthM / 2 };
    const angleStartDeg = isSpiral ? 0 : (pivotOnRight ? 90 : 0);
    const angleEndDeg = isSpiral ? 360 : angleStartDeg + 90;
    const midR = (rInner + rOuter) / 2;
    const walkingLineM = isSpiral ? 2 * Math.PI * midR : midR * (Math.PI / 2);
    const stepCount = stepCountForRunM(walkingLineM, isSpiral ? 6 : 3);
    const meshes = buildWedgeStairs(positionM, angleDeg, pivotLocal, rInner, rOuter, angleStartDeg, angleEndDeg, stepCount, totalRiseM);
    return { solids: [], meshes };
  }

  return { solids: buildStraightStairs(positionM, angleDeg, widthM, depthM, totalRiseM), meshes: [] };
}
