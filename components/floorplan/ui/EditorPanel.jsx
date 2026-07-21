import { useRef } from 'react';
import {
  BASE_UNIT_OPTIONS,
  DIN_WALL_THICKNESS_OPTIONS_M,
  FLOOR_MATERIALS,
  ROOF_SHAPES,
  WALL_MATERIALS,
  WALL_TYPES
} from '../config/constants';
import {
  DOOR_PRESETS_M,
  DOOR_TYPES,
  FURNITURE_TYPES,
  WINDOW_HEIGHT_PRESETS,
  WINDOW_PRESETS_M,
  WINDOW_TYPES
} from '../editor/catalog';
import { thicknessOptionValue } from '../core/walls';

const BUILDING_FURNITURE_TYPES = ['stairs', 'electric', 'water'];

export default function EditorPanel({
  planName,
  setPlanName,
  settingsOpen,
  setSettingsOpen,
  settingsButtonRef,
  settingsPopoverRef,
  renderModes,
  renderMode,
  setRenderMode,
  toolButtons,
  toolMode,
  setToolMode,
  newWallType,
  setNewWallType,
  newWallMaterial,
  setNewWallMaterial,
  selectedWall,
  updateSelectedWall,
  deleteSelectedWall,
  floorWallHeightM,
  setFloorWallHeightM,
  floorRaiseM,
  setFloorRaiseM,
  drawKind,
  setDrawKind,
  newRoofShape,
  setNewRoofShape,
  newRoofPitchDeg,
  setNewRoofPitchDeg,
  newRoofRidgeAngleDeg,
  setNewRoofRidgeAngleDeg,
  newRoofOverhangM,
  setNewRoofOverhangM,
  roofDraftPoints,
  selectedRoof,
  updateSelectedRoof,
  deleteSelectedRoof,
  placeKind,
  setPlaceKind,
  doorType,
  setDoorType,
  doorHinge,
  setDoorHinge,
  doorWidthM,
  setDoorWidthM,
  windowType,
  setWindowType,
  windowWidthM,
  setWindowWidthM,
  windowHeightPreset,
  setWindowHeightPreset,
  furnitureType,
  setFurnitureType,
  furniturePresetId,
  setFurniturePresetId,
  activeFurniturePresets,
  selectedRoom,
  updateRoomMeta,
  deleteSelectedRoom,
  defaultFloor,
  setDefaultFloor,
  baseUnitM,
  updateBaseUnit,
  wallThicknessByTypeM,
  updateWallThicknessM,
  hiddenRoomCount,
  restoreHiddenRooms,
  wallsCount,
  roomsCount,
  fixturesCount,
  totalRoomAreaM2,
  boundingBoxAreaM2,
  exportPlan,
  importPlan
}) {
  const importInputRef = useRef(null);
  return (
    <aside className="panel">
      <div className="panel-header">
        <h2><input id="plan-name" value={planName} onChange={(e) => setPlanName(e.target.value)} /></h2>
        <div className="panel-header-actions">
          <div ref={settingsButtonRef}>
            <button
              type="button"
              className={settingsOpen ? 'icon-btn icon-btn-active' : 'icon-btn'}
              onClick={() => setSettingsOpen((current) => !current)}
              aria-label={settingsOpen ? 'Close settings' : 'Open settings'}
              title={settingsOpen ? 'Close settings' : 'Open settings'}
            >
              ⚙
            </button>
          </div>
        </div>
      </div>

      <div className="control-group">
        <span>Toolbox</span>
        <div className="mode-toolbox">
          {toolButtons.map((tool) => (
            <button
              key={tool.value}
              type="button"
              className={toolMode === tool.value ? 'mode-btn mode-btn-active' : 'mode-btn'}
              onClick={() => setToolMode(tool.value)}
            >
              <span className="mode-btn-shortcut">{tool.shortcut}</span>
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      {toolMode === 'draw' && (
        <>
          <div className="control-group">
            <span>Draw</span>
            <div className="place-switches">
              <button type="button" className={drawKind === 'wall' ? 'place-switch place-switch-active' : 'place-switch'} onClick={() => setDrawKind('wall')}>Wall</button>
              <button type="button" className={drawKind === 'roof' ? 'place-switch place-switch-active' : 'place-switch'} onClick={() => setDrawKind('roof')}>Roof</button>
            </div>
          </div>

          {drawKind === 'wall' && (
            <>
              <div className="control-group">
                <label htmlFor="new-wall-type">Draw Wall Type</label>
                <select id="new-wall-type" value={newWallType} onChange={(e) => setNewWallType(e.target.value)}>
                  {WALL_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
              <div className="control-group">
                <label htmlFor="new-wall-material">Draw Wall Material</label>
                <select id="new-wall-material" value={newWallMaterial} onChange={(e) => setNewWallMaterial(e.target.value)}>
                  {WALL_MATERIALS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
              <div className="control-group">
                <label htmlFor="floor-wall-height">Floor Wall Height (m)</label>
                <input
                  id="floor-wall-height"
                  type="number"
                  step="0.05"
                  min="1"
                  value={floorWallHeightM}
                  onChange={(e) => setFloorWallHeightM(e.target.value)}
                />
              </div>
              <div className="control-group">
                <label htmlFor="floor-raise">Floor Raise (m)</label>
                <input
                  id="floor-raise"
                  type="number"
                  step="0.05"
                  value={floorRaiseM}
                  onChange={(e) => setFloorRaiseM(e.target.value)}
                />
              </div>
            </>
          )}

          {drawKind === 'roof' && (() => {
            const editingRoof = selectedRoof;
            const shape = editingRoof ? editingRoof.shape : newRoofShape;
            const pitchDeg = editingRoof ? editingRoof.pitchDeg : newRoofPitchDeg;
            const ridgeAngleDeg = editingRoof ? editingRoof.ridgeAngleDeg : newRoofRidgeAngleDeg;
            const overhangM = editingRoof ? editingRoof.overhangM : newRoofOverhangM;
            const applyShape = (value) => (editingRoof ? updateSelectedRoof({ shape: value }) : setNewRoofShape(value));
            const applyPitch = (value) => (editingRoof ? updateSelectedRoof({ pitchDeg: Number(value) }) : setNewRoofPitchDeg(Number(value)));
            const applyRidgeAngle = (value) => (editingRoof ? updateSelectedRoof({ ridgeAngleDeg: Number(value) }) : setNewRoofRidgeAngleDeg(Number(value)));
            const applyOverhang = (value) => (editingRoof ? updateSelectedRoof({ overhangM: Number(value) }) : setNewRoofOverhangM(Number(value)));

            return (
              <>
                <div className="control-group">
                  <span>{editingRoof ? 'Edit Roof Shape' : 'Draw: click to add points, click the first point (or press Enter) to close.'}</span>
                  <div className="place-switches">
                    {ROOF_SHAPES.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        className={shape === item.value ? 'place-switch place-switch-active' : 'place-switch'}
                        onClick={() => applyShape(item.value)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                {shape !== 'flat' && (
                  <div className="control-group">
                    <label htmlFor="roof-pitch">Pitch (degrees)</label>
                    <input id="roof-pitch" type="number" step="1" min="1" max="80" value={pitchDeg} onChange={(e) => applyPitch(e.target.value)} />
                  </div>
                )}
                {(shape === 'gable' || shape === 'shed') && (
                  <div className="control-group">
                    <label htmlFor="roof-ridge-angle">Ridge Direction (degrees)</label>
                    <input id="roof-ridge-angle" type="number" step="5" value={ridgeAngleDeg} onChange={(e) => applyRidgeAngle(e.target.value)} />
                  </div>
                )}
                <div className="control-group">
                  <label htmlFor="roof-overhang">Overhang (m)</label>
                  <input id="roof-overhang" type="number" step="0.05" min="0" value={overhangM} onChange={(e) => applyOverhang(e.target.value)} />
                </div>
                {editingRoof && (
                  <div className="control-group">
                    <label htmlFor="roof-eave-height">Eave Height Override (m)</label>
                    <input
                      id="roof-eave-height"
                      type="number"
                      step="0.05"
                      min="0"
                      placeholder={`Floor default (${floorWallHeightM} m)`}
                      value={editingRoof.eaveHeightM ?? ''}
                      onChange={(e) => updateSelectedRoof({ eaveHeightM: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                  </div>
                )}
                {editingRoof && (
                  <div className="control-group">
                    <button type="button" className="secondary" onClick={deleteSelectedRoof}>Delete Selected Roof</button>
                  </div>
                )}
                {!editingRoof && roofDraftPoints && roofDraftPoints.length > 0 && (
                  <div className="control-group">
                    <span>{roofDraftPoints.length} point(s) placed</span>
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}

      {toolMode === 'edit' && selectedWall && (
        <>
          <div className="control-group">
            <label htmlFor="edit-wall-type">Edit Wall Type</label>
            <select id="edit-wall-type" value={selectedWall.type} onChange={(e) => updateSelectedWall({ type: e.target.value })}>
              {WALL_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div className="control-group">
            <label htmlFor="edit-wall-material">Edit Wall Material</label>
            <select id="edit-wall-material" value={selectedWall.material} onChange={(e) => updateSelectedWall({ material: e.target.value })}>
              {WALL_MATERIALS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div className="control-group">
            <label htmlFor="edit-wall-height">Wall Height (m)</label>
            <input
              id="edit-wall-height"
              type="number"
              step="0.05"
              min="0"
              placeholder={`Floor default (${floorWallHeightM} m)`}
              value={selectedWall.heightM ?? ''}
              onChange={(e) => updateSelectedWall({ heightM: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </div>
          <div className="control-group">
            <button type="button" className="secondary" onClick={deleteSelectedWall}>Delete Selected Wall</button>
          </div>
        </>
      )}

      {toolMode === 'place' && (() => {
        const isBuildingCategory = placeKind === 'door' || placeKind === 'window' || (placeKind === 'furniture' && BUILDING_FURNITURE_TYPES.includes(furnitureType));

        return (
          <>
            <div className="control-group">
              <span>Place Category</span>
              <div className="place-switches">
                <button
                  type="button"
                  className={isBuildingCategory ? 'place-switch place-switch-active' : 'place-switch'}
                  onClick={() => { if (!isBuildingCategory) setPlaceKind('door'); }}
                >
                  Building
                </button>
                <button
                  type="button"
                  className={!isBuildingCategory ? 'place-switch place-switch-active' : 'place-switch'}
                  onClick={() => { if (isBuildingCategory) { setPlaceKind('furniture'); setFurnitureType('living'); } }}
                >
                  Furniture
                </button>
              </div>
            </div>

            {isBuildingCategory && (
              <div className="control-group">
                <span>Building Element</span>
                <div className="place-switches">
                  <button type="button" className={placeKind === 'door' ? 'place-switch place-switch-active' : 'place-switch'} onClick={() => setPlaceKind('door')}>Door</button>
                  <button type="button" className={placeKind === 'window' ? 'place-switch place-switch-active' : 'place-switch'} onClick={() => setPlaceKind('window')}>Window</button>
                  <button type="button" className={placeKind === 'furniture' && furnitureType === 'stairs' ? 'place-switch place-switch-active' : 'place-switch'} onClick={() => { setPlaceKind('furniture'); setFurnitureType('stairs'); }}>Stairs</button>
                  <button type="button" className={placeKind === 'furniture' && (furnitureType === 'electric' || furnitureType === 'water') ? 'place-switch place-switch-active' : 'place-switch'} onClick={() => { setPlaceKind('furniture'); setFurnitureType('electric'); }}>Utilities</button>
                </div>
              </div>
            )}

            {placeKind === 'door' && (
              <>
                <div className="control-group">
                  <span>Door Type</span>
                  <div className="furniture-type-grid">
                    {DOOR_TYPES.map((item) => (
                      <button key={item.value} type="button" className={doorType === item.value ? 'place-switch place-switch-active' : 'place-switch'} onClick={() => setDoorType(item.value)}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="control-group">
                  <span>Door Hinge</span>
                  <div className="place-switches">
                    <button type="button" className={doorHinge === 'left' ? 'place-switch place-switch-active' : 'place-switch'} onClick={() => setDoorHinge('left')}>Left Hinge</button>
                    <button type="button" className={doorHinge === 'right' ? 'place-switch place-switch-active' : 'place-switch'} onClick={() => setDoorHinge('right')}>Right Hinge</button>
                  </div>
                </div>
                <div className="control-group">
                  <label htmlFor="door-preset">Door Width Preset</label>
                  <select id="door-preset" value={String(doorWidthM)} onChange={(e) => setDoorWidthM(Number(e.target.value))}>
                    {DOOR_PRESETS_M.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </div>
              </>
            )}

            {placeKind === 'window' && (
              <>
                <div className="control-group">
                  <span>Window Type</span>
                  <div className="furniture-type-grid">
                    {WINDOW_TYPES.map((item) => (
                      <button key={item.value} type="button" className={windowType === item.value ? 'place-switch place-switch-active' : 'place-switch'} onClick={() => setWindowType(item.value)}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="control-group">
                  <label htmlFor="window-preset">Window Width Preset</label>
                  <select id="window-preset" value={String(windowWidthM)} onChange={(e) => setWindowWidthM(Number(e.target.value))}>
                    {WINDOW_PRESETS_M.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </div>
                <div className="control-group">
                  <span>Window Height Preset</span>
                  <div className="furniture-type-grid">
                    {WINDOW_HEIGHT_PRESETS.map((item) => (
                      <button key={item.value} type="button" className={windowHeightPreset === item.value ? 'place-switch place-switch-active' : 'place-switch'} onClick={() => setWindowHeightPreset(item.value)}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {placeKind === 'furniture' && furnitureType === 'stairs' && (
              <div className="control-group">
                <label htmlFor="stairs-preset">Stairs Preset</label>
                <select id="stairs-preset" value={furniturePresetId} onChange={(e) => setFurniturePresetId(e.target.value)}>
                  {activeFurniturePresets.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </div>
            )}

            {placeKind === 'furniture' && (furnitureType === 'electric' || furnitureType === 'water') && (
              <>
                <div className="control-group">
                  <span>Utility Type</span>
                  <div className="place-switches">
                    <button type="button" className={furnitureType === 'electric' ? 'place-switch place-switch-active' : 'place-switch'} onClick={() => setFurnitureType('electric')}>Electric</button>
                    <button type="button" className={furnitureType === 'water' ? 'place-switch place-switch-active' : 'place-switch'} onClick={() => setFurnitureType('water')}>Water</button>
                  </div>
                </div>
                <div className="control-group">
                  <label htmlFor="utility-preset">Utility Preset</label>
                  <select id="utility-preset" value={furniturePresetId} onChange={(e) => setFurniturePresetId(e.target.value)}>
                    {activeFurniturePresets.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                  </select>
                </div>
              </>
            )}

            {placeKind === 'furniture' && !BUILDING_FURNITURE_TYPES.includes(furnitureType) && (
              <>
                <div className="control-group">
                  <span>Furniture Type</span>
                  <div className="furniture-type-grid">
                    {FURNITURE_TYPES.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        className={furnitureType === item.value ? 'place-switch place-switch-active' : 'place-switch'}
                        onClick={() => setFurnitureType(item.value)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="control-group">
                  <label htmlFor="furniture-preset">Furniture Preset</label>
                  <select id="furniture-preset" value={furniturePresetId} onChange={(e) => setFurniturePresetId(e.target.value)}>
                    {activeFurniturePresets.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                  </select>
                </div>
              </>
            )}
          </>
        );
      })()}

      {settingsOpen && (
        <div className="settings-popover" ref={settingsPopoverRef}>
          <div className="settings-popover-title">Settings</div>
          <div className="control-group">
            <span>Render Mode</span>
            <div className="place-switches">
              {renderModes.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  className={renderMode === mode.value ? 'place-switch place-switch-active' : 'place-switch'}
                  onClick={() => setRenderMode(mode.value)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
          <div className="control-group">
            <label htmlFor="default-floor">Default Floor</label>
            <select id="default-floor" value={defaultFloor} onChange={(e) => setDefaultFloor(e.target.value)}>
              {FLOOR_MATERIALS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div className="control-group">
            <label htmlFor="base-unit">Base Unit</label>
            <select id="base-unit" value={String(baseUnitM)} onChange={(e) => updateBaseUnit(Number(e.target.value))}>
              {BASE_UNIT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="inner-thickness-din">Inner Wall Thickness (DIN)</label>
            <select
              id="inner-thickness-din"
              value={thicknessOptionValue(wallThicknessByTypeM.inner)}
              onChange={(e) => updateWallThicknessM('inner', e.target.value)}
            >
              {DIN_WALL_THICKNESS_OPTIONS_M.map((item) => (
                <option key={item.value} value={thicknessOptionValue(item.value)}>{item.label}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="outer-thickness-din">Outer Wall Thickness (DIN)</label>
            <select
              id="outer-thickness-din"
              value={thicknessOptionValue(wallThicknessByTypeM.outer)}
              onChange={(e) => updateWallThicknessM('outer', e.target.value)}
            >
              {DIN_WALL_THICKNESS_OPTIONS_M.map((item) => (
                <option key={item.value} value={thicknessOptionValue(item.value)}>{item.label}</option>
              ))}
            </select>
          </div>

          {hiddenRoomCount > 0 && (
            <div className="control-group">
              <span>Deleted Rooms</span>
              <button type="button" onClick={restoreHiddenRooms}>
                Restore {hiddenRoomCount} hidden room{hiddenRoomCount === 1 ? '' : 's'}
              </button>
            </div>
          )}

          <div className="control-group">
            <span>Export / Import</span>
            <div className="place-switches">
              <button type="button" onClick={exportPlan}>Export</button>
              <button type="button" onClick={() => importInputRef.current?.click()}>Import</button>
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                importPlan(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>
      )}

      {selectedRoom && (
        <>
          <div className="control-group">
            <label htmlFor="room-name">Selected Room Name</label>
            <input id="room-name" value={selectedRoom.label} onChange={(e) => updateRoomMeta(selectedRoom.key, { label: e.target.value })} />
          </div>
          <div className="control-group">
            <label htmlFor="room-floor">Selected Room Floor</label>
            <select id="room-floor" value={selectedRoom.floor} onChange={(e) => updateRoomMeta(selectedRoom.key, { floor: e.target.value })}>
              {FLOOR_MATERIALS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div className="control-group">
            <label htmlFor="room-elevation">Raised Floor Override (m)</label>
            <input
              id="room-elevation"
              type="number"
              step="0.05"
              placeholder={`Floor default (${floorRaiseM} m)`}
              value={selectedRoom.elevationM ?? ''}
              onChange={(e) => updateRoomMeta(selectedRoom.key, { elevationM: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </div>
          <div className="control-group">
            <button type="button" className="secondary" onClick={deleteSelectedRoom}>Delete Selected Room</button>
          </div>
        </>
      )}

      <div className="legend">Walls: {wallsCount} | Rooms: {roomsCount} | Fixtures: {fixturesCount}</div>
      <div className="legend">Rooms: {Number(totalRoomAreaM2 || 0).toFixed(1)}m&sup2; | BBox: {Number(boundingBoxAreaM2 || 0).toFixed(1)}m&sup2;</div>
    </aside>
  );
}
