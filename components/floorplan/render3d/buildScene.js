import * as THREE from 'three';

// All geometry here maps plan-space (x, y) meters + height z onto a
// Y-up three.js world as (x, z=height, y) - i.e. plan Y becomes world Z.
// Kept consistent across walls/panels/rooms/roofs so everything lines up.

// A room's floor slab sits just below its nominal elevation so it never
// renders exactly coplanar with the walls' z0 (the other common z-fight seam).
const ROOM_FLOOR_SEAM_EPS = 0.005;

function withPolygonOffset(material) {
  material.polygonOffset = true;
  material.polygonOffsetFactor = 1;
  material.polygonOffsetUnits = 1;
  return material;
}

// Appends a quad (4 coplanar corners, traced in boundary order) to the
// buffers, checking the winding against the face's known outward direction
// and flipping it if needed - this guarantees correct outward-facing
// normals regardless of which order the corners were given in.
function addQuad(positions, indices, corners, outward) {
  const [a, b, c, d] = corners;
  const normal = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2])
    .cross(new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]));
  const ordered = normal.dot(outward) < 0 ? [a, d, c, b] : [a, b, c, d];

  const base = positions.length / 3;
  ordered.forEach((p) => positions.push(p[0], p[1], p[2]));
  indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function orientedBoxGeometry(startM, endM, thicknessM, z0, z1) {
  const dx = endM.x - startM.x;
  const dz = endM.y - startM.y;
  const len = Math.hypot(dx, dz) || 1e-4;
  const ux = dx / len;
  const uz = dz / len;
  const nx = -uz * (thicknessM / 2);
  const nz = ux * (thicknessM / 2);

  const b0 = [startM.x - nx, z0, startM.y - nz];
  const b1 = [startM.x + nx, z0, startM.y + nz];
  const b2 = [endM.x + nx, z0, endM.y + nz];
  const b3 = [endM.x - nx, z0, endM.y - nz];
  const t0 = [startM.x - nx, z1, startM.y - nz];
  const t1 = [startM.x + nx, z1, startM.y + nz];
  const t2 = [endM.x + nx, z1, endM.y + nz];
  const t3 = [endM.x - nx, z1, endM.y - nz];

  const positions = [];
  const indices = [];
  addQuad(positions, indices, [b0, b1, b2, b3], new THREE.Vector3(0, -1, 0));
  addQuad(positions, indices, [t0, t1, t2, t3], new THREE.Vector3(0, 1, 0));
  addQuad(positions, indices, [b0, t0, t1, b1], new THREE.Vector3(-ux, 0, -uz));
  addQuad(positions, indices, [b3, t3, t2, b2], new THREE.Vector3(ux, 0, uz));
  addQuad(positions, indices, [b1, t1, t2, b2], new THREE.Vector3(nx, 0, nz));
  addQuad(positions, indices, [b0, t0, t3, b3], new THREE.Vector3(-nx, 0, -nz));

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// Deliberately flat-shaded: an indexed geometry shares vertices between
// faces of different orientation (e.g. a wall cap's sloped top and its
// vertical side meet at the same corner vertex), so computeVertexNormals
// would average their normals together into a smoothed value that depends
// on that mesh's own local geometry - and since every wall segment is a
// separate mesh with its own sample spacing, neighboring segments smooth by
// different amounts and visibly band under raking light. Converting to
// non-indexed geometry first gives every triangle its own unshared
// vertices, so normals never bleed across a face boundary - matching how
// the plain box walls (which never share vertices between faces either)
// already render with hard, consistent per-face shading.
function meshGeometryFromFaces(vertices, faces) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(
    vertices.flatMap(([x, y, z]) => [x, z, y]),
    3
  ));
  geometry.setIndex(faces.flat());
  const flat = geometry.toNonIndexed();
  flat.computeVertexNormals();
  geometry.dispose();
  return flat;
}

function roomSlabGeometry(polygonM, elevationM, thicknessM) {
  const shape = new THREE.Shape(polygonM.map((p) => new THREE.Vector2(p.x, p.y)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thicknessM, bevelEnabled: false, curveSegments: 1 });
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, elevationM - ROOM_FLOOR_SEAM_EPS, 0);
  return geometry;
}

export function disposeSceneGroup(group) {
  group.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    }
  });
}

export function buildSceneGroup(model3D) {
  const group = new THREE.Group();
  if (!model3D) return group;

  model3D.wallSolids.forEach((solid) => {
    const geometry = orientedBoxGeometry(solid.startM, solid.endM, solid.thicknessM, solid.z0, solid.z1);
    const material = withPolygonOffset(new THREE.MeshStandardMaterial({ color: solid.colorHex, roughness: 0.8, side: THREE.DoubleSide }));
    group.add(new THREE.Mesh(geometry, material));
  });

  model3D.wallPanels.forEach((panel) => {
    const geometry = orientedBoxGeometry(panel.startM, panel.endM, panel.thicknessM, panel.z0, panel.z1);
    const isGlass = panel.kind === 'window';
    const material = withPolygonOffset(isGlass
      ? new THREE.MeshPhysicalMaterial({
        color: '#bfe0e6', transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0, side: THREE.DoubleSide
      })
      : new THREE.MeshStandardMaterial({ color: '#6b4530', roughness: 0.7, side: THREE.DoubleSide }));
    group.add(new THREE.Mesh(geometry, material));
  });

  [...(model3D.wallBodyCaps || []), ...(model3D.wallSlopeCaps || [])].forEach((cap) => {
    if (!cap.mesh?.vertices?.length) return;
    const geometry = meshGeometryFromFaces(cap.mesh.vertices, cap.mesh.faces);
    const material = withPolygonOffset(new THREE.MeshStandardMaterial({ color: cap.colorHex, roughness: 0.8, side: THREE.DoubleSide }));
    group.add(new THREE.Mesh(geometry, material));
  });

  (model3D.stairSolids || []).forEach((solid) => {
    const geometry = orientedBoxGeometry(solid.startM, solid.endM, solid.thicknessM, solid.z0, solid.z1);
    const material = withPolygonOffset(new THREE.MeshStandardMaterial({ color: solid.colorHex, roughness: 0.8, side: THREE.DoubleSide }));
    group.add(new THREE.Mesh(geometry, material));
  });

  (model3D.stairMeshes || []).forEach((entry) => {
    if (!entry.mesh?.vertices?.length) return;
    const geometry = meshGeometryFromFaces(entry.mesh.vertices, entry.mesh.faces);
    const material = withPolygonOffset(new THREE.MeshStandardMaterial({ color: entry.colorHex, roughness: 0.8, side: THREE.DoubleSide }));
    group.add(new THREE.Mesh(geometry, material));
  });

  (model3D.furnitureSolids || []).forEach((solid) => {
    const geometry = orientedBoxGeometry(solid.startM, solid.endM, solid.thicknessM, solid.z0, solid.z1);
    const material = withPolygonOffset(new THREE.MeshStandardMaterial({ color: solid.colorHex, roughness: 0.85, side: THREE.DoubleSide }));
    group.add(new THREE.Mesh(geometry, material));
  });

  model3D.rooms.forEach((room) => {
    if (!room.polygonM || room.polygonM.length < 3) return;
    const geometry = roomSlabGeometry(room.polygonM, room.elevationM, room.thicknessM);
    const material = withPolygonOffset(new THREE.MeshStandardMaterial({ color: room.colorHex, side: THREE.DoubleSide, roughness: 0.9 }));
    group.add(new THREE.Mesh(geometry, material));
  });

  model3D.roofs.forEach((roof) => {
    if (!roof.mesh?.vertices?.length) return;
    const geometry = meshGeometryFromFaces(roof.mesh.vertices, roof.mesh.faces);
    const material = withPolygonOffset(new THREE.MeshStandardMaterial({ color: roof.colorHex, side: THREE.DoubleSide, roughness: 0.75 }));
    group.add(new THREE.Mesh(geometry, material));
  });

  return group;
}
