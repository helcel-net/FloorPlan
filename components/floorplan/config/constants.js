export const GRID = 25;
export const VIEW_W = 1200;
export const VIEW_H = 800;
export const GRID_CELL_M2 = 1;
export const SNAP_RADIUS = 14;
export const EPS = 1e-6;

export const WALL_TYPES = [
  { value: 'inner', label: 'Inner Wall', defaultWidth: 4 },
  { value: 'outer', label: 'Outer Wall', defaultWidth: 8 }
];

export const WALL_MATERIALS = [
  { value: 'wood', label: 'Wood', color: '#9b643a' },
  { value: 'concrete', label: 'Concrete', color: '#6e7480' }
];

export const FLOOR_MATERIALS = [
  { value: 'tile', label: 'Tile', color: '#d8e7ec' },
  { value: 'stone', label: 'Stone', color: '#d6d1cb' },
  { value: 'wood', label: 'Wood', color: '#d8b082' },
  { value: 'tatami', label: 'Tatami', color: '#d8cea1' }
];

export const BASE_UNIT_OPTIONS = [
  { value: '0.1', label: 'Metric 10 (0.1m)' },
  { value: '0.125', label: 'Metric 8 (0.13m)' },
  { value: '0.25', label: 'Metric 4 (0.25m)' , default:true},
  { value: '0.5', label: 'Metric 2 (0.5m)' },
  { value: '0.2125', label: 'Tatami 8 (0.21m)' },
  { value: '0.425', label: 'Tatami 4 (0.43m)' },
  { value: '0.85', label: 'Tatami 2 (0.85m)' }
];

export const DIN_WALL_THICKNESS_OPTIONS_M = [
  { value: '0.115', label: '11.5 cm (DIN)' },
  { value: '0.175', label: '17.5 cm (DIN)' },
  { value: '0.24', label: '24.0 cm (DIN)' },
  { value: '0.30', label: '30.0 cm (DIN)' },
  { value: '0.365', label: '36.5 cm (DIN)' }
];

export const RENDER_MODES = [
  { value: 'design', label: 'Design' },
  { value: 'technical', label: 'Technical' },
  { value: 'utilities', label: 'Utilities' }
];
