export const DOOR_TYPES = [
  { value: 'open', label: 'Open (Frame)' },
  { value: 'swing', label: 'Swing' },
  { value: 'slide', label: 'Slide' },
  { value: 'fold', label: 'Fold' }
];

export const DOOR_PRESETS_M = [
  { value: 0.735, label: '735 mm (DIN)' },
  { value: 0.86, label: '860 mm (DIN)' },
  { value: 0.985, label: '985 mm (DIN)' },
  { value: 1.11, label: '1110 mm (DIN)' }
];

export const WINDOW_PRESETS_M = [
  { value: 0.6, label: '600 mm (DIN)' },
  { value: 0.8, label: '800 mm (DIN)' },
  { value: 1.0, label: '1000 mm (DIN)' },
  { value: 1.2, label: '1200 mm (DIN)' },
  { value: 1.5, label: '1500 mm (DIN)' }
];

export const WINDOW_TYPES = [
  { value: 'open', label: 'Open (Frame)' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'swing', label: 'Swing' },
  { value: 'slide', label: 'Slide' },
  { value: 'tilt', label: 'Tilt' }
];

// Vertical placement presets for a window opening - `sillM` is height above
// the finished floor, `heightM` is the opening's own height (null means
// "stretch up to the wall's own height", for a floor-to-ceiling opening).
export const WINDOW_HEIGHT_PRESETS = [
  { value: 'standard', label: 'Standard', sillM: 0.9, heightM: 1.15 },
  { value: 'clerestory', label: 'Clerestory (Ranma)', sillM: 2.0, heightM: 0.45 },
  { value: 'full', label: 'Full Height', sillM: 0, heightM: null }
];

export const FURNITURE_PRESETS = {
  living: [
    { id: 'sofa-180x90', label: 'Sofa 1800 x 900 mm', widthM: 1.8, depthM: 0.9 },
    { id: 'sofa-220x95', label: 'Sofa 2200 x 950 mm', widthM: 2.2, depthM: 0.95 },
    { id: 'sofa-chaise-l-200x160', label: 'Chaise L 2000 x 1600 mm (DIN)', widthM: 2.0, depthM: 1.6 },
    { id: 'sofa-chaise-r-200x160', label: 'Chaise R 2000 x 1600 mm (DIN)', widthM: 2.0, depthM: 1.6 },
    { id: 'coffee-table-120x60', label: 'Coffee Table 1200 x 600 mm (DIN)', widthM: 1.2, depthM: 0.6 },
    { id: 'coffee-table-90x90', label: 'Coffee Table 900 x 900 mm (Usual)', widthM: 0.9, depthM: 0.9 },
    { id: 'storage-tv-console-180x45', label: 'TV Console 1800 x 450 mm (DIN)', widthM: 1.8, depthM: 0.45 },
    { id: 'tv-55in-123x5', label: 'TV 55" (Wall-mounted) 1230 x 50 mm', widthM: 1.23, depthM: 0.05 },
    { id: 'living-usm-sofa-side-table-52x37', label: 'USM Sofa Side Table 523 x 373 mm', widthM: 0.523, depthM: 0.373 },
    { id: 'storage-bookshelf-90x30', label: 'Bookshelf 900 x 300 mm', widthM: 0.9, depthM: 0.3 },
    { id: 'mirror-100x5', label: 'Mirror 1000 x 50 mm', widthM: 1.0, depthM: 0.05 },
    { id: 'rug-160x230', label: 'Area Rug 1600 x 2300 mm', widthM: 1.6, depthM: 2.3 },
    { id: 'rug-200x300', label: 'Area Rug 2000 x 3000 mm', widthM: 2.0, depthM: 3.0 },
    { id: 'chair-armchair-85x85', label: 'Armchair 850 x 850 mm', widthM: 0.85, depthM: 0.85 },
    { id: 'ottoman-60x60', label: 'Ottoman 600 x 600 mm', widthM: 0.6, depthM: 0.6 },
    { id: 'tatami-90x180', label: 'Tatami Mat 900 x 1800 mm (1 Jō)', widthM: 0.9, depthM: 1.8 },
    { id: 'tatami-45x180', label: 'Half Tatami 450 x 1800 mm', widthM: 0.45, depthM: 1.8 },
    { id: 'zabuton-55x59', label: 'Zabuton Floor Cushion 550 x 590 mm', widthM: 0.55, depthM: 0.59 },
    { id: 'kotatsu-80x80', label: 'Kotatsu 800 x 800 mm', widthM: 0.8, depthM: 0.8 },
    { id: 'kotatsu-120x80', label: 'Kotatsu 1200 x 800 mm', widthM: 1.2, depthM: 0.8 },
    { id: 'byobu-150x30', label: 'Byōbu Folding Screen 1500 x 300 mm', widthM: 1.5, depthM: 0.3 },
    { id: 'shoji-screen-90x3', label: 'Shoji Sliding Screen 900 x 30 mm', widthM: 0.9, depthM: 0.03 }
  ],
  lighting: [
    { id: 'lamp-tolomeo-mini-35', label: 'Artemide Tolomeo Mini 350 x 350 mm', widthM: 0.35, depthM: 0.35 },
    { id: 'lamp-tolomeo-tera-45', label: 'Artemide Tolomeo Terra 450 x 450 mm', widthM: 0.45, depthM: 0.45 },
    { id: 'lamp-tolomeo-mega-55', label: 'Artemide Tolomeo Mega 550 x 550 mm', widthM: 0.55, depthM: 0.55 },
    { id: 'ceiling-light-30', label: 'Ceiling Light 300 x 300 mm', widthM: 0.3, depthM: 0.3 },
    { id: 'ceiling-light-pendant-25', label: 'Pendant Light 250 x 250 mm', widthM: 0.25, depthM: 0.25 }
  ],
  dining: [
    { id: 'table-120x80', label: 'Dining Table 1200 x 800 mm (DIN)', widthM: 1.2, depthM: 0.8 },
    { id: 'table-160x90', label: 'Dining Table 1600 x 900 mm (DIN)', widthM: 1.6, depthM: 0.9 },
    { id: 'table-180x90', label: 'Dining Table 1800 x 900 mm (DIN)', widthM: 1.8, depthM: 0.9 },
    { id: 'chair-dining-48x52', label: 'Dining Chair 480 x 520 mm (DIN)', widthM: 0.48, depthM: 0.52 },
    { id: 'chair-45x45', label: 'Chair 450 x 450 mm (DIN)', widthM: 0.45, depthM: 0.45 },
    { id: 'stool-bar-35', label: 'Bar Stool 350 x 350 mm', widthM: 0.35, depthM: 0.35 },
    { id: 'storage-sideboard-160x45', label: 'Sideboard 1600 x 450 mm', widthM: 1.6, depthM: 0.45 },
    { id: 'chabudai-round-90', label: 'Chabudai Round Table Ø900 mm', widthM: 0.9, depthM: 0.9 }
  ],
  storage: [
    { id: 'storage-elfa-45x40', label: 'ELFA 450 x 400 mm', widthM: 0.45, depthM: 0.4 },
    { id: 'storage-elfa-60x40', label: 'ELFA 605 x 400 mm', widthM: 0.605, depthM: 0.4 },
    { id: 'storage-elfa-90x40', label: 'ELFA 900 x 400 mm', widthM: 0.9, depthM: 0.4 },
    { id: 'storage-elfa-120x40', label: 'ELFA 1200 x 400 mm', widthM: 1.2, depthM: 0.4 },
    { id: 'storage-usm-haller-77x37', label: 'USM Haller 773 x 373 mm', widthM: 0.773, depthM: 0.373 },
    { id: 'storage-usm-haller-152x37', label: 'USM Haller 1523 x 373 mm', widthM: 1.523, depthM: 0.373 },
    { id: 'storage-usm-haller-227x52', label: 'USM Haller 2273 x 523 mm', widthM: 2.273, depthM: 0.523 },
    { id: 'storage-tv-console-180x45', label: 'TV Console 1800 x 450 mm (DIN)', widthM: 1.8, depthM: 0.45 },
    { id: 'storage-tv-console-220x45', label: 'TV Console 2200 x 450 mm (DIN)', widthM: 2.2, depthM: 0.45 },
    { id: 'storage-fireplace-120x40', label: 'Fireplace 1200 x 400 mm', widthM: 1.2, depthM: 0.4 },
    { id: 'storage-bookshelf-90x30', label: 'Bookshelf 900 x 300 mm', widthM: 0.9, depthM: 0.3 },
    { id: 'storage-bookshelf-120x30', label: 'Bookshelf 1200 x 300 mm', widthM: 1.2, depthM: 0.3 },
    { id: 'closet-120x60', label: 'Closet 1200 x 600 mm (DIN)', widthM: 1.2, depthM: 0.6 },
    { id: 'closet-180x60', label: 'Closet 1800 x 600 mm (DIN)', widthM: 1.8, depthM: 0.6 },
    { id: 'mirror-100x5', label: 'Mirror 1000 x 50 mm', widthM: 1.0, depthM: 0.05 },
    { id: 'storage-sideboard-160x45', label: 'Sideboard 1600 x 450 mm', widthM: 1.6, depthM: 0.45 },
    { id: 'storage-entry-bench-90x40', label: 'Entry Bench 900 x 400 mm', widthM: 0.9, depthM: 0.4 }
  ],
  plants: [
    { id: 'plant-pot-s-35', label: 'Plant Pot S 350 x 350 mm', widthM: 0.35, depthM: 0.35 },
    { id: 'plant-pot-l-55', label: 'Plant Pot L 550 x 550 mm', widthM: 0.55, depthM: 0.55 },
    { id: 'plant-tree-m-90', label: 'Indoor Tree M 900 x 900 mm', widthM: 0.9, depthM: 0.9 },
    { id: 'plant-tree-l-120', label: 'Indoor Tree L 1200 x 1200 mm', widthM: 1.2, depthM: 1.2 },
    { id: 'plant-raisedbed-120x60', label: 'Raised Bed 1200 x 600 mm', widthM: 1.2, depthM: 0.6 },
    { id: 'plant-raisedbed-180x90', label: 'Raised Bed 1800 x 900 mm', widthM: 1.8, depthM: 0.9 }
  ],
  kitchen: [
    { id: 'appliance-kitchen-base-30', label: 'Base Unit 300 x 600 mm (Narrow)', widthM: 0.3, depthM: 0.6 },
    { id: 'appliance-kitchen-base-60', label: 'Base Unit 600 x 600 mm (DIN)', widthM: 0.6, depthM: 0.6 },
    { id: 'appliance-kitchen-base-120', label: 'Base Unit 1200 x 600 mm (DIN)', widthM: 1.2, depthM: 0.6 },
    { id: 'appliance-fridge-60x65', label: 'Fridge 600 x 650 mm (DIN)', widthM: 0.6, depthM: 0.65 },
    { id: 'appliance-fridge-90x75', label: 'Fridge 900 x 750 mm (DIN)', widthM: 0.9, depthM: 0.75 },
    { id: 'appliance-sink-80x60', label: 'Sink 800 x 600 mm (DIN)', widthM: 0.8, depthM: 0.6 },
    { id: 'appliance-sink-100x60', label: 'Sink 1000 x 600 mm (DIN)', widthM: 1.0, depthM: 0.6 },
    { id: 'appliance-dishwasher-60x60', label: 'Dishwasher 600 x 600 mm (DIN)', widthM: 0.6, depthM: 0.6 },
    { id: 'appliance-dishwasher-45x60', label: 'Dishwasher 450 x 600 mm (DIN)', widthM: 0.45, depthM: 0.6 },
    { id: 'appliance-oven-60x60', label: 'Oven 600 x 600 mm (DIN)', widthM: 0.6, depthM: 0.6 },
    { id: 'appliance-stove-60x60', label: 'Stove 600 x 600 mm (DIN)', widthM: 0.6, depthM: 0.6 },
    { id: 'appliance-bins-60x60', label: 'Bins 600 x 600 mm (DIN)', widthM: 0.6, depthM: 0.6 },
    { id: 'appliance-kitchen-base-island-160x90', label: 'Kitchen Island 1600 x 900 mm', widthM: 1.6, depthM: 0.9 },
    { id: 'appliance-microwave-45x40', label: 'Microwave 450 x 400 mm', widthM: 0.45, depthM: 0.4 },
    { id: 'appliance-range-hood-60x60', label: 'Range Hood 600 x 600 mm', widthM: 0.6, depthM: 0.6 }
  ],
  laundry: [
    { id: 'appliance-washer-60x60', label: 'Washer 600 x 600 mm (DIN)', widthM: 0.6, depthM: 0.6 },
    { id: 'appliance-dryer-60x60', label: 'Dryer 600 x 600 mm (DIN)', widthM: 0.6, depthM: 0.6 },
    { id: 'appliance-utility-sink-60x55', label: 'Utility Sink 600 x 550 mm', widthM: 0.6, depthM: 0.55 }
  ],
  bath: [
    { id: 'bath-sink-small-40x35', label: 'Small Bath Sink 400 x 350 mm (DIN)', widthM: 0.4, depthM: 0.35 },
    { id: 'toilet-40x70', label: 'Toilet 400 x 700 mm (DIN)', widthM: 0.4, depthM: 0.7 },
    { id: 'toilet-45x75', label: 'Toilet 450 x 750 mm (DIN)', widthM: 0.45, depthM: 0.75 },
    { id: 'toilet-japanese-40x72', label: 'Japanese Toilet 400 x 720 mm (Washlet)', widthM: 0.4, depthM: 0.72 },
    { id: 'shower-90x90', label: 'Shower 900 x 900 mm (DIN)', widthM: 0.9, depthM: 0.9 },
    { id: 'shower-120x90', label: 'Walk-in Shower 1200 x 900 mm (DIN)', widthM: 1.2, depthM: 0.9 },
    { id: 'bathtub-160x70', label: '1600 x 700 mm (DIN)', widthM: 1.6, depthM: 0.7 },
    { id: 'bathtub-180x80', label: '1800 x 800 mm (DIN)', widthM: 1.8, depthM: 0.8 },
    { id: 'bathtub-ofuro-80x80', label: 'Ofuro Soaking Tub 800 x 800 mm', widthM: 0.8, depthM: 0.8 },
    { id: 'bathtub-ofuro-90x70', label: 'Ofuro Soaking Tub 900 x 700 mm', widthM: 0.9, depthM: 0.7 },
    { id: 'wash-station-60x60', label: 'Washing Station (Faucet + Tabouret) 600 x 600 mm', widthM: 0.6, depthM: 0.6 }
  ],
  bedroom: [
    { id: 'bed-90x200', label: '900 x 2000 mm (DIN)', widthM: 0.9, depthM: 2.0 },
    { id: 'bed-160x200', label: '1600 x 2000 mm (DIN)', widthM: 1.6, depthM: 2.0 },
    { id: 'bed-200x200', label: '2000 x 2000 mm', widthM: 2.0, depthM: 2.0 },
    { id: 'nightstand-45x40', label: 'Nightstand 450 x 400 mm (DIN)', widthM: 0.45, depthM: 0.4 },
    { id: 'nightstand-60x45', label: 'Nightstand 600 x 450 mm (DIN)', widthM: 0.6, depthM: 0.45 },
    { id: 'closet-120x60', label: 'Wardrobe 1200 x 600 mm (DIN)', widthM: 1.2, depthM: 0.6 },
    { id: 'closet-180x60', label: 'Wardrobe 1800 x 600 mm (DIN)', widthM: 1.8, depthM: 0.6 },
    { id: 'tatami-90x180', label: 'Tatami Mat 900 x 1800 mm (1 Jō)', widthM: 0.9, depthM: 1.8 },
    { id: 'tatami-45x180', label: 'Half Tatami 450 x 1800 mm', widthM: 0.45, depthM: 1.8 },
    { id: 'futon-100x200', label: 'Futon (Single) 1000 x 2000 mm', widthM: 1.0, depthM: 2.0 },
    { id: 'futon-140x200', label: 'Futon (Double) 1400 x 2000 mm', widthM: 1.4, depthM: 2.0 },
    { id: 'mirror-100x5', label: 'Mirror 1000 x 50 mm', widthM: 1.0, depthM: 0.05 },
    { id: 'rug-160x230', label: 'Area Rug 1600 x 2300 mm', widthM: 1.6, depthM: 2.3 },
    { id: 'storage-dresser-100x50', label: 'Dresser 1000 x 500 mm', widthM: 1.0, depthM: 0.5 },
    { id: 'crib-70x130', label: 'Crib 700 x 1300 mm', widthM: 0.7, depthM: 1.3 },
    { id: 'changing-table-80x50', label: 'Changing Table 800 x 500 mm', widthM: 0.8, depthM: 0.5 }
  ],
  office: [
    { id: 'office-desk-140x70', label: 'PC Desk 1400 x 700 mm (DIN)', widthM: 1.4, depthM: 0.7 },
    { id: 'office-desk-180x80', label: 'PC Desk 1800 x 800 mm (DIN)', widthM: 1.8, depthM: 0.8 },
    { id: 'office-chair-hag-70x70', label: 'Office Chair (HAG style) 700 x 700 mm', widthM: 0.7, depthM: 0.7 },
    { id: 'office-projector-35x30', label: 'Projector 350 x 300 mm', widthM: 0.35, depthM: 0.3 },
    { id: 'projector-screen-221x5', label: 'Projector Screen 100" (16:9, Wall-mounted) 2210 x 50 mm', widthM: 2.21, depthM: 0.05 },
    { id: 'office-usm-corpus-52x37', label: 'USM Haller Office Corpus 523 x 373 mm', widthM: 0.523, depthM: 0.373 },
    { id: 'office-usm-corpus-77x37', label: 'USM Haller Office Corpus 773 x 373 mm', widthM: 0.773, depthM: 0.373 },
    { id: 'office-usm-corpus-102x37', label: 'USM Haller Office Corpus 1023 x 373 mm', widthM: 1.023, depthM: 0.373 }
  ],
  stairs: [
    { id: 'stairs-straight-100x280', label: 'Straight Stair 1000 x 2800 mm', widthM: 1.0, depthM: 2.8 },
    { id: 'stairs-straight-90x240', label: 'Straight Stair 900 x 2400 mm', widthM: 0.9, depthM: 2.4 },
    { id: 'stairs-curved-l-140x140', label: 'Curved Stair L 1400 x 1400 mm', widthM: 1.4, depthM: 1.4 },
    { id: 'stairs-curved-r-140x140', label: 'Curved Stair R 1400 x 1400 mm', widthM: 1.4, depthM: 1.4 },
    { id: 'stairs-spiral-140', label: 'Spiral Staircase Ø1400 mm', widthM: 1.4, depthM: 1.4 }
  ],
  garden: [
    { id: 'table-garden-160x90', label: 'Garden Table 1600 x 900 mm', widthM: 1.6, depthM: 0.9 },
    { id: 'chair-garden-50x50', label: 'Garden Chair 500 x 500 mm', widthM: 0.5, depthM: 0.5 },
    { id: 'lounger-70x200', label: 'Sun Lounger 700 x 2000 mm', widthM: 0.7, depthM: 2.0 },
    { id: 'bench-garden-150x50', label: 'Garden Bench 1500 x 500 mm', widthM: 1.5, depthM: 0.5 },
    { id: 'appliance-bbq-70x60', label: 'BBQ Grill 700 x 600 mm', widthM: 0.7, depthM: 0.6 },
    { id: 'parasol-300', label: 'Parasol 3000 x 3000 mm', widthM: 3.0, depthM: 3.0 },
    { id: 'firepit-80', label: 'Fire Pit 800 x 800 mm', widthM: 0.8, depthM: 0.8 },
    { id: 'plant-pot-xl-90', label: 'Large Planter 900 x 900 mm', widthM: 0.9, depthM: 0.9 }
  ],
  electric: [
    { id: 'electric-outlet-10x10', label: 'Outlet 100 x 100 mm', widthM: 0.1, depthM: 0.1 },
    { id: 'electric-switch-8x8', label: 'Light Switch 80 x 80 mm', widthM: 0.08, depthM: 0.08 },
    { id: 'electric-panel-40x15', label: 'Electrical Panel 400 x 150 mm', widthM: 0.4, depthM: 0.15 },
    { id: 'electric-solar-inverter-40x30', label: 'Solar Inverter 400 x 300 mm', widthM: 0.4, depthM: 0.3 },
    { id: 'solar-panel-vertical-100x170', label: 'Solar Panel (Vertical) 1000 x 1700 mm', widthM: 1.0, depthM: 1.7 },
    { id: 'solar-panel-inclined-100x170', label: 'Solar Panel (Inclined) 1000 x 1700 mm', widthM: 1.0, depthM: 1.7 }
  ],
  water: [
    { id: 'water-valve-10x10', label: 'Shutoff Valve 100 x 100 mm', widthM: 0.1, depthM: 0.1 },
    { id: 'water-drain-10x10', label: 'Floor Drain 100 x 100 mm', widthM: 0.1, depthM: 0.1 },
    { id: 'water-pump-30x30', label: 'Water Pump 300 x 300 mm', widthM: 0.3, depthM: 0.3 },
    { id: 'water-filter-25x25', label: 'Water Filter 250 x 250 mm', widthM: 0.25, depthM: 0.25 },
    { id: 'water-heater-50x50', label: 'Water Heater 500 x 500 mm', widthM: 0.5, depthM: 0.5 }
  ]
};
export const FURNITURE_TYPES = [
  { value: 'living', label: 'Living' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'dining', label: 'Dining' },
  { value: 'storage', label: 'Storage' },
  { value: 'plants', label: 'Plants' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'bath', label: 'Bath' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'office', label: 'Office' },
  { value: 'garden', label: 'Garden' }
];

// Rough box height per furniture category, for a simplified 3D block -
// there's no per-item height in the catalog above, so this is the fallback
// whenever a preset's id doesn't match any of the more specific overrides
// below, rather than tuning all ~140 individual items by hand.
const FURNITURE_HEIGHT_BY_CATEGORY_M = {
  living: 0.75,
  lighting: 1.4,
  dining: 0.75,
  storage: 1.2,
  plants: 0.9,
  kitchen: 0.9,
  laundry: 0.9,
  bath: 0.6,
  bedroom: 0.55,
  office: 0.75,
  garden: 0.75,
  electric: 0.2,
  water: 0.3
};
const DEFAULT_FURNITURE_HEIGHT_M = 0.75;

// A category default alone would render, say, a rug and a wardrobe as the
// same-height block - these id-pattern overrides catch the items where a
// flat category height would look obviously wrong (floor coverings, very
// low or very tall pieces), checked in order with the first match winning.
// Everything else still falls back to the category default above.
const FURNITURE_HEIGHT_OVERRIDES_M = [
  [/^(rug|tatami|zabuton)-/, 0.02],
  [/^shoji-screen-/, 1.8],
  [/^byobu-/, 1.5],
  [/^(coffee-table|kotatsu|chabudai)-/, 0.4],
  [/^ottoman-/, 0.4],
  [/^(sofa|chair-armchair)-/, 0.8],
  [/^(chair|stool)-/, 0.85],
  [/^(table|office-desk)-/, 0.75],
  [/^(closet|storage-bookshelf|storage-elfa|storage-usm-haller)-/, 1.9],
  [/^(storage-sideboard|storage-dresser|storage-tv-console|nightstand|storage-entry-bench|storage-fireplace)-/, 0.5],
  [/^appliance-fridge-/, 1.8],
  [/^(appliance-microwave|appliance-range-hood)-/, 0.4],
  [/^(appliance-kitchen-base|appliance-dishwasher|appliance-oven|appliance-stove|appliance-bins|appliance-washer|appliance-dryer|appliance-utility-sink)-/, 0.85],
  [/^(appliance-sink|bath-sink|wash-station)-/, 0.85],
  [/^toilet-/, 0.4],
  [/^shower-/, 2.0],
  [/^bathtub-/, 0.55],
  [/^(bed|futon)-/, 0.5],
  [/^crib-/, 0.9],
  [/^changing-table-/, 0.9],
  [/^lamp-tolomeo-mini/, 1.3],
  [/^lamp-tolomeo-tera/, 1.5],
  [/^lamp-tolomeo-mega/, 1.8],
  [/^ceiling-light/, 2.3],
  [/^plant-tree-l-/, 1.8],
  [/^plant-tree-m-/, 1.2],
  [/^(plant-pot|plant-raisedbed)-/, 0.5],
  [/^office-usm-corpus-/, 1.0],
  [/^office-projector-/, 0.3],
  [/^parasol-/, 2.2],
  [/^firepit-/, 0.3],
  [/^lounger-/, 0.4],
  [/^bench-garden-/, 0.45],
  [/^appliance-bbq-/, 0.9],
  [/^(mirror|tv-|projector-screen)-/, 1.2],
  [/^(electric-outlet|electric-switch)-/, 0.15],
  [/^solar-panel-/, 1.7],
  [/^(electric-panel|electric-solar-inverter|water-valve|water-drain|water-filter)-/, 0.3],
  [/^(water-pump|water-heater)-/, 0.5]
];

export function estimateFurnitureHeightM(furnitureType, presetId) {
  const override = FURNITURE_HEIGHT_OVERRIDES_M.find(([pattern]) => pattern.test(presetId || ''));
  if (override) return override[1];
  return FURNITURE_HEIGHT_BY_CATEGORY_M[furnitureType] || DEFAULT_FURNITURE_HEIGHT_M;
}
