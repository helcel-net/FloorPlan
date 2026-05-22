'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  BASE_UNIT_OPTIONS,
  FLOOR_MATERIALS,
  GRID,
  VIEW_H,
  VIEW_W,
  EPS
} from './floorplan/config/constants';
import {
  clampPoint,
  cloneWalls,
  dist,
  getSvgPoint,
  snapToGrid
} from './floorplan/core/geometry';
import { normalizeAndSplitWalls, wallMetersToPx } from './floorplan/core/walls';
import {
  DOOR_PRESETS_M,
  FURNITURE_PRESETS,
  WINDOW_PRESETS_M
} from './floorplan/editor/catalog';
import {
  findWallAtPointInSet,
  normalizeAngleDeg,
  projectPointOnWall,
  snapToHalfGrid
} from './floorplan/editor/utils';
import {
  buildDraggedVertexMeasurements,
  buildDrawPreviewMeasurement,
  buildEffectiveWalls,
  buildFloorColorByValue,
  buildPlacePreviewFixture,
  buildRenderFixtures,
  buildRooms,
  wallStyleFor
} from './floorplan/editor/derived';
import {
  findFixtureAtPointInFixtures,
  findVertexAtPointInWalls,
  findWallAtPointInWalls,
  getSnappedPointForEvent
} from './floorplan/editor/hitTest';
import { buildDefaultCamera, buildFittedCamera } from './floorplan/editor/camera';
import { exportSvgAsPng } from './floorplan/editor/export';
import { computeBoundingBoxAreaM2, sumRoomAreaM2 } from './floorplan/editor/stats';
import { scalePlanForBaseUnit } from './floorplan/editor/transforms';
import { loadLatestPlanFromStorage, savePlanToStorage } from './floorplan/storage/planPersistence';
import EditorPanel from './floorplan/ui/EditorPanel';
import FloorPlanCanvas from './floorplan/ui/FloorPlanCanvas';

export default function FloorPlanEditor() {
  const DEFAULT_BASE_UNIT_M = Number(BASE_UNIT_OPTIONS.find((option) => option.default)?.value) || 1;
  const DEFAULT_CANVAS_ASPECT = VIEW_W / VIEW_H;
  const MIN_CAMERA_SIZE_CELLS = 12;
  const FIT_MARGIN_CELLS = 2;
  const MAX_CAMERA_SIZE_CELLS = 400;
  const [planName, setPlanName] = useState('My Home');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toolMode, setToolMode] = useState('draw');
  const [newWallType, setNewWallType] = useState('inner');
  const [newWallMaterial, setNewWallMaterial] = useState('wood');
  const [placeKind, setPlaceKind] = useState('door');
  const [doorType, setDoorType] = useState('open');
  const [doorHinge, setDoorHinge] = useState('left');
  const [doorWidthM, setDoorWidthM] = useState(DOOR_PRESETS_M[1].value);
  const [windowWidthM, setWindowWidthM] = useState(WINDOW_PRESETS_M[2].value);
  const [furnitureType, setFurnitureType] = useState('living');
  const [furniturePresetId, setFurniturePresetId] = useState(FURNITURE_PRESETS.living[0].id);
  const [furnitureAngleDeg, setFurnitureAngleDeg] = useState(0);
  const [defaultFloor, setDefaultFloor] = useState('tatami');
  const [baseUnitM, setBaseUnitM] = useState(DEFAULT_BASE_UNIT_M);
  const [wallThicknessByTypeM, setWallThicknessByTypeM] = useState(() => ({
    inner: 0.115,
    outer: 0.24
  }));
  const [walls, setWalls] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [roomMeta, setRoomMeta] = useState({});
  const [selectedWallId, setSelectedWallId] = useState(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState(null);
  const [selectedRoomKey, setSelectedRoomKey] = useState(null);
  const [hoverWallId, setHoverWallId] = useState(null);
  const [hoverRoomKey, setHoverRoomKey] = useState(null);
  const [startPoint, setStartPoint] = useState(null);
  const [hoverPoint, setHoverPoint] = useState(null);
  const [hoverRawPoint, setHoverRawPoint] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [dragPreviewPoint, setDragPreviewPoint] = useState(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, w: VIEW_W, h: VIEW_H });
  const [canvasAspect, setCanvasAspect] = useState(DEFAULT_CANVAS_ASPECT);
  const [panState, setPanState] = useState(null);
  const svgRef = useRef(null);
  const settingsButtonRef = useRef(null);
  const settingsPopoverRef = useRef(null);
  const suppressCanvasClickRef = useRef(false);
  const shouldRecenterAfterDataLoadRef = useRef(false);
  const floorColorByValue = useMemo(() => buildFloorColorByValue(), []);
  const toolModes = ['draw', 'edit', 'place'];
  const toolButtons = [
    { value: 'draw', label: 'Draw', shortcut: '1' },
    { value: 'edit', label: 'Edit', shortcut: '2' },
    { value: 'place', label: 'Place', shortcut: '3' }
  ];

  const selectedWall = useMemo(() => walls.find((w) => w.id === selectedWallId) || null, [walls, selectedWallId]);
  const selectedFixture = useMemo(() => fixtures.find((f) => f.id === selectedFixtureId) || null, [fixtures, selectedFixtureId]);
  const effectiveWalls = useMemo(() => buildEffectiveWalls(walls, fixtures, baseUnitM), [walls, fixtures, baseUnitM]);

  const clearSelections = useCallback(() => {
    setSelectedWallId(null);
    setSelectedFixtureId(null);
    setSelectedRoomKey(null);
  }, []);

  const clearInteractionState = useCallback(() => {
    setStartPoint(null);
    setHoverPoint(null);
    setHoverRawPoint(null);
    setDragState(null);
    setDragPreviewPoint(null);
    setPanState(null);
  }, []);

  const recenterAndFitCamera = useCallback(() => {
    setCamera(buildFittedCamera({
      walls,
      fixtures,
      canvasAspect,
      fitMarginCells: FIT_MARGIN_CELLS,
      minCameraSizeCells: MIN_CAMERA_SIZE_CELLS,
      maxCameraSizeCells: MAX_CAMERA_SIZE_CELLS
    }));
  }, [walls, fixtures, canvasAspect]);

  useEffect(() => {
    if (walls.length || fixtures.length) return;
    setCamera(buildDefaultCamera(canvasAspect));
  }, [canvasAspect, walls.length, fixtures.length]);

  const rooms = useMemo(
    () => buildRooms(walls, wallThicknessByTypeM, baseUnitM, roomMeta, defaultFloor),
    [walls, roomMeta, defaultFloor, wallThicknessByTypeM, baseUnitM]
  );
  const totalRoomAreaM2 = useMemo(() => sumRoomAreaM2(rooms), [rooms]);
  const boundingBoxAreaM2 = useMemo(
    () => computeBoundingBoxAreaM2({ walls, fixtures, baseUnitM }),
    [walls, fixtures, baseUnitM]
  );

  const selectedRoom = useMemo(() => rooms.find((r) => r.key === selectedRoomKey) || null, [rooms, selectedRoomKey]);
  const activeFurniturePresets = FURNITURE_PRESETS[furnitureType] || [];

  useEffect(() => {
    if (!activeFurniturePresets.some((preset) => preset.id === furniturePresetId)) {
      setFurniturePresetId(activeFurniturePresets[0]?.id || '');
    }
  }, [activeFurniturePresets, furniturePresetId]);
  const drawPreviewMeasurement = useMemo(
    () => buildDrawPreviewMeasurement(toolMode, startPoint, hoverPoint, baseUnitM),
    [toolMode, startPoint, hoverPoint, baseUnitM]
  );
  const draggedVertexMeasurements = useMemo(
    () => buildDraggedVertexMeasurements(dragState, dragPreviewPoint, walls, baseUnitM),
    [dragState, dragPreviewPoint, walls, baseUnitM]
  );
  const placePreviewFixture = useMemo(
    () => buildPlacePreviewFixture({
      toolMode,
      hoverPoint,
      hoverRawPoint,
      placeKind,
      activeFurniturePresets,
      furniturePresetId,
      furnitureType,
      furnitureAngleDeg,
      doorType,
      doorHinge,
      doorWidthM,
      windowWidthM,
      findWallAtPoint
    }),
    [
      toolMode,
      hoverPoint,
      hoverRawPoint,
      placeKind,
      activeFurniturePresets,
      furniturePresetId,
      furnitureType,
      furnitureAngleDeg,
      doorType,
      doorHinge,
      doorWidthM,
      windowWidthM,
      walls
    ]
  );
  const renderFixtures = useMemo(() => buildRenderFixtures(fixtures, placePreviewFixture), [fixtures, placePreviewFixture]);

  function wallStyle(wall) {
    return wallStyleFor(wall, wallThicknessByTypeM, baseUnitM, wallMetersToPx);
  }

  function updateWallThicknessM(type, value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.max(0.05, Math.min(1, parsed));
    setWallThicknessByTypeM((current) => ({ ...current, [type]: clamped }));
  }

  function getSnappedPoint(event, svg) {
    return getSnappedPointForEvent(event, svg, walls);
  }

  function updateBaseUnit(nextBaseUnitM) {
    const parsedNext = Number(nextBaseUnitM);
    if (!Number.isFinite(parsedNext) || parsedNext <= 0) return;
    if (Math.abs(parsedNext - baseUnitM) < EPS) return;
    const { scaledWalls, scaledFixtures } = scalePlanForBaseUnit({
      walls,
      fixtures,
      currentBaseUnitM: baseUnitM,
      nextBaseUnitM: parsedNext
    });

    setBaseUnitM(parsedNext);
    shouldRecenterAfterDataLoadRef.current = true;
    setWalls(scaledWalls);
    setFixtures(scaledFixtures);
    rebindFixturesToWalls(scaledWalls);
  }

  function findWallAtPoint(point, maxDistance = 10) {
    return findWallAtPointInWalls(walls, point, maxDistance);
  }

  function rebindFixturesToWalls(nextWalls) {
    setFixtures((current) => {
      let changed = false;
      const rebound = current.map((fixture) => {
        if (fixture.kind !== 'door' && fixture.kind !== 'window') return fixture;
        const wall = findWallAtPointInSet(fixture.position, nextWalls);
        if (!wall) return fixture;
        const projected = projectPointOnWall(fixture.position, wall);
        const position = snapToGrid(projected.x, projected.y);
        const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
        let swingSide = fixture.swingSide;
        if (fixture.kind === 'door') {
          const prevAngle = Number(fixture.angle) || angle;
          const prevNx = -Math.sin(prevAngle);
          const prevNy = Math.cos(prevAngle);
          const nextNx = -Math.sin(angle);
          const nextNy = Math.cos(angle);
          const prevOpenX = prevNx * (Number(fixture.swingSide) >= 0 ? 1 : -1);
          const prevOpenY = prevNy * (Number(fixture.swingSide) >= 0 ? 1 : -1);
          swingSide = ((prevOpenX * nextNx) + (prevOpenY * nextNy)) >= 0 ? 1 : -1;
        }
        if (
          fixture.wallId !== wall.id ||
          Math.abs((fixture.position?.x || 0) - position.x) > EPS ||
          Math.abs((fixture.position?.y || 0) - position.y) > EPS ||
          Math.abs((Number(fixture.angle) || 0) - angle) > EPS ||
          (fixture.kind === 'door' && Number(fixture.swingSide) !== Number(swingSide))
        ) {
          changed = true;
          return fixture.kind === 'door'
            ? { ...fixture, wallId: wall.id, position, angle, swingSide }
            : { ...fixture, wallId: wall.id, position, angle };
        }
        return fixture;
      });
      return changed ? rebound : current;
    });
  }

  useEffect(() => {
    if (!walls.length || !fixtures.length) return;
    rebindFixturesToWalls(walls);
  }, [walls]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!shouldRecenterAfterDataLoadRef.current) return;
    shouldRecenterAfterDataLoadRef.current = false;
    recenterAndFitCamera();
  }, [walls, fixtures, recenterAndFitCamera]);

  function findVertexAtPoint(point) {
    return findVertexAtPointInWalls(walls, point);
  }

  function findFixtureAtPoint(point) {
    return findFixtureAtPointInFixtures(fixtures, point, baseUnitM, GRID);
  }

  const onCanvasWheel = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();

    const shouldRotatePreview = toolMode === 'place' && placeKind === 'furniture';
    const shouldRotateSelected = toolMode === 'edit' && selectedFixture?.kind === 'furniture';
    if (shouldRotatePreview || shouldRotateSelected) {
      const step = 15;
      const delta = event.deltaY > 0 ? step : -step;

      if (shouldRotatePreview) {
        setFurnitureAngleDeg((current) => normalizeAngleDeg(current + delta));
        return;
      }

      setFixtures((current) => current.map((fixture) => {
        if (fixture.id !== selectedFixture.id) return fixture;
        return { ...fixture, angleDeg: normalizeAngleDeg((Number(fixture.angleDeg) || 0) + delta) };
      }));
      return;
    }

    const svg = svgRef.current;
    if (!svg) return;
    const point = getSvgPoint(event, svg);
    const zoomFactor = event.deltaY > 0 ? 1.1 : 1 / 1.1;
    const minSize = MIN_CAMERA_SIZE_CELLS * GRID;
    const maxSize = MAX_CAMERA_SIZE_CELLS * GRID;
    setCamera((current) => {
      const nextW = Math.max(minSize, Math.min(maxSize, current.w * zoomFactor));
      const nextH = nextW / canvasAspect;
      const px = (point.x - current.x) / current.w;
      const py = (point.y - current.y) / current.h;
      return {
        x: point.x - (px * nextW),
        y: point.y - (py * nextH),
        w: nextW,
        h: nextH
      };
    });
  }, [toolMode, placeKind, selectedFixture, canvasAspect, MIN_CAMERA_SIZE_CELLS, MAX_CAMERA_SIZE_CELLS]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;

    const updateAspect = () => {
      const width = svg.clientWidth;
      const height = svg.clientHeight;
      if (width > 0 && height > 0) setCanvasAspect(width / height);
    };

    updateAspect();
    const observer = new ResizeObserver(updateAspect);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const handler = (event) => onCanvasWheel(event);
    svg.addEventListener('wheel', handler, { passive: false });
    return () => svg.removeEventListener('wheel', handler);
  }, [onCanvasWheel]);

  function onMouseMove(event) {
    const svg = event.currentTarget;
    const raw = getSvgPoint(event, svg);
    if (panState) {
      const dx = event.clientX - panState.anchorClientX;
      const dy = event.clientY - panState.anchorClientY;
      const scaleX = panState.startCamera.w / svg.clientWidth;
      const scaleY = panState.startCamera.h / svg.clientHeight;
      setCamera({
        x: panState.startCamera.x - (dx * scaleX),
        y: panState.startCamera.y - (dy * scaleY),
        w: panState.startCamera.w,
        h: panState.startCamera.h
      });
      if (!panState.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
        setPanState((current) => (current ? { ...current, moved: true } : current));
        suppressCanvasClickRef.current = true;
      }
      return;
    }
    setHoverRawPoint(raw);
    const snapped = getSnappedPoint(event, svg);
    setHoverPoint(snapped);

    if (toolMode === 'edit' || (toolMode === 'place' && placeKind !== 'furniture')) {
      const hit = findWallAtPoint(raw);
      setHoverWallId(hit?.id || null);
    } else if (toolMode !== 'edit') {
      setHoverWallId(null);
    }

    if (!dragState) return;

    const snappedRaw = dragState.kind === 'fixture' && dragState.original.kind === 'furniture'
      ? snapToHalfGrid(raw.x, raw.y)
      : snapToGrid(raw.x, raw.y);
    setDragPreviewPoint(snappedRaw);
    const dx = snappedRaw.x - dragState.anchor.x;
    const dy = snappedRaw.y - dragState.anchor.y;

    let transformed;
    if (dragState.kind === 'vertex') {
      const movedTo = clampPoint({ x: dragState.originalPoint.x + dx, y: dragState.originalPoint.y + dy });
      transformed = dragState.originalWalls.map((w) => {
        const next = { ...w, start: { ...w.start }, end: { ...w.end } };
        if (dist(next.start, dragState.originalPoint) < EPS) next.start = movedTo;
        if (dist(next.end, dragState.originalPoint) < EPS) next.end = movedTo;
        return next;
      });
    } else if (dragState.kind === 'wall') {
      const moved = {
        ...dragState.original,
        start: clampPoint({ x: dragState.original.start.x + dx, y: dragState.original.start.y + dy }),
        end: clampPoint({ x: dragState.original.end.x + dx, y: dragState.original.end.y + dy })
      };

      const oldStart = dragState.original.start;
      const oldEnd = dragState.original.end;

      transformed = dragState.originalWalls.map((w) => {
        if (w.id === dragState.original.id) return moved;

        const next = { ...w, start: { ...w.start }, end: { ...w.end } };

        if (dist(next.start, oldStart) < EPS) next.start = clampPoint({ x: next.start.x + dx, y: next.start.y + dy });
        if (dist(next.end, oldStart) < EPS) next.end = clampPoint({ x: next.end.x + dx, y: next.end.y + dy });
        if (dist(next.start, oldEnd) < EPS) next.start = clampPoint({ x: next.start.x + dx, y: next.start.y + dy });
        if (dist(next.end, oldEnd) < EPS) next.end = clampPoint({ x: next.end.x + dx, y: next.end.y + dy });

        return next;
      });
      const nextWalls = normalizeAndSplitWalls(transformed);
      setWalls(nextWalls);
      rebindFixturesToWalls(nextWalls);
      return;
    }

    if (dragState.kind === 'fixture') {
      const movedPoint = clampPoint({ x: dragState.original.position.x + dx, y: dragState.original.position.y + dy });
      if (dragState.original.kind === 'door' || dragState.original.kind === 'window') {
        const snapped = snapToGrid(movedPoint.x, movedPoint.y);
        const wall = findWallAtPoint(snapped, 18);
        if (!wall) return;
        const projected = projectPointOnWall(snapped, wall);
        const position = snapToGrid(projected.x, projected.y);
        const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
        setFixtures((current) => current.map((f) => (f.id === dragState.original.id ? {
          ...f,
          wallId: wall.id,
          position,
          angle
        } : f)));
        return;
      }

      const position = snapToHalfGrid(movedPoint.x, movedPoint.y);
      setFixtures((current) => current.map((f) => (f.id === dragState.original.id ? { ...f, position } : f)));
      return;
    }

    const nextWalls = normalizeAndSplitWalls(transformed);
    setWalls(nextWalls);
    rebindFixturesToWalls(nextWalls);
  }

  function onMouseDown(event) {
    if (event.button !== 0) return;
    const svg = event.currentTarget;
    const point = getSvgPoint(event, svg);
    const tryStartPan = () => {
      setPanState({
        anchorClientX: event.clientX,
        anchorClientY: event.clientY,
        startCamera: { ...camera },
        moved: false
      });
    };

    if (toolMode !== 'edit') {
      tryStartPan();
      return;
    }

    const fixtureHit = findFixtureAtPoint(point);
    if (fixtureHit) {
      const fixtureAnchor = fixtureHit.kind === 'furniture' ? snapToHalfGrid(point.x, point.y) : snapToGrid(point.x, point.y);
      setSelectedFixtureId(fixtureHit.id);
      setSelectedWallId(null);
      setSelectedRoomKey(null);
      setDragState({
        kind: 'fixture',
        anchor: fixtureAnchor,
        original: { ...fixtureHit, position: { ...fixtureHit.position } }
      });
      setDragPreviewPoint(fixtureAnchor);
      return;
    }

    const vertexHit = findVertexAtPoint(point);
    if (vertexHit) {
      setSelectedFixtureId(null);
      setSelectedWallId(null);
      setSelectedRoomKey(null);
      setDragState({
        kind: 'vertex',
        anchor: snapToGrid(point.x, point.y),
        originalPoint: vertexHit,
        originalWalls: cloneWalls(walls)
      });
      setDragPreviewPoint(snapToGrid(point.x, point.y));
      return;
    }

    const hit = findWallAtPoint(point);
    if (!hit) {
      tryStartPan();
      return;
    }

    setSelectedWallId(hit.id);
    setSelectedFixtureId(null);
    setSelectedRoomKey(null);
    setDragState({
      kind: 'wall',
      anchor: snapToGrid(point.x, point.y),
      original: { ...hit, start: { ...hit.start }, end: { ...hit.end } },
      originalWalls: cloneWalls(walls)
    });
    setDragPreviewPoint(snapToGrid(point.x, point.y));
  }

  function onMouseUp() {
    if (panState?.moved) suppressCanvasClickRef.current = true;
    setPanState(null);
    setDragState(null);
    setDragPreviewPoint(null);
  }

  function onCanvasClick(event) {
    if (suppressCanvasClickRef.current) {
      suppressCanvasClickRef.current = false;
      return;
    }
    const svg = event.currentTarget;
    const point = getSnappedPoint(event, svg);
    const raw = getSvgPoint(event, svg);

    if (toolMode === 'edit') {
      const vertexHit = findVertexAtPoint(raw);
      if (vertexHit) {
        const attachedWall = walls.find((w) => dist(w.start, vertexHit) < EPS || dist(w.end, vertexHit) < EPS);
        setSelectedWallId(attachedWall?.id || null);
        setSelectedFixtureId(null);
        setSelectedRoomKey(null);
        return;
      }

      const fixtureHit = findFixtureAtPoint(raw);
      if (fixtureHit) {
        setSelectedFixtureId(fixtureHit.id);
        setSelectedWallId(null);
        setSelectedRoomKey(null);
        return;
      }

      const wallHit = findWallAtPoint(raw);
      if (wallHit) {
        setSelectedWallId(wallHit.id);
        setSelectedFixtureId(null);
        setSelectedRoomKey(null);
        return;
      }

      setSelectedWallId(null);
      setSelectedFixtureId(null);
      setSelectedRoomKey(null);
      return;
    }

    if (toolMode === 'place') {
      if (placeKind === 'furniture') {
        const preset = activeFurniturePresets.find((item) => item.id === furniturePresetId);
        if (!preset) return;
        const halfSnapped = snapToHalfGrid(raw.x, raw.y);
        setFixtures((current) => current.concat({
          id: crypto.randomUUID(),
          kind: 'furniture',
          furnitureType,
          presetId: preset.id,
          widthM: preset.widthM,
          depthM: preset.depthM,
          angleDeg: furnitureAngleDeg,
          position: halfSnapped
        }));
        return;
      }

      const wall = findWallAtPoint(raw, 14);
      if (!wall) return;
      const projected = projectPointOnWall(raw, wall);
      const position = snapToGrid(projected.x, projected.y);
      const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
      if (placeKind === 'door') {
        const wallDx = wall.end.x - wall.start.x;
        const wallDy = wall.end.y - wall.start.y;
        const wallLen = Math.hypot(wallDx, wallDy);
        const nx = wallLen > EPS ? (-wallDy / wallLen) : 0;
        const ny = wallLen > EPS ? (wallDx / wallLen) : 0;
        const sideValue = ((raw.x - projected.x) * nx + (raw.y - projected.y) * ny) >= 0 ? 1 : -1;
        setFixtures((current) => current.concat({
          id: crypto.randomUUID(),
          kind: 'door',
          doorType,
          hinge: doorHinge,
          swingSide: sideValue,
          widthM: Number(doorWidthM),
          wallId: wall.id,
          position,
          angle
        }));
      }
      if (placeKind === 'window') {
        setFixtures((current) => current.concat({
          id: crypto.randomUUID(),
          kind: 'window',
          widthM: Number(windowWidthM),
          wallId: wall.id,
          position,
          angle
        }));
      }
      return;
    }

    if (!startPoint) {
      setStartPoint(point);
      return;
    }

    if (dist(startPoint, point) < EPS) return;

    const newWall = {
      id: crypto.randomUUID(),
      start: startPoint,
      end: point,
      type: newWallType,
      material: newWallMaterial
    };

    const nextWalls = normalizeAndSplitWalls([...walls, newWall]);
    setWalls(nextWalls);
    rebindFixturesToWalls(nextWalls);
    setStartPoint(point);
  }

  function onCanvasContextMenu(event) {
    event.preventDefault();
    setStartPoint(null);
    setDragState(null);
    setDragPreviewPoint(null);
  }

  function onCanvasMouseLeave() {
    onMouseUp();
    setHoverPoint(null);
    setHoverRawPoint(null);
    setHoverWallId(null);
  }

  function splitWallAtPoint(wall, point) {
    if (!wall || toolMode !== 'edit') return;
    if (dist(wall.start, point) < EPS || dist(wall.end, point) < EPS) return;

    const first = {
      id: crypto.randomUUID(),
      start: { ...wall.start },
      end: { ...point },
      type: wall.type,
      material: wall.material
    };
    const second = {
      id: crypto.randomUUID(),
      start: { ...point },
      end: { ...wall.end },
      type: wall.type,
      material: wall.material
    };

    setWalls((current) => {
      const next = current.filter((w) => w.id !== wall.id).concat(first, second);
      const normalized = normalizeAndSplitWalls(next);
      rebindFixturesToWalls(normalized);
      return normalized;
    });
    setSelectedWallId(null);
    setSelectedRoomKey(null);
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      setStartPoint(null);
      setDragState(null);
      setDragPreviewPoint(null);
    }
    if (event.key.toLowerCase() === 'd') {
      if (selectedRoom) deleteSelectedRoom();
      else if (selectedFixture) deleteSelectedFixture();
      else deleteSelectedWall();
    }
    const numeric = Number(event.key);
    if (Number.isInteger(numeric) && numeric >= 1) {
      const nextMode = toolModes[numeric - 1];
      if (nextMode) setToolMode(nextMode);
    }
  }

  const handleGlobalKeyDown = useCallback((event) => {
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)
    ) {
      return;
    }
    onKeyDown(event);
  }, [selectedWall, selectedFixture, toolModes]);

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  useEffect(() => {
    if (!settingsOpen) return undefined;
    const onPointerDown = (event) => {
      const insideButton = settingsButtonRef.current?.contains(event.target);
      const insidePopover = settingsPopoverRef.current?.contains(event.target);
      if (insideButton || insidePopover) return;
      setSettingsOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [settingsOpen]);

  function updateSelectedWall(patch) {
    if (!selectedWall) return;
    setWalls((current) => {
      const normalized = normalizeAndSplitWalls(current.map((w) => (w.id === selectedWall.id ? { ...w, ...patch } : w)));
      rebindFixturesToWalls(normalized);
      return normalized;
    });
  }

  function deleteSelectedWall() {
    if (!selectedWall) return;
    setWalls((current) => {
      const normalized = normalizeAndSplitWalls(current.filter((w) => w.id !== selectedWall.id));
      rebindFixturesToWalls(normalized);
      return normalized;
    });
    setSelectedWallId(null);
  }

  function deleteSelectedFixture() {
    if (!selectedFixture) return;
    setFixtures((current) => current.filter((f) => f.id !== selectedFixture.id));
    setSelectedFixtureId(null);
  }

  function updateRoomMeta(roomKey, patch) {
    setRoomMeta((current) => ({
      ...current,
      [roomKey]: {
        label: current[roomKey]?.label,
        floor: current[roomKey]?.floor || defaultFloor,
        ...patch
      }
    }));
  }

  function deleteSelectedRoom() {
    if (!selectedRoom) return;
    setRoomMeta((current) => ({
      ...current,
      [selectedRoom.key]: {
        ...(current[selectedRoom.key] || {}),
        hidden: true
      }
    }));
    setSelectedRoomKey(null);
  }

  function clearPlan() {
    setWalls([]);
    setFixtures([]);
    setRoomMeta({});
    shouldRecenterAfterDataLoadRef.current = true;
    clearSelections();
    setHoverWallId(null);
    setHoverRoomKey(null);
    clearInteractionState();
    setBaseUnitM(DEFAULT_BASE_UNIT_M);
  }

  function savePlan() {
    try {
      savePlanToStorage({
        name: planName || 'Untitled Plan',
        walls,
        fixtures,
        roomMeta,
        defaultFloor,
        baseUnitM,
        wallThicknessByTypeM
      });
    } catch (error) {
      console.warn('Failed to save plan to local storage:', error);
    }
  }

  function loadLatestPlan() {
    const latest = loadLatestPlanFromStorage();
    if (!latest) return;

    setPlanName(latest.name || 'Loaded Plan');
    shouldRecenterAfterDataLoadRef.current = true;
    const loadedWalls = normalizeAndSplitWalls(latest.walls || []);
    setWalls(loadedWalls);
    setFixtures(Array.isArray(latest.fixtures) ? latest.fixtures : []);
    rebindFixturesToWalls(loadedWalls);
    setRoomMeta(latest.roomMeta || {});
    setDefaultFloor(latest.defaultFloor || 'tatami');
    setBaseUnitM(Number(latest.baseUnitM) || DEFAULT_BASE_UNIT_M);
    const legacyInnerPx = Number(latest.wallThicknessByType?.inner);
    const legacyOuterPx = Number(latest.wallThicknessByType?.outer);
    setWallThicknessByTypeM({
      inner: Number(latest.wallThicknessByTypeM?.inner) || (Number.isFinite(legacyInnerPx) && legacyInnerPx > 0 ? (legacyInnerPx / GRID) * (Number(latest.baseUnitM) || DEFAULT_BASE_UNIT_M) : 0.115),
      outer: Number(latest.wallThicknessByTypeM?.outer) || (Number.isFinite(legacyOuterPx) && legacyOuterPx > 0 ? (legacyOuterPx / GRID) * (Number(latest.baseUnitM) || DEFAULT_BASE_UNIT_M) : 0.24)
    });
    clearSelections();
    setStartPoint(null);
  }

  function exportPlanImage() {
    exportSvgAsPng(svgRef.current, planName || 'floor-plan');
  }

  return (
    <section className="editor" onKeyDown={onKeyDown} tabIndex={0}>
      <EditorPanel
        planName={planName}
        setPlanName={setPlanName}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        settingsButtonRef={settingsButtonRef}
        settingsPopoverRef={settingsPopoverRef}
        toolButtons={toolButtons}
        toolMode={toolMode}
        setToolMode={setToolMode}
        newWallType={newWallType}
        setNewWallType={setNewWallType}
        newWallMaterial={newWallMaterial}
        setNewWallMaterial={setNewWallMaterial}
        selectedWall={selectedWall}
        updateSelectedWall={updateSelectedWall}
        deleteSelectedWall={deleteSelectedWall}
        placeKind={placeKind}
        setPlaceKind={setPlaceKind}
        doorType={doorType}
        setDoorType={setDoorType}
        doorHinge={doorHinge}
        setDoorHinge={setDoorHinge}
        doorWidthM={doorWidthM}
        setDoorWidthM={setDoorWidthM}
        windowWidthM={windowWidthM}
        setWindowWidthM={setWindowWidthM}
        furnitureType={furnitureType}
        setFurnitureType={setFurnitureType}
        furniturePresetId={furniturePresetId}
        setFurniturePresetId={setFurniturePresetId}
        activeFurniturePresets={activeFurniturePresets}
        selectedRoom={selectedRoom}
        updateRoomMeta={updateRoomMeta}
        deleteSelectedRoom={deleteSelectedRoom}
        defaultFloor={defaultFloor}
        setDefaultFloor={setDefaultFloor}
        baseUnitM={baseUnitM}
        updateBaseUnit={updateBaseUnit}
        wallThicknessByTypeM={wallThicknessByTypeM}
        updateWallThicknessM={updateWallThicknessM}
        wallsCount={walls.length}
        roomsCount={rooms.length}
        fixturesCount={fixtures.length}
        totalRoomAreaM2={totalRoomAreaM2}
        boundingBoxAreaM2={boundingBoxAreaM2}
      />

      <FloorPlanCanvas
        svgRef={svgRef}
        camera={camera}
        recenterAndFitCamera={recenterAndFitCamera}
        savePlan={savePlan}
        loadLatestPlan={loadLatestPlan}
        clearPlan={clearPlan}
        exportPlanImage={exportPlanImage}
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onCanvasMouseLeave={onCanvasMouseLeave}
        onCanvasClick={onCanvasClick}
        onCanvasContextMenu={onCanvasContextMenu}
        rooms={rooms}
        floorColorByValue={floorColorByValue}
        selectedRoomKey={selectedRoomKey}
        hoverRoomKey={hoverRoomKey}
        toolMode={toolMode}
        setHoverRoomKey={setHoverRoomKey}
        setSelectedRoomKey={setSelectedRoomKey}
        setSelectedWallId={setSelectedWallId}
        effectiveWalls={effectiveWalls}
        wallStyle={wallStyle}
        selectedWallId={selectedWallId}
        hoverWallId={hoverWallId}
        walls={walls}
        splitWallAtPoint={splitWallAtPoint}
        renderFixtures={renderFixtures}
        baseUnitM={baseUnitM}
        selectedFixtureId={selectedFixtureId}
        startPoint={startPoint}
        hoverPoint={hoverPoint}
        drawPreviewMeasurement={drawPreviewMeasurement}
        draggedVertexMeasurements={draggedVertexMeasurements}
      />
    </section>
  );
}
