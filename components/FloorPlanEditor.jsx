'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  BASE_UNIT_OPTIONS,
  GRID,
  RENDER_MODES,
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
  isWallOpeningFixture,
  normalizeAngleDeg,
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
import { capturePlanPreview, exportSvgAsPng } from './floorplan/editor/export';
import {
  buildPlacedDoorFixture,
  buildPlacedFurnitureFixture,
  buildPlacedWindowFixture,
  rebindOpeningFixtureToWall
} from './floorplan/editor/fixtures';
import {
  clampFloorIndex,
  createEmptyPlanFloor,
  normalizePlanFloors
} from './floorplan/editor/floors';
import { computeBoundingBoxAreaM2, sumRoomAreaM2 } from './floorplan/editor/stats';
import { scalePlanForBaseUnit } from './floorplan/editor/transforms';
import {
  deletePlanFromStorage,
  getActivePlanId,
  getStoredPlan,
  listStoredPlans,
  savePlanToStorage,
  setActivePlanId
} from './floorplan/storage/planPersistence';
import EditorPanel from './floorplan/ui/EditorPanel';
import FloorPlanCanvas from './floorplan/ui/FloorPlanCanvas';
import PlanLibraryDialog from './floorplan/ui/PlanLibraryDialog';

const DEFAULT_BASE_UNIT_M = Number(BASE_UNIT_OPTIONS.find((option) => option.default)?.value) || 1;
const DEFAULT_CANVAS_ASPECT = VIEW_W / VIEW_H;
const MIN_CAMERA_SIZE_CELLS = 12;
const FIT_MARGIN_CELLS = 2;
const MAX_CAMERA_SIZE_CELLS = 400;
const DEFAULT_WALL_THICKNESS_BY_TYPE_M = {
  inner: 0.115,
  outer: 0.24
};
const TOOL_MODES = ['draw', 'edit', 'place'];
const TOOL_BUTTONS = [
  { value: 'draw', label: 'Draw', shortcut: '1' },
  { value: 'edit', label: 'Edit', shortcut: '2' },
  { value: 'place', label: 'Place', shortcut: '3' }
];

export default function FloorPlanEditor() {
  const [planName, setPlanName] = useState('My Home');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [renderMode, setRenderMode] = useState('design');
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
  const [wallThicknessByTypeM, setWallThicknessByTypeM] = useState(() => ({ ...DEFAULT_WALL_THICKNESS_BY_TYPE_M }));
  const [floors, setFloors] = useState(() => [createEmptyPlanFloor(0)]);
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);
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
  const [hasHydrated, setHasHydrated] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [libraryProjects, setLibraryProjects] = useState([]);
  const svgRef = useRef(null);
  const settingsButtonRef = useRef(null);
  const settingsPopoverRef = useRef(null);
  const suppressCanvasClickRef = useRef(false);
  const shouldRecenterAfterDataLoadRef = useRef(false);
  const didAutoLoadPlanRef = useRef(false);
  const floorColorByValue = useMemo(() => buildFloorColorByValue(), []);
  const activeFloor = floors[activeFloorIndex] || floors[0] || { walls: [], fixtures: [], roomMeta: {} };
  const walls = activeFloor?.walls || [];
  const fixtures = activeFloor?.fixtures || [];
  const roomMeta = activeFloor?.roomMeta || {};

  const selectedWall = useMemo(() => walls.find((w) => w.id === selectedWallId) || null, [walls, selectedWallId]);
  const selectedFixture = useMemo(() => fixtures.find((f) => f.id === selectedFixtureId) || null, [fixtures, selectedFixtureId]);
  const effectiveWalls = useMemo(() => buildEffectiveWalls(walls, fixtures, baseUnitM), [walls, fixtures, baseUnitM]);
  const previousFloorWallLayers = useMemo(() => floors
    .slice(0, activeFloorIndex)
    .map((floor, index) => ({
      floorId: floor.id,
      opacity: 0.5 ** (activeFloorIndex - index),
      walls: buildEffectiveWalls(floor.walls, floor.fixtures, baseUnitM)
    }))
    .filter((layer) => layer.walls.length > 0), [floors, activeFloorIndex, baseUnitM]);
  const visibleCameraWalls = useMemo(
    () => previousFloorWallLayers.flatMap((layer) => layer.walls).concat(effectiveWalls),
    [previousFloorWallLayers, effectiveWalls]
  );

  const updateActiveFloor = useCallback((updater) => {
    setFloors((current) => current.map((floor, index) => (
      index === activeFloorIndex ? updater(floor) : floor
    )));
  }, [activeFloorIndex]);

  const setWalls = useCallback((nextWalls) => {
    updateActiveFloor((floor) => ({
      ...floor,
      walls: typeof nextWalls === 'function' ? nextWalls(floor.walls) : nextWalls
    }));
  }, [updateActiveFloor]);

  const setFixtures = useCallback((nextFixtures) => {
    updateActiveFloor((floor) => ({
      ...floor,
      fixtures: typeof nextFixtures === 'function' ? nextFixtures(floor.fixtures) : nextFixtures
    }));
  }, [updateActiveFloor]);

  const setRoomMeta = useCallback((nextRoomMeta) => {
    updateActiveFloor((floor) => ({
      ...floor,
      roomMeta: typeof nextRoomMeta === 'function' ? nextRoomMeta(floor.roomMeta) : nextRoomMeta
    }));
  }, [updateActiveFloor]);

  const clearSelections = useCallback(() => {
    setSelectedWallId(null);
    setSelectedFixtureId(null);
    setSelectedRoomKey(null);
  }, []);

  const selectWall = useCallback((wallId) => {
    setSelectedWallId(wallId);
    setSelectedFixtureId(null);
    setSelectedRoomKey(null);
  }, []);

  const selectFixture = useCallback((fixtureId) => {
    setSelectedFixtureId(fixtureId);
    setSelectedWallId(null);
    setSelectedRoomKey(null);
  }, []);

  const selectRoom = useCallback((roomKey) => {
    setSelectedRoomKey(roomKey);
    setSelectedWallId(null);
    setSelectedFixtureId(null);
  }, []);

  const clearInteractionState = useCallback(() => {
    setStartPoint(null);
    setHoverPoint(null);
    setHoverRawPoint(null);
    setDragState(null);
    setDragPreviewPoint(null);
    setPanState(null);
  }, []);

  const clearFloorUiState = useCallback(() => {
    clearSelections();
    clearInteractionState();
    setHoverWallId(null);
    setHoverRoomKey(null);
  }, [clearInteractionState, clearSelections]);

  const applyWallRebinding = useCallback((nextWalls, nextFixtures) => {
    let changed = false;
    const rebound = nextFixtures.map((fixture) => {
      if (!isWallOpeningFixture(fixture)) return fixture;
      const wall = findWallAtPointInSet(fixture.position, nextWalls);
      if (!wall) return fixture;
      const nextFixture = rebindOpeningFixtureToWall(fixture, wall);
      if (
        fixture.wallId !== nextFixture.wallId ||
        Math.abs((fixture.position?.x || 0) - nextFixture.position.x) > EPS ||
        Math.abs((fixture.position?.y || 0) - nextFixture.position.y) > EPS ||
        Math.abs((Number(fixture.angle) || 0) - nextFixture.angle) > EPS ||
        (fixture.kind === 'door' && Number(fixture.swingSide) !== Number(nextFixture.swingSide))
      ) {
        changed = true;
        return nextFixture;
      }
      return fixture;
    });
    return changed ? rebound : nextFixtures;
  }, []);

  const findWallAtPoint = useCallback((point, maxDistance = 10) => (
    findWallAtPointInWalls(walls, point, maxDistance)
  ), [walls]);

  const rebindFixturesToWalls = useCallback((nextWalls) => {
    setFixtures((current) => applyWallRebinding(nextWalls, current));
  }, [applyWallRebinding, setFixtures]);

  const findVertexAtPoint = useCallback((point) => (
    findVertexAtPointInWalls(walls, point)
  ), [walls]);

  const findFixtureAtPoint = useCallback((point) => (
    findFixtureAtPointInFixtures(fixtures, point, baseUnitM, GRID)
  ), [fixtures, baseUnitM]);

  const buildFittedCameraForPlan = useCallback(() => buildFittedCamera({
    walls: visibleCameraWalls,
    fixtures,
    canvasAspect,
    fitMarginCells: FIT_MARGIN_CELLS,
    minCameraSizeCells: MIN_CAMERA_SIZE_CELLS,
    maxCameraSizeCells: MAX_CAMERA_SIZE_CELLS
  }), [visibleCameraWalls, fixtures, canvasAspect]);

  const recenterAndFitCamera = useCallback(() => {
    setCamera(buildFittedCameraForPlan());
  }, [buildFittedCameraForPlan]);

  const activateFloor = useCallback((nextIndex) => {
    setActiveFloorIndex((current) => {
      const normalizedIndex = clampFloorIndex(nextIndex, floors.length);
      return normalizedIndex === current ? current : normalizedIndex;
    });
    shouldRecenterAfterDataLoadRef.current = true;
    clearFloorUiState();
  }, [clearFloorUiState, floors.length]);

  const goToLowerFloor = useCallback(() => {
    if (activeFloorIndex <= 0) return;
    activateFloor(activeFloorIndex - 1);
  }, [activeFloorIndex, activateFloor]);

  const goToUpperFloor = useCallback(() => {
    if (activeFloorIndex < floors.length - 1) {
      activateFloor(activeFloorIndex + 1);
      return;
    }

    setFloors((current) => current.concat(createEmptyPlanFloor(current.length)));
    setActiveFloorIndex((current) => current + 1);
    shouldRecenterAfterDataLoadRef.current = true;
    clearFloorUiState();
  }, [activeFloorIndex, clearFloorUiState, floors.length, setFloors]);

  useEffect(() => {
    if (walls.length || fixtures.length || previousFloorWallLayers.length) return;
    setCamera(buildDefaultCamera(canvasAspect));
  }, [canvasAspect, walls.length, fixtures.length, previousFloorWallLayers.length]);

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

    setBaseUnitM(parsedNext);
    shouldRecenterAfterDataLoadRef.current = true;
    setFloors((current) => current.map((floor) => {
      const { scaledWalls, scaledFixtures } = scalePlanForBaseUnit({
        walls: floor.walls,
        fixtures: floor.fixtures,
        currentBaseUnitM: baseUnitM,
        nextBaseUnitM: parsedNext
      });

      return {
        ...floor,
        walls: scaledWalls,
        fixtures: applyWallRebinding(scaledWalls, scaledFixtures)
      };
    }));
  }

  useEffect(() => {
    if (!walls.length || !fixtures.length) return;
    rebindFixturesToWalls(walls);
  }, [walls, fixtures.length, rebindFixturesToWalls]);

  useEffect(() => {
    if (!shouldRecenterAfterDataLoadRef.current) return;
    shouldRecenterAfterDataLoadRef.current = false;
    recenterAndFitCamera();
  }, [walls, fixtures, previousFloorWallLayers, recenterAndFitCamera]);

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
  }, [toolMode, placeKind, selectedFixture, canvasAspect]);

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

    const snappedRaw = dragState.kind === 'fixture'
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
        const wall = findWallAtPoint(movedPoint, 18);
        if (!wall) return;
        setFixtures((current) => current.map((f) => {
          if (f.id !== dragState.original.id) return f;
          return rebindOpeningFixtureToWall({ ...f, position: movedPoint }, wall);
        }));
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
      const fixtureAnchor = snapToHalfGrid(point.x, point.y);
      selectFixture(fixtureHit.id);
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
      clearSelections();
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

    selectWall(hit.id);
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
        selectWall(attachedWall?.id || null);
        return;
      }

      const fixtureHit = findFixtureAtPoint(raw);
      if (fixtureHit) {
        selectFixture(fixtureHit.id);
        return;
      }

      const wallHit = findWallAtPoint(raw);
      if (wallHit) {
        selectWall(wallHit.id);
        return;
      }

      clearSelections();
      return;
    }

    if (toolMode === 'place') {
      if (placeKind === 'furniture') {
        const preset = activeFurniturePresets.find((item) => item.id === furniturePresetId);
        if (!preset) return;
        setFixtures((current) => current.concat(buildPlacedFurnitureFixture({
          rawPoint: raw,
          preset,
          furnitureType,
          furnitureAngleDeg
        })));
        return;
      }

      const wall = findWallAtPoint(raw, 14);
      if (!wall) return;
      if (placeKind === 'door') {
        setFixtures((current) => current.concat(buildPlacedDoorFixture({
          rawPoint: raw,
          wall,
          doorType,
          doorHinge,
          doorWidthM
        })));
      }
      if (placeKind === 'window') {
        setFixtures((current) => current.concat(buildPlacedWindowFixture({
          rawPoint: raw,
          wall,
          windowWidthM
        })));
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
    clearSelections();
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
      const nextMode = TOOL_MODES[numeric - 1];
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
  }, [selectedFixture, selectedRoom, selectedWall]);

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
    clearSelections();
  }

  function deleteSelectedFixture() {
    if (!selectedFixture) return;
    setFixtures((current) => current.filter((f) => f.id !== selectedFixture.id));
    clearSelections();
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
    clearSelections();
  }

  function clearPlan() {
    setFloors([createEmptyPlanFloor(0)]);
    setActiveFloorIndex(0);
    shouldRecenterAfterDataLoadRef.current = true;
    clearFloorUiState();
    setBaseUnitM(DEFAULT_BASE_UNIT_M);
    // Disconnect from whichever project was loaded so that drawing something
    // new and saving creates a fresh project instead of overwriting it.
    setActiveProjectId(null);
    setActivePlanId(null);
    setPlanName('Untitled Plan');
  }

  function isPlanEmpty() {
    return floors.every((floor) => (floor.walls || []).length === 0 && (floor.fixtures || []).length === 0);
  }

  const persistPlan = useCallback(async (targetId) => {
    if (isPlanEmpty()) {
      window.alert('This plan is empty, so there is nothing to save yet. Draw at least one wall first.');
      return;
    }

    // Recenter on the whole plan before capturing the preview thumbnail, so
    // it always shows a full overview rather than whatever pan/zoom the
    // user happened to be at. Apply the viewBox to the live SVG directly so
    // the capture reflects it immediately, without waiting on React's
    // render cycle.
    const fittedCamera = buildFittedCameraForPlan();
    if (svgRef.current) {
      svgRef.current.setAttribute('viewBox', `${fittedCamera.x} ${fittedCamera.y} ${fittedCamera.w} ${fittedCamera.h}`);
    }
    setCamera(fittedCamera);

    const preview = await capturePlanPreview(svgRef.current);

    try {
      const saved = savePlanToStorage({
        name: planName || 'Untitled Plan',
        floors,
        walls,
        fixtures,
        roomMeta,
        defaultFloor,
        baseUnitM,
        wallThicknessByTypeM,
        preview
      }, targetId);
      setActiveProjectId(saved.id);
      setActivePlanId(saved.id);
    } catch (error) {
      console.warn('Failed to save plan to local storage:', error);
      window.alert('Could not save the plan (local storage unavailable or full).');
    }
  }, [baseUnitM, buildFittedCameraForPlan, defaultFloor, fixtures, floors, planName, roomMeta, wallThicknessByTypeM, walls]);

  function savePlan() {
    persistPlan(activeProjectId);
  }

  function saveAsNewPlan() {
    persistPlan(null);
  }

  const loadProjectEntry = useCallback((entry) => {
    if (!entry) return;

    const normalizedFloors = normalizePlanFloors(entry).map((floor) => {
      const loadedWalls = normalizeAndSplitWalls(floor.walls || []);
      const loadedFixtures = applyWallRebinding(loadedWalls, Array.isArray(floor.fixtures) ? floor.fixtures : []);
      return {
        ...floor,
        walls: loadedWalls,
        fixtures: loadedFixtures
      };
    });

    setPlanName(entry.name || 'Loaded Plan');
    shouldRecenterAfterDataLoadRef.current = true;
    setFloors(normalizedFloors);
    setActiveFloorIndex(0);
    setDefaultFloor(entry.defaultFloor || 'tatami');
    setBaseUnitM(Number(entry.baseUnitM) || DEFAULT_BASE_UNIT_M);
    const legacyInnerPx = Number(entry.wallThicknessByType?.inner);
    const legacyOuterPx = Number(entry.wallThicknessByType?.outer);
    setWallThicknessByTypeM({
      inner: Number(entry.wallThicknessByTypeM?.inner) || (Number.isFinite(legacyInnerPx) && legacyInnerPx > 0 ? (legacyInnerPx / GRID) * (Number(entry.baseUnitM) || DEFAULT_BASE_UNIT_M) : 0.115),
      outer: Number(entry.wallThicknessByTypeM?.outer) || (Number.isFinite(legacyOuterPx) && legacyOuterPx > 0 ? (legacyOuterPx / GRID) * (Number(entry.baseUnitM) || DEFAULT_BASE_UNIT_M) : 0.24)
    });
    clearFloorUiState();
    setActiveProjectId(entry.id);
    setActivePlanId(entry.id);
  }, [applyWallRebinding, clearFloorUiState]);

  const loadProjectById = useCallback((id) => {
    const entry = getStoredPlan(id);
    if (entry) loadProjectEntry(entry);
  }, [loadProjectEntry]);

  function openLoadDialog() {
    setLibraryProjects(listStoredPlans());
    setLoadDialogOpen(true);
  }

  function closeLoadDialog() {
    setLoadDialogOpen(false);
  }

  function selectProjectFromDialog(id) {
    loadProjectById(id);
    setLoadDialogOpen(false);
  }

  function deleteProjectFromDialog(id, name) {
    if (!window.confirm(`Delete "${name || 'this plan'}"? This cannot be undone.`)) return;
    deletePlanFromStorage(id);
    if (id === activeProjectId) {
      setActiveProjectId(null);
      setActivePlanId(null);
    }
    setLibraryProjects(listStoredPlans());
  }

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (didAutoLoadPlanRef.current) return;
    didAutoLoadPlanRef.current = true;
    const activeId = getActivePlanId();
    const entry = (activeId && getStoredPlan(activeId)) || listStoredPlans()[0] || null;
    if (entry) loadProjectEntry(entry);
  }, [loadProjectEntry]);

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
        renderModes={RENDER_MODES}
        renderMode={renderMode}
        setRenderMode={setRenderMode}
        toolButtons={TOOL_BUTTONS}
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
        renderMode={renderMode}
        recenterAndFitCamera={recenterAndFitCamera}
        savePlan={savePlan}
        saveAsNewPlan={saveAsNewPlan}
        openLoadDialog={openLoadDialog}
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
        hasHydrated={hasHydrated}
        activeFloorIndex={activeFloorIndex}
        floorsCount={floors.length}
        goToLowerFloor={goToLowerFloor}
        goToUpperFloor={goToUpperFloor}
        lowerFloorsCount={previousFloorWallLayers.length}
        selectedRoomKey={selectedRoomKey}
        hoverRoomKey={hoverRoomKey}
        toolMode={toolMode}
        setHoverRoomKey={setHoverRoomKey}
        selectRoom={selectRoom}
        previousFloorWallLayers={previousFloorWallLayers}
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

      <PlanLibraryDialog
        open={loadDialogOpen}
        projects={libraryProjects}
        activeProjectId={activeProjectId}
        onSelect={selectProjectFromDialog}
        onDelete={deleteProjectFromDialog}
        onClose={closeLoadDialog}
      />
    </section>
  );
}
