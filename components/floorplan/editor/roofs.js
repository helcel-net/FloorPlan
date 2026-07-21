import {
  DEFAULT_ROOF_OVERHANG_M,
  DEFAULT_ROOF_PITCH_DEG,
  SNAP_RADIUS
} from '../config/constants';
import { dist } from '../core/geometry';
import { polygonContainsPoint } from '../core/polygonMesh';

// A roof's rise = span-across-the-ridge * tan(pitch), so orienting the ridge
// along the footprint's SHORT axis keeps that span (and the resulting roof
// height) reasonable. Used as the default ridge direction whenever the
// caller hasn't set one explicitly, since leaving it at the ridge running
// the long way is the most common way a shed/gable roof ends up towering
// far above the building.
function longestEdgeAngleDeg(points) {
  let bestLenSq = -1;
  let bestAngle = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = (dx * dx) + (dy * dy);
    if (lenSq > bestLenSq) {
      bestLenSq = lenSq;
      bestAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
    }
  }
  return bestAngle;
}

export function createRoofFromDraft(points, { shape, pitchDeg, ridgeAngleDeg, overhangM }) {
  return {
    id: crypto.randomUUID(),
    shape: shape || 'gable',
    polygon: points.map((p) => ({ x: p.x, y: p.y })),
    pitchDeg: Number(pitchDeg) || DEFAULT_ROOF_PITCH_DEG,
    ridgeAngleDeg: Number(ridgeAngleDeg) || longestEdgeAngleDeg(points),
    eaveHeightM: null,
    overhangM: Number(overhangM) >= 0 ? Number(overhangM) : DEFAULT_ROOF_OVERHANG_M,
    colorHex: '#8a5a3b'
  };
}

export function isNearDraftStart(point, draftPoints) {
  if (draftPoints.length < 3) return false;
  return dist(point, draftPoints[0]) <= SNAP_RADIUS;
}

export function findRoofAtPoint(point, roofs) {
  return [...roofs].reverse().find((roof) => polygonContainsPoint(point, roof.polygon || [])) || null;
}
