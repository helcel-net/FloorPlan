import { GRID } from '../config/constants';
import { getSvgPoint, snapToGrid } from '../core/geometry';
import FixtureLayer from './FixtureLayer';

export default function FloorPlanCanvas({
  svgRef,
  camera,
  recenterAndFitCamera,
  savePlan,
  loadLatestPlan,
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
  selectedRoomKey,
  hoverRoomKey,
  toolMode,
  setHoverRoomKey,
  setSelectedRoomKey,
  setSelectedWallId,
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
          onClick={loadLatestPlan}
          aria-label="Load latest plan"
          title="Load latest plan"
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
      <svg
        ref={svgRef}
        viewBox={`${camera.x} ${camera.y} ${camera.w} ${camera.h}`}
        preserveAspectRatio="xMidYMid meet"
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
                fill={floorColorByValue[room.floor]}
                opacity={(selectedRoomKey === room.key ? 0.6 : hoverRoomKey === room.key ? 0.5 : 0.3) * (0.35 + 0.65 * (cell.coverage || 1))}
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
                setSelectedRoomKey(room.key);
                setSelectedWallId(null);
              }}
            >
              {room.label}
            </text>
            <text className="room-label" x={room.centroid.x} y={room.centroid.y + 14} textAnchor="middle">
              {room.areaM2.toFixed(2)} m2
            </text>
          </g>
        ))}

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
              stroke={style.color}
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
        />

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
