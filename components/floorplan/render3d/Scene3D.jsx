import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildSceneGroup, disposeSceneGroup } from './buildScene';

export default function Scene3D({
  model3D,
  viewFloorIndex,
  maxViewFloorIndex,
  floorsCount,
  onGoUpFloor,
  onGoDownFloor
}) {
  const containerRef = useRef(null);
  const stateRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#dfe6df');

    const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 500);
    camera.position.set(12, 10, 14);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.update();

    scene.add(new THREE.HemisphereLight('#ffffff', '#6b7268', 1.3));
    const sun = new THREE.DirectionalLight('#ffffff', 1.6);
    sun.position.set(10, 16, 6);
    scene.add(sun);
    const fill = new THREE.DirectionalLight('#dfe8ff', 0.5);
    fill.position.set(-12, 8, -10);
    scene.add(fill);

    const groundGeometry = new THREE.PlaneGeometry(150, 150);
    groundGeometry.rotateX(-Math.PI / 2);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: '#7fac5e', roughness: 1 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    // Room floor slabs extrude *downward* from z=0 (their top, walkable
    // surface) by their own thickness, so a shallow nudge like -0.02 still
    // lands inside a slab's volume rather than below it - well below any
    // slab's underside instead, so the two can never coincide or overlap.
    ground.position.y = -0.3;
    scene.add(ground);

    const grid = new THREE.GridHelper(60, 60, '#9aa79a', '#c3ceC0');
    scene.add(grid);

    const group = new THREE.Group();
    scene.add(group);

    let frame = null;
    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      if (!clientWidth || !clientHeight) return;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();
    frame = requestAnimationFrame(render);

    const fitToModel = () => {
      const box = new THREE.Box3().setFromObject(stateRef.current.group);
      if (box.isEmpty()) return;
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 1);
      controls.target.copy(center);
      camera.position.set(
        center.x + (maxDim * 1.1),
        center.y + (maxDim * 0.9),
        center.z + (maxDim * 1.3)
      );
      camera.near = Math.max(0.05, maxDim / 100);
      camera.far = maxDim * 20;
      camera.updateProjectionMatrix();
      controls.update();
    };

    stateRef.current = { scene, camera, renderer, controls, group, hasFitted: false, fitToModel };

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      controls.dispose();
      disposeSceneGroup(group);
      renderer.dispose();
      container.removeChild(renderer.domElement);
      stateRef.current = null;
    };
  }, []);

  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    const nextGroup = buildSceneGroup(model3D);
    state.scene.remove(state.group);
    disposeSceneGroup(state.group);
    state.scene.add(nextGroup);
    state.group = nextGroup;

    if (!state.hasFitted) {
      state.fitToModel();
      if (!new THREE.Box3().setFromObject(nextGroup).isEmpty()) state.hasFitted = true;
    }
  }, [model3D]);

  const recenterAndFit = () => stateRef.current?.fitToModel();
  const atRoofLevel = viewFloorIndex >= maxViewFloorIndex;
  const floorLabel = atRoofLevel ? 'Roof' : `${viewFloorIndex + 1}/${floorsCount}`;

  return (
    <div className="canvas-wrap">
      <div className="canvas-bottom-actions">
        <button
          type="button"
          className="canvas-icon-btn"
          onClick={recenterAndFit}
          aria-label="Recenter and fit"
          title="Recenter and fit"
        >
          ⤢
        </button>
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
      </div>
      <div ref={containerRef} style={{ flex: '1 1 auto', minHeight: 0, width: '100%' }} />
    </div>
  );
}
