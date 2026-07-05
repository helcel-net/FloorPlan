import {
  BASE_UNIT_OPTIONS,
  DIN_WALL_THICKNESS_OPTIONS_M,
  FLOOR_MATERIALS,
  WALL_MATERIALS,
  WALL_TYPES
} from '../config/constants';
import {
  DOOR_PRESETS_M,
  DOOR_TYPES,
  FURNITURE_TYPES,
  WINDOW_PRESETS_M
} from '../editor/catalog';
import { thicknessOptionValue } from '../core/walls';

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
  placeKind,
  setPlaceKind,
  doorType,
  setDoorType,
  doorHinge,
  setDoorHinge,
  doorWidthM,
  setDoorWidthM,
  windowWidthM,
  setWindowWidthM,
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
  wallsCount,
  roomsCount,
  fixturesCount,
  totalRoomAreaM2,
  boundingBoxAreaM2
}) {
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
            <button type="button" className="secondary" onClick={deleteSelectedWall}>Delete Selected Wall</button>
          </div>
        </>
      )}

      {toolMode === 'place' && (
        <>
          <div className="control-group">
            <span>Place Category</span>
            <div className="place-switches">
              <button type="button" className={placeKind === 'door' ? 'place-switch place-switch-active' : 'place-switch'} onClick={() => setPlaceKind('door')}>Door</button>
              <button type="button" className={placeKind === 'window' ? 'place-switch place-switch-active' : 'place-switch'} onClick={() => setPlaceKind('window')}>Window</button>
              <button type="button" className={placeKind === 'furniture' ? 'place-switch place-switch-active' : 'place-switch'} onClick={() => setPlaceKind('furniture')}>Furniture</button>
            </div>
          </div>

          {placeKind === 'door' && (
            <>
              <div className="control-group">
                <label htmlFor="door-type">Door Type</label>
                <select id="door-type" value={doorType} onChange={(e) => setDoorType(e.target.value)}>
                  {DOOR_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
              <div className="control-group">
                <label htmlFor="door-hinge">Door Hinge</label>
                <select id="door-hinge" value={doorHinge} onChange={(e) => setDoorHinge(e.target.value)}>
                  <option value="left">Left Hinge</option>
                  <option value="right">Right Hinge</option>
                </select>
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
            <div className="control-group">
              <label htmlFor="window-preset">Window Width Preset</label>
              <select id="window-preset" value={String(windowWidthM)} onChange={(e) => setWindowWidthM(Number(e.target.value))}>
                {WINDOW_PRESETS_M.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
          )}

          {placeKind === 'furniture' && (
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
      )}

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
            <button type="button" className="secondary" onClick={deleteSelectedRoom}>Delete Selected Room</button>
          </div>
        </>
      )}

      <div className="legend">Walls: {wallsCount} | Rooms: {roomsCount} | Fixtures: {fixturesCount}</div>
      <div className="legend">Rooms: {Number(totalRoomAreaM2 || 0).toFixed(1)}m&sup2; | BBox: {Number(boundingBoxAreaM2 || 0).toFixed(1)}m&sup2;</div>
    </aside>
  );
}
