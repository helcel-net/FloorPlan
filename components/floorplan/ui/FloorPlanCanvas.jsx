import { GRID } from '../config/constants';
import { getSvgPoint, snapToGrid } from '../core/geometry';
import FixtureLayer from './FixtureLayer';

export default function FloorPlanCanvas({
  svgRef,
  camera,
  renderMode,
  recenterAndFitCamera,
  savePlan,
  saveAsNewPlan,
  openLoadDialog,
  clearPlan,
  exportPlanImage,
  onMouseMove,
  onMouseDown,
  onMouseUp,
  onCanvasMouseLeave,
  onCanvasClick,
  onCanvasContextMenu,
  rooms,
  floorColorByValue,
  hasHydrated,
  activeFloorIndex,
  floorsCount,
  goToLowerFloor,
  goToUpperFloor,
  lowerFloorsCount,
  selectedRoomKey,
  hoverRoomKey,
  toolMode,
  setHoverRoomKey,
  selectRoom,
  previousFloorWallLayers,
  effectiveWalls,
  wallStyle,
  selectedWallId,
  hoverWallId,
  walls,
  splitWallAtPoint,
  renderFixtures,
  baseUnitM,
  selectedFixtureId,
  startPoint,
  hoverPoint,
  drawPreviewMeasurement,
  draggedVertexMeasurements
}) {
  const isSchematic = renderMode === 'technical' || renderMode === 'utilities';

  return (
    <div className="canvas-wrap">
      <div className="canvas-top-actions">
        <button
          type="button"
          className="canvas-icon-btn"
          onClick={savePlan}
          aria-label="Save plan"
          title="Save plan"
        >
          💾
        </button>
        <button
          type="button"
          className="canvas-icon-btn"
          onClick={saveAsNewPlan}
          aria-label="Save as new plan"
          title="Save as a new plan (keeps the current one untouched)"
        >
          🆕
        </button>
        <button
          type="button"
          className="canvas-icon-btn"
          onClick={openLoadDialog}
          aria-label="Open saved plans"
          title="Open a saved plan"
        >
          📂
        </button>
        <button
          type="button"
          className="canvas-icon-btn"
          onClick={clearPlan}
          aria-label="Reset plan"
          title="Reset plan"
        >
          ↺
        </button>
        <button
          type="button"
          className="canvas-icon-btn"
          onClick={exportPlanImage}
          aria-label="Export image"
          title="Export image"
        >
          ⬇
        </button>
      </div>
      <div className="canvas-bottom-actions">
        <button
          type="button"
          className="canvas-icon-btn"
          onClick={recenterAndFitCamera}
          aria-label="Recenter and fit"
          title="Recenter and fit"
        >
          ⤢
        </button>
      </div>
      {renderMode === 'utilities' && (
        <div className="canvas-mode-banner">
          Utilities layer — electrical, plumbing, and network fixtures aren&apos;t added yet. Showing the technical base plan.
        </div>
      )}
      <div className="canvas-top-right-actions">
        <div className="floor-overlay" title={!hasHydrated ? 'Ground floor' : lowerFloorsCount ? `${lowerFloorsCount} lower floor references visible` : 'Ground floor'}>
          <button
            type="button"
            className="canvas-icon-btn"
            onClick={goToUpperFloor}
            aria-label={!hasHydrated ? 'Add upper floor' : activeFloorIndex < floorsCount - 1 ? 'Go up one floor' : 'Add upper floor'}
            title={!hasHydrated ? 'Add upper floor' : activeFloorIndex < floorsCount - 1 ? 'Go up one floor' : 'Add upper floor'}
          >
            ↑
          </button>
          <div className="floor-indicator">
            {!hasHydrated ? '1/1' : `${activeFloorIndex + 1}/${floorsCount}`}
          </div>
          <button
            type="button"
            className="canvas-icon-btn"
            onClick={goToLowerFloor}
            aria-label="Go down one floor"
            title="Go down one floor"
            disabled={!hasHydrated || activeFloorIndex === 0}
          >
            ↓
          </button>
        </div>
      </div>
      <svg
        ref={svgRef}
        viewBox={`${camera.x} ${camera.y} ${camera.w} ${camera.h}`}
        preserveAspectRatio="xMidYMid meet"
        style={isSchematic ? { background: '#ffffff' } : undefined}
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onCanvasMouseLeave}
        onClick={onCanvasClick}
        onContextMenu={onCanvasContextMenu}
        role="img"
        aria-label="Floor plan canvas"
      >
        {Array.from(
          { length: Math.max(0, Math.ceil((camera.x + camera.w) / GRID) - Math.floor(camera.x / GRID) + 1) },
          (_, i) => (Math.floor(camera.x / GRID) + i) * GRID
        ).map((x) => (
          <line key={`gx-${x}`} x1={x} y1={camera.y} x2={x} y2={camera.y + camera.h} stroke="rgba(0,0,0,0.08)" strokeWidth={1} />
        ))}
        {Array.from(
          { length: Math.max(0, Math.ceil((camera.y + camera.h) / GRID) - Math.floor(camera.y / GRID) + 1) },
          (_, i) => (Math.floor(camera.y / GRID) + i) * GRID
        ).map((y) => (
          <line key={`gy-${y}`} x1={camera.x} y1={y} x2={camera.x + camera.w} y2={y} stroke="rgba(0,0,0,0.08)" strokeWidth={1} />
        ))}

        {rooms.map((room) => (
          <g key={room.key}>
            {room.cells.map((cell) => (
              <rect
                key={`${room.key}-${cell.x}-${cell.y}`}
                x={cell.x * GRID}
                y={cell.y * GRID}
                width={GRID}
                height={GRID}
                fill={isSchematic ? 'none' : floorColorByValue[room.floor]}
                opacity={isSchematic ? 1 : (selectedRoomKey === room.key ? 0.6 : hoverRoomKey === room.key ? 0.5 : 0.3) * (0.35 + 0.65 * (cell.coverage || 1))}
                onMouseEnter={() => toolMode === 'edit' && setHoverRoomKey(room.key)}
                onMouseLeave={() => setHoverRoomKey((cur) => (cur === room.key ? null : cur))}
              />
            ))}
            <text
              className="room-label"
              x={room.centroid.x}
              y={room.centroid.y - 4}
              textAnchor="middle"
              style={{ cursor: 'pointer', pointerEvents: 'all' }}
              onMouseEnter={() => toolMode === 'edit' && setHoverRoomKey(room.key)}
              onMouseLeave={() => setHoverRoomKey((cur) => (cur === room.key ? null : cur))}
              onClick={(e) => {
                if (toolMode !== 'edit') return;
                e.stopPropagation();
                selectRoom(room.key);
              }}
            >
              {room.label}
            </text>
            <text className="room-label" x={room.centroid.x} y={room.centroid.y + 14} textAnchor="middle">
              {room.areaM2.toFixed(2)} m2
            </text>
          </g>
        ))}

        {previousFloorWallLayers.flatMap((layer) => layer.walls.map((wall) => {
          const style = wallStyle(wall);
          return (
            <line
              key={`prev-${layer.floorId}-${wall.id}`}
              x1={wall.start.x}
              y1={wall.start.y}
              x2={wall.end.x}
              y2={wall.end.y}
              stroke={isSchematic ? '#1a1a1a' : style.color}
              strokeWidth={style.width}
              strokeLinecap="round"
              strokeDasharray="10 8"
              opacity={layer.opacity}
            />
          );
        }))}

        {effectiveWalls.map((wall) => {
          const style = wallStyle(wall);
          const isSelected = selectedWallId === wall.sourceWallId;
          const isHover = hoverWallId === wall.sourceWallId || hoverWallId === wall.id;
          return (
            <line
              key={wall.id}
              x1={wall.start.x}
              y1={wall.start.y}
              x2={wall.end.x}
              y2={wall.end.y}
              stroke={isSchematic ? (isSelected ? '#0f4d6f' : '#1a1a1a') : style.color}
              strokeWidth={style.width + (isSelected ? 2 : isHover ? 1 : 0)}
              strokeLinecap="round"
              opacity={isSelected ? 1 : isHover ? 0.98 : 0.9}
              onDoubleClick={(e) => {
                if (toolMode !== 'edit') return;
                e.stopPropagation();
                const svg = e.currentTarget.ownerSVGElement;
                if (!svg) return;
                const raw = getSvgPoint(e, svg);
                const point = snapToGrid(raw.x, raw.y);
                const baseWall = walls.find((w) => w.id === wall.sourceWallId);
                if (!baseWall) return;
                splitWallAtPoint(baseWall, point);
              }}
            />
          );
        })}
        <FixtureLayer
          renderFixtures={renderFixtures}
          baseUnitM={baseUnitM}
          selectedFixtureId={selectedFixtureId}
          renderMode={renderMode}
        />

        {isSchematic && walls.map((wall) => {
          const dx = wall.end.x - wall.start.x;
          const dy = wall.end.y - wall.start.y;
          const len = Math.hypot(dx, dy);
          if (len < 1) return null;

          const ux = dx / len;
          const uy = dy / len;
          const nx = -uy;
          const ny = ux;
          // Clear the wall's own rendered thickness before offsetting the
          // dimension line out, so thicker (e.g. outer/DIN) walls don't push
          // the extension lines to overlap the wall stroke itself.
          const wallHalfThickness = wallStyle(wall).width / 2;
          const offset = wallHalfThickness + 10;
          const tick = 5;
          const p1 = { x: wall.start.x + nx * offset, y: wall.start.y + ny * offset };
          const p2 = { x: wall.end.x + nx * offset, y: wall.end.y + ny * offset };
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          const meters = (len / GRID) * baseUnitM;

          return (
            <g key={`dim-${wall.id}`} opacity={0.85}>
              <line x1={wall.start.x} y1={wall.start.y} x2={p1.x} y2={p1.y} stroke="#333" strokeWidth={0.75} />
              <line x1={wall.end.x} y1={wall.end.y} x2={p2.x} y2={p2.y} stroke="#333" strokeWidth={0.75} />
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#333" strokeWidth={0.75} />
              <line
                x1={p1.x - (ux + nx) * tick}
                y1={p1.y - (uy + ny) * tick}
                x2={p1.x + (ux + nx) * tick}
                y2={p1.y + (uy + ny) * tick}
                stroke="#333"
                strokeWidth={1}
              />
              <line
                x1={p2.x - (ux - nx) * tick}
                y1={p2.y - (uy - ny) * tick}
                x2={p2.x + (ux - nx) * tick}
                y2={p2.y + (uy - ny) * tick}
                stroke="#333"
                strokeWidth={1}
              />
              <text className="dimension-label" x={midX} y={midY} textAnchor="middle">
                {meters.toFixed(2)} m
              </text>
            </g>
          );
        })}

        {startPoint && hoverPoint && toolMode === 'draw' && (
          <>
            <line
              x1={startPoint.x}
              y1={startPoint.y}
              x2={hoverPoint.x}
              y2={hoverPoint.y}
              stroke="#d4503b"
              strokeWidth={2}
              strokeDasharray="6 6"
            />
            {drawPreviewMeasurement && (
              <text className="measure-label" x={drawPreviewMeasurement.x} y={drawPreviewMeasurement.y} textAnchor="middle">
                {drawPreviewMeasurement.meters.toFixed(2)} m
              </text>
            )}
          </>
        )}
        {draggedVertexMeasurements.map((item) => (
          <text key={`measure-${item.id}`} className="measure-label" x={item.x} y={item.y} textAnchor="middle">
            {item.meters.toFixed(2)} m
          </text>
        ))}

        {hoverPoint && <circle cx={hoverPoint.x} cy={hoverPoint.y} r="4" fill="#264653" />}
        {startPoint && toolMode === 'draw' && <circle cx={startPoint.x} cy={startPoint.y} r="6" fill="#d4503b" />}
      </svg>
    </div>
  );
}
