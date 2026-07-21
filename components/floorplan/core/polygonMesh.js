import { EPS } from '../config/constants';

// Shared plain-polygon helpers: turning a simple 2D polygon into a solid 3D
// shell (used by roofGeometry.js's roof shells and stairs.js's wedge-shaped
// winder/spiral treads), plus point-in-polygon testing (used by roofGeometry.js,
// rooms.js and editor/roofs.js) - each used to be an independently-maintained
// copy; they live here once instead.

export function signedArea(polygon) {
  let area = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    area += (a.x * b.y) - (b.x * a.y);
  }
  return area / 2;
}

export function ensureCCW(polygon) {
  return signedArea(polygon) < 0 ? [...polygon].reverse() : polygon;
}

function isConvexVertex(prev, curr, next) {
  return (((curr.x - prev.x) * (next.y - prev.y)) - ((curr.y - prev.y) * (next.x - prev.x))) > 0;
}

function pointInTriangle(p, a, b, c) {
  const d1 = ((p.x - b.x) * (a.y - b.y)) - ((a.x - b.x) * (p.y - b.y));
  const d2 = ((p.x - c.x) * (b.y - c.y)) - ((b.x - c.x) * (p.y - c.y));
  const d3 = ((p.x - a.x) * (c.y - a.y)) - ((c.x - a.x) * (p.y - a.y));
  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
  return !(hasNeg && hasPos);
}

// Simple ear-clipping triangulation for a simple (possibly concave) polygon.
export function earClipTriangulate(polygon) {
  const ring = ensureCCW(polygon);
  const indices = ring.map((_, i) => i);
  const triangles = [];
  let guard = 0;
  while (indices.length > 3 && guard < 5000) {
    guard += 1;
    let earFound = false;
    for (let i = 0; i < indices.length; i += 1) {
      const prevI = indices[(i - 1 + indices.length) % indices.length];
      const currI = indices[i];
      const nextI = indices[(i + 1) % indices.length];
      const prev = ring[prevI];
      const curr = ring[currI];
      const next = ring[nextI];
      if (!isConvexVertex(prev, curr, next)) continue;

      let containsOther = false;
      for (let j = 0; j < indices.length; j += 1) {
        const testI = indices[j];
        if (testI === prevI || testI === currI || testI === nextI) continue;
        if (pointInTriangle(ring[testI], prev, curr, next)) { containsOther = true; break; }
      }
      if (containsOther) continue;

      triangles.push([prevI, currI, nextI]);
      indices.splice(i, 1);
      earFound = true;
      break;
    }
    if (!earFound) break;
  }
  if (indices.length === 3) triangles.push([indices[0], indices[1], indices[2]]);
  return { ring, triangles };
}

export function flatCapMesh(polygon, z) {
  const { ring, triangles } = earClipTriangulate(polygon);
  const vertices = ring.map((p) => [p.x, p.y, z]);
  const faces = triangles.map(([a, b, c]) => [a, b, c]);
  return { vertices, faces };
}

export function mergeMeshes(meshes) {
  const vertices = [];
  const faces = [];
  meshes.forEach((mesh) => {
    if (!mesh) return;
    const offset = vertices.length;
    vertices.push(...mesh.vertices);
    mesh.faces.forEach(([a, b, c]) => faces.push([a + offset, b + offset, c + offset]));
  });
  return { vertices, faces };
}

// Extrudes an arbitrary simple polygon into a solid slab from z0 to z1 -
// used for flat roof shells and wedge-shaped stair treads alike.
export function extrudePolygon(polygon, z0, z1) {
  const top = flatCapMesh(polygon, z1);
  const bottom = flatCapMesh([...polygon].reverse(), z0);
  const ring = ensureCCW(polygon);
  const sideVerts = [];
  const sideFaces = [];
  ring.forEach((p, i) => {
    const n = ring[(i + 1) % ring.length];
    const base = sideVerts.length;
    sideVerts.push([p.x, p.y, z0], [n.x, n.y, z0], [n.x, n.y, z1], [p.x, p.y, z1]);
    sideFaces.push([base, base + 1, base + 2], [base, base + 2, base + 3]);
  });
  return mergeMeshes([top, bottom, { vertices: sideVerts, faces: sideFaces }]);
}

function pointOnSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const cross = ((point.x - a.x) * dy) - ((point.y - a.y) * dx);
  if (Math.abs(cross) > EPS) return false;
  const dot = ((point.x - a.x) * (point.x - b.x)) + ((point.y - a.y) * (point.y - b.y));
  return dot <= EPS;
}

// Point-in-polygon test (ray casting), with a point exactly on a boundary
// edge always counting as "inside" - without that, a wall or roof edge that
// runs exactly along a polygon boundary is at the mercy of ray-casting's
// unspecified behavior right on that line.
export function polygonContainsPoint(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    if (pointOnSegment(point, a, b)) return true;
    const crosses = ((a.y > point.y) !== (b.y > point.y))
      && (point.x < (((b.x - a.x) * (point.y - a.y)) / (b.y - a.y)) + a.x);
    if (crosses) inside = !inside;
  }
  return inside;
}
