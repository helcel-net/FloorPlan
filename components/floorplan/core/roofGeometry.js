import ClipperLib from 'clipper-lib';
import { ROOF_THICKNESS_M, SEAM_GAP_M } from '../config/constants';
import { resolveRoofEaveHeightM } from './heights';
import { dist } from './geometry';
import {
  earClipTriangulate,
  ensureCCW,
  extrudePolygon,
  flatCapMesh,
  mergeMeshes,
  polygonContainsPoint,
  signedArea
} from './polygonMesh';

// Coordinates here are plan-space meters (x,y). Clipper works on integers,
// so polygon offsetting scales into millimeter ints and back.
const CLIPPER_SCALE = 1000;
const RING_SAMPLES = 32;
const HIP_STEP_M = 0.12;
const HIP_MAX_STEPS = 300;

function rad(deg) {
  return (Number(deg) || 0) * Math.PI / 180;
}

function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

// A plain average of vertices - good enough for a roof ridge/cap center,
// unlike rooms.js's signed-area-weighted centroid which is needed there for
// accuracy on concave room shapes.
function vertexAverageCentroid(polygon) {
  let cx = 0;
  let cy = 0;
  polygon.forEach((p) => { cx += p.x; cy += p.y; });
  return { x: cx / polygon.length, y: cy / polygon.length };
}

// --- Clipper-backed polygon offset (used for eave overhang + hip stepping) ---

function toClipperPath(polygon) {
  return polygon.map((p) => new ClipperLib.IntPoint(
    Math.round(p.x * CLIPPER_SCALE),
    Math.round(p.y * CLIPPER_SCALE)
  ));
}

function fromClipperPath(path) {
  return path.map((p) => ({ x: p.X / CLIPPER_SCALE, y: p.Y / CLIPPER_SCALE }));
}

function offsetPolygon(polygon, distanceM) {
  if (Math.abs(distanceM) < 1e-6 || polygon.length < 3) return [polygon];
  const offset = new ClipperLib.ClipperOffset();
  offset.AddPath(toClipperPath(polygon), ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);
  const solution = new ClipperLib.Paths();
  offset.Execute(solution, distanceM * CLIPPER_SCALE);
  return solution.map(fromClipperPath).filter((p) => p.length >= 3);
}

function largestByArea(polygons) {
  if (!polygons.length) return null;
  return polygons.reduce((best, p) => (
    Math.abs(signedArea(p)) > Math.abs(signedArea(best)) ? p : best
  ));
}

function outsetPolygon(polygon, overhangM) {
  if (!(overhangM > 0)) return polygon;
  const result = largestByArea(offsetPolygon(ensureCCW(polygon), overhangM));
  return result || polygon;
}

// --- Resampling a closed ring to a fixed vertex count (evenly by arc length) ---

function resampleClosedRing(ring, n) {
  if (ring.length < 3) return null;
  const lens = [0];
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    lens.push(lens[i] + dist(a, b));
  }
  const total = lens[ring.length];
  if (total < 1e-6) return null;

  const out = [];
  for (let i = 0; i < n; i += 1) {
    const target = (total * i) / n;
    let seg = 0;
    while (seg < ring.length - 1 && lens[seg + 1] < target) seg += 1;
    const segLen = lens[seg + 1] - lens[seg];
    const t = segLen > 1e-9 ? (target - lens[seg]) / segLen : 0;
    const a = ring[seg];
    const b = ring[(seg + 1) % ring.length];
    out.push({ x: a.x + ((b.x - a.x) * t), y: a.y + ((b.y - a.y) * t) });
  }
  return out;
}

// --- Splits a polygon boundary by a line (sideFn(p) = 0), returning the
// open vertex chain on the requested side, bounded by the two crossing
// points. Used to build the two roof planes + ridge of a gable roof. ---

function crossingPoint(a, b, sideFn) {
  const sA = sideFn(a);
  const sB = sideFn(b);
  const t = sA / (sA - sB);
  return { x: a.x + ((b.x - a.x) * t), y: a.y + ((b.y - a.y) * t) };
}

function halfPlaneChain(polygon, sideFn, keepPositive) {
  const n = polygon.length;
  const sides = polygon.map((p) => sideFn(p) >= 0);
  if (sides.every((s) => s === sides[0])) return null;

  // Walk forward from wherever the boundary enters the kept side, collecting
  // vertices until it exits again - this keeps the chain in true boundary
  // order regardless of which side "owns" the array's wraparound seam.
  let entryIdx = -1;
  for (let i = 0; i < n; i += 1) {
    const prev = sides[(i - 1 + n) % n];
    if (sides[i] === keepPositive && prev !== keepPositive) { entryIdx = i; break; }
  }
  if (entryIdx === -1) return null;

  const chain = [crossingPoint(polygon[(entryIdx - 1 + n) % n], polygon[entryIdx], sideFn)];
  let i = entryIdx;
  for (let guard = 0; guard < n; guard += 1) {
    chain.push(polygon[i]);
    const next = (i + 1) % n;
    if (sides[next] !== keepPositive) {
      chain.push(crossingPoint(polygon[i], polygon[next], sideFn));
      break;
    }
    i = next;
  }
  return chain.length >= 2 ? chain : null;
}

function slopedStrip(chainXY, zBase, ridgeStart, ridgeEnd) {
  const lens = [0];
  for (let i = 1; i < chainXY.length; i += 1) lens.push(lens[i - 1] + dist(chainXY[i - 1], chainXY[i]));
  const total = lens[lens.length - 1] || 1;

  const vertices = [];
  const baseIdx = [];
  const topIdx = [];
  chainXY.forEach((p, i) => {
    const t = lens[i] / total;
    vertices.push([p.x, p.y, zBase]);
    baseIdx.push(vertices.length - 1);
    vertices.push([
      ridgeStart.x + ((ridgeEnd.x - ridgeStart.x) * t),
      ridgeStart.y + ((ridgeEnd.y - ridgeStart.y) * t),
      ridgeStart.z + ((ridgeEnd.z - ridgeStart.z) * t)
    ]);
    topIdx.push(vertices.length - 1);
  });

  const faces = [];
  for (let i = 0; i < chainXY.length - 1; i += 1) {
    faces.push([baseIdx[i], baseIdx[i + 1], topIdx[i + 1]]);
    faces.push([baseIdx[i], topIdx[i + 1], topIdx[i]]);
  }
  return { vertices, faces };
}

// Turns a single open surface (the roof's underside, resting on the wall
// tops) into a proper solid shell by extruding a copy upward by thicknessM
// and closing the gap along the surface's open boundary edges. Without this,
// gable/hip/shed roofs rendered as paper-thin single-sided planes.
function solidifyShell(mesh, thicknessM) {
  const { vertices, faces } = mesh;
  const n = vertices.length;
  const topVertices = vertices.map(([x, y, z]) => [x, y, z + thicknessM]);
  const allVertices = vertices.concat(topVertices);

  const bottomFaces = faces.map(([a, b, c]) => [a, c, b]);
  const topFaces = faces.map(([a, b, c]) => [a + n, b + n, c + n]);

  const directedEdges = new Set();
  faces.forEach(([a, b, c]) => {
    directedEdges.add(`${a},${b}`);
    directedEdges.add(`${b},${c}`);
    directedEdges.add(`${c},${a}`);
  });

  const sideFaces = [];
  faces.forEach(([a, b, c]) => {
    [[a, b], [b, c], [c, a]].forEach(([x, y]) => {
      if (directedEdges.has(`${y},${x}`)) return;
      sideFaces.push([x, y, y + n]);
      sideFaces.push([x, y + n, x + n]);
    });
  });

  return { vertices: allVertices, faces: [...bottomFaces, ...topFaces, ...sideFaces] };
}

// --- Per-shape builders. All take an already overhang-outset footprint. ---

function buildFlatRoof(polygon, eaveHeightM) {
  return extrudePolygon(polygon, eaveHeightM, eaveHeightM + ROOF_THICKNESS_M);
}

// `referencePolygon` (defaults to the boundary itself) anchors the height
// field - the roof's own full footprint, even when `polygon` is a smaller,
// subtracted piece of it (see buildRoofMesh) - so carving a hole out of a
// roof for a floor above never shifts where its low edge/ridge sits.
function buildShedRoof(polygon, eaveHeightM, pitchDeg, ridgeAngleDeg, referencePolygon = polygon) {
  const dir = { x: Math.cos(rad(ridgeAngleDeg)), y: Math.sin(rad(ridgeAngleDeg)) };
  const slope = Math.tan(rad(pitchDeg));
  const minProj = Math.min(...referencePolygon.map((p) => dot(p, dir)));

  const { ring, triangles } = earClipTriangulate(polygon);
  const heightOf = (p) => eaveHeightM + ((dot(p, dir) - minProj) * slope);
  const vertices = ring.map((p) => [p.x, p.y, heightOf(p)]);
  const faces = triangles.map(([a, b, c]) => [a, b, c]);
  return { vertices, faces };
}

function buildGableRoof(polygon, eaveHeightM, pitchDeg, ridgeAngleDeg, referencePolygon = polygon) {
  const dir = { x: Math.cos(rad(ridgeAngleDeg)), y: Math.sin(rad(ridgeAngleDeg)) };
  const perp = { x: -dir.y, y: dir.x };
  const centroid = vertexAverageCentroid(referencePolygon);
  const perpVals = referencePolygon.map((p) => dot(sub(p, centroid), perp));
  const perpCenter = (Math.max(...perpVals) + Math.min(...perpVals)) / 2;
  const halfSpan = (Math.max(...perpVals) - Math.min(...perpVals)) / 2;
  const ridgeHeight = eaveHeightM + (halfSpan * Math.tan(rad(pitchDeg)));

  const sideFn = (p) => dot(sub(p, centroid), perp) - perpCenter;
  const chainA = halfPlaneChain(polygon, sideFn, true);
  let chainB = halfPlaneChain(polygon, sideFn, false);
  if (!chainA || !chainB) return buildHipRoof(polygon, eaveHeightM, pitchDeg);

  // The two chains meet at the same two crossing points, but each was
  // walked independently and may run in opposite directions - align chainB
  // so both chains' start refers to the same physical ridge endpoint as chainA's.
  const chainAStart = chainA[0];
  if (dist(chainB[0], chainAStart) > dist(chainB[chainB.length - 1], chainAStart)) {
    chainB = [...chainB].reverse();
  }

  const ridgeStart = { x: chainA[0].x, y: chainA[0].y, z: ridgeHeight };
  const ridgeEnd = { x: chainA[chainA.length - 1].x, y: chainA[chainA.length - 1].y, z: ridgeHeight };

  const planeA = slopedStrip(chainA, eaveHeightM, ridgeStart, ridgeEnd);
  const planeB = slopedStrip(chainB, eaveHeightM, ridgeStart, ridgeEnd);
  return mergeMeshes([planeA, planeB]);
}

function buildHipRoof(polygon, eaveHeightM, pitchDeg) {
  const slope = Math.tan(rad(pitchDeg));
  let ring = resampleClosedRing(ensureCCW(polygon), RING_SAMPLES);
  if (!ring) return flatCapMesh(polygon, eaveHeightM);

  const meshes = [];
  let z = eaveHeightM;
  let prevRing = ring;
  let prevZ = z;

  for (let step = 0; step < HIP_MAX_STEPS; step += 1) {
    const insetCandidates = offsetPolygon(prevRing, -HIP_STEP_M);
    const inset = largestByArea(insetCandidates);
    if (!inset || Math.abs(signedArea(inset)) < 1e-4) break;
    const resampled = resampleClosedRing(inset, RING_SAMPLES);
    if (!resampled) break;

    z = prevZ + (HIP_STEP_M * slope);
    const vertices = [];
    const faces = [];
    const baseIdx = prevRing.map((p) => vertices.push([p.x, p.y, prevZ]) - 1);
    const topIdx = resampled.map((p) => vertices.push([p.x, p.y, z]) - 1);
    for (let i = 0; i < RING_SAMPLES; i += 1) {
      const j = (i + 1) % RING_SAMPLES;
      faces.push([baseIdx[i], baseIdx[j], topIdx[j]]);
      faces.push([baseIdx[i], topIdx[j], topIdx[i]]);
    }
    meshes.push({ vertices, faces });

    prevRing = resampled;
    prevZ = z;
  }

  const capCentroid = vertexAverageCentroid(prevRing);
  const capZ = prevZ + (HIP_STEP_M * slope * 0.5);
  const capVertices = prevRing.map((p) => [p.x, p.y, prevZ]);
  capVertices.push([capCentroid.x, capCentroid.y, capZ]);
  const apexIdx = capVertices.length - 1;
  const capFaces = [];
  for (let i = 0; i < prevRing.length; i += 1) {
    const j = (i + 1) % prevRing.length;
    capFaces.push([i, j, apexIdx]);
  }
  meshes.push({ vertices: capVertices, faces: capFaces });

  return mergeMeshes(meshes);
}

// Shared setup for both mesh-building and the height-field query below, so
// the two can never drift apart and leave a gap between wall and roof.
// roofHeightAt() calls this once per sample point - dozens of times per
// wall across a whole floor - and `footprint` involves a real ClipperLib
// polygon-offset operation, so it's cached per roof object. Callers always
// build a fresh `{...roof}` object per buildModel3D call (see model3d.js's
// `roofsMeters`), so this cache is naturally scoped to that one call - a
// real edit always produces a new roof object, never a stale hit.
const roofParamsCache = new WeakMap();
function resolveRoofParams(roof, floor) {
  if (roofParamsCache.has(roof)) return roofParamsCache.get(roof);
  const polygon = Array.isArray(roof?.polygon) ? roof.polygon : [];
  const shape = roof?.shape || 'gable';
  // Nudged a hair below the wall top so the roof underside never sits
  // exactly coplanar with the wall-top cap (a common z-fighting seam).
  const eaveHeightM = resolveRoofEaveHeightM(roof, floor) - SEAM_GAP_M;
  const pitchDeg = shape === 'flat' ? 0 : (Number(roof.pitchDeg) || 0);
  const ridgeAngleDeg = Number(roof.ridgeAngleDeg) || 0;
  const overhangM = Number(roof.overhangM) || 0;
  const footprint = polygon.length >= 3 ? ensureCCW(outsetPolygon(ensureCCW(polygon), overhangM)) : [];
  const result = { shape, eaveHeightM, pitchDeg, ridgeAngleDeg, footprint };
  roofParamsCache.set(roof, result);
  return result;
}

// Subtracts each of `holePolygons` from `footprint`, returning the
// remaining piece(s) - used so a lower floor's roof never renders inside
// the footprint of a floor that continues to exist above it (e.g. a low
// wing's roof whose overhang reaches slightly under a taller adjoining
// section). Falls back to the untouched footprint when there's nothing to
// subtract; returns an empty array if the roof is fully covered.
function subtractOnePolygon(subjectPolygons, holePolygon) {
  const clipper = new ClipperLib.Clipper();
  clipper.AddPaths(subjectPolygons.map(toClipperPath), ClipperLib.PolyType.ptSubject, true);
  clipper.AddPath(toClipperPath(holePolygon), ClipperLib.PolyType.ptClip, true);
  const solution = new ClipperLib.Paths();
  clipper.Execute(
    ClipperLib.ClipType.ctDifference,
    solution,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero
  );
  return solution.map(fromClipperPath).filter((p) => p.length >= 3 && Math.abs(signedArea(p)) > 1e-3);
}

function subtractFootprint(footprint, holePolygons) {
  const holes = (holePolygons || []).filter((p) => p.length >= 3).map((p) => ensureCCW(p));
  if (!holes.length) return [footprint];
  // Chained one hole at a time (rather than a single multi-path clip) -
  // each ctDifference call gets a fresh Clipper instance operating on a
  // small, simple subject/clip pair.
  return holes.reduce((pieces, hole) => (pieces.length ? subtractOnePolygon(pieces, hole) : pieces), [ensureCCW(footprint)]);
}

// Builds a plain-array mesh { vertices: [[x,y,z],...], faces: [[i,j,k],...] }
// (plan-space meters) for one roof entity. Framework-agnostic - three.js
// (or any other consumer) converts this into its own geometry format.
// `subtractPolygons` (optional, plan-space meters) carves out any area
// where the floor above still has rooms, so this roof doesn't render
// through it - the height field itself always stays anchored to the
// roof's own full, uncarved footprint (see buildShedRoof/buildGableRoof).
export function buildRoofMesh(roof, floor, subtractPolygons) {
  const { shape, eaveHeightM, pitchDeg, ridgeAngleDeg, footprint } = resolveRoofParams(roof, floor);
  if (footprint.length < 3) return { vertices: [], faces: [] };

  const pieces = subtractFootprint(footprint, subtractPolygons);
  if (!pieces.length) return { vertices: [], faces: [] };

  const buildPiece = (piece) => {
    if (shape === 'flat') return buildFlatRoof(piece, eaveHeightM);
    const shell = shape === 'shed'
      ? buildShedRoof(piece, eaveHeightM, pitchDeg, ridgeAngleDeg, footprint)
      : shape === 'hip'
        ? buildHipRoof(piece, eaveHeightM, pitchDeg)
        : buildGableRoof(piece, eaveHeightM, pitchDeg, ridgeAngleDeg, footprint);
    return solidifyShell(shell, ROOF_THICKNESS_M);
  };

  return mergeMeshes(pieces.map(buildPiece));
}

// Queries the roof's underside height at an arbitrary plan point, using the
// exact same math as the mesh builders above (so a wall built up to this
// height touches the roof with no gap). Returns null outside the roof's
// footprint (no cap needed there). Flat and hip roofs meet the eave line at
// a constant height all the way around their perimeter (hips have no
// vertical gable ends), so they return `eaveHeightM` unconditionally rather
// than a sloped value - that height only equals the wall's own default when
// `eaveHeightM` wasn't overridden, so an explicit override still correctly
// trims (or extends) every wall under it to match.
export function roofHeightAt(roof, floor, point) {
  const { shape, eaveHeightM, pitchDeg, ridgeAngleDeg, footprint } = resolveRoofParams(roof, floor);
  if (footprint.length < 3) return null;
  if (!polygonContainsPoint(point, footprint)) return null;
  if (shape === 'flat' || shape === 'hip') return eaveHeightM;

  if (shape === 'shed') {
    const dir = { x: Math.cos(rad(ridgeAngleDeg)), y: Math.sin(rad(ridgeAngleDeg)) };
    const slope = Math.tan(rad(pitchDeg));
    const minProj = Math.min(...footprint.map((p) => dot(p, dir)));
    return eaveHeightM + ((dot(point, dir) - minProj) * slope);
  }

  // gable
  const dir = { x: Math.cos(rad(ridgeAngleDeg)), y: Math.sin(rad(ridgeAngleDeg)) };
  const perp = { x: -dir.y, y: dir.x };
  const centroid = vertexAverageCentroid(footprint);
  const perpVals = footprint.map((p) => dot(sub(p, centroid), perp));
  const perpCenter = (Math.max(...perpVals) + Math.min(...perpVals)) / 2;
  const halfSpan = (Math.max(...perpVals) - Math.min(...perpVals)) / 2;
  const ridgeHeight = eaveHeightM + (halfSpan * Math.tan(rad(pitchDeg)));
  if (halfSpan < 1e-6) return ridgeHeight;
  const distFromRidge = Math.min(halfSpan, Math.abs(dot(sub(point, centroid), perp) - perpCenter));
  return ridgeHeight - ((distFromRidge / halfSpan) * (ridgeHeight - eaveHeightM));
}
