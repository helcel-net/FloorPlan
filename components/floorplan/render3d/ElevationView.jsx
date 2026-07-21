import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildSceneGroup, disposeSceneGroup } from './buildScene';

const FACING_OPTIONS = [
  { value: 'north', label: 'North', dir: [0, 0, -1] },
  { value: 'south', label: 'South', dir: [0, 0, 1] },
  { value: 'east', label: 'East', dir: [1, 0, 0] },
  { value: 'west', label: 'West', dir: [-1, 0, 0] }
];

function fitOrthographicCamera(camera, box, facing, aspect) {
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const option = FACING_OPTIONS.find((f) => f.value === facing) || FACING_OPTIONS[0];
  const dir = new THREE.Vector3(...option.dir);
  const maxDim = Math.max(size.x, size.y, size.z, 1);

  camera.position.copy(center).addScaledVector(dir, maxDim * 2 + 20);
  camera.up.set(0, 1, 0);
  camera.lookAt(center);

  const horizontalExtent = (facing === 'north' || facing === 'south') ? size.x : size.z;
  const pad = Math.max(0.6, maxDim * 0.06);
  let halfW = (horizontalExtent / 2) + pad;
  let halfH = (size.y / 2) + pad;
  if (halfW / halfH > aspect) halfH = halfW / aspect;
  else halfW = halfH * aspect;

  camera.left = -halfW;
  camera.right = halfW;
  camera.top = halfH;
  camera.bottom = -halfH;
  camera.near = 0.1;
  camera.far = (maxDim * 4) + 100;
  camera.updateProjectionMatrix();
}

function addEdgeOverlays(group) {
  const edgeMaterial = new THREE.LineBasicMaterial({ color: '#22302f' });
  const children = [...group.children];
  children.forEach((mesh) => {
    if (!mesh.geometry) return;
    const edges = new THREE.EdgesGeometry(mesh.geometry, 30);
    const lines = new THREE.LineSegments(edges, edgeMaterial);
    mesh.add(lines);
  });
}

export default function ElevationView({
  model3D,
  viewFloorIndex,
  maxViewFloorIndex,
  floorsCount,
  onGoUpFloor,
  onGoDownFloor
}) {
  const containerRef = useRef(null);
  const stateRef = useRef(null);
  const [facing, setFacing] = useState('south');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f7f8f4');

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight('#ffffff', '#6b7268', 1.6));
    const front = new THREE.DirectionalLight('#ffffff', 0.6);
    front.position.set(0, 10, 20);
    scene.add(front);
    const group = new THREE.Group();
    scene.add(group);

    const render = () => renderer.render(scene, camera);

    const refit = () => {
      const { clientWidth, clientHeight } = container;
      if (!clientWidth || !clientHeight) return;
      renderer.setSize(clientWidth, clientHeight);
      const box = new THREE.Box3().setFromObject(scene);
      if (box.isEmpty()) return;
      fitOrthographicCamera(camera, box, stateRef.current.facing, clientWidth / clientHeight);
      render();
    };

    const resizeObserver = new ResizeObserver(refit);
    resizeObserver.observe(container);

    stateRef.current = { scene, camera, renderer, group, facing, refit, render };
    refit();

    return () => {
      resizeObserver.disconnect();
      disposeSceneGroup(group);
      renderer.dispose();
      container.removeChild(renderer.domElement);
      stateRef.current = null;
    };
    // Mount-only: creates the scene/renderer/camera once and seeds stateRef
    // with `facing`'s initial value. Later `facing` changes are handled by
    // the separate [facing] effect below (a cheap camera refit) - adding
    // `facing` here would tear down and rebuild the whole WebGL renderer on
    // every N/S/E/W click instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    const nextGroup = buildSceneGroup(model3D);
    addEdgeOverlays(nextGroup);
    state.scene.remove(state.group);
    disposeSceneGroup(state.group);
    state.scene.add(nextGroup);
    state.group = nextGroup;
    state.refit();
  }, [model3D]);

  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    state.facing = facing;
    state.refit();
  }, [facing]);

  const exportPng = () => {
    const state = stateRef.current;
    if (!state) return;
    state.render();
    const dataUrl = state.renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `elevation-${facing}.png`;
    link.click();
  };

  const atRoofLevel = viewFloorIndex >= maxViewFloorIndex;
  const floorLabel = atRoofLevel ? 'Roof' : `${viewFloorIndex + 1}/${floorsCount}`;

  return (
    <div className="canvas-wrap">
      <div className="canvas-top-actions">
        <div className="place-switches">
          {FACING_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={facing === option.value ? 'place-switch place-switch-active' : 'place-switch'}
              onClick={() => setFacing(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="canvas-top-right-actions">
        <div className="floor-overlay" title={atRoofLevel ? 'Roof level' : `Floor ${viewFloorIndex + 1} of ${floorsCount}`}>
          <button
            type="button"
            className="canvas-icon-btn"
            onClick={onGoUpFloor}
            aria-label={atRoofLevel ? 'Already at roof level' : 'Go up one floor'}
            title={atRoofLevel ? 'Already at roof level' : 'Go up one floor'}
            disabled={atRoofLevel}
          >
            ↑
          </button>
          <div className="floor-indicator">{floorLabel}</div>
          <button
            type="button"
            className="canvas-icon-btn"
            onClick={onGoDownFloor}
            aria-label="Go down one floor"
            title="Go down one floor"
            disabled={viewFloorIndex <= 0}
          >
            ↓
          </button>
        </div>
        <button type="button" className="canvas-icon-btn" onClick={exportPng} aria-label="Export elevation PNG" title="Export elevation PNG">
          ⬇
        </button>
      </div>
      <div ref={containerRef} style={{ flex: '1 1 auto', minHeight: 0, width: '100%' }} />
    </div>
  );
}
