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

export const FURNITURE_PRESETS = {
  living: [
    { id: 'sofa-180x90', label: 'Sofa 1800 x 900 mm', widthM: 1.8, depthM: 0.9 },
    { id: 'sofa-220x95', label: 'Sofa 2200 x 950 mm', widthM: 2.2, depthM: 0.95 },
    { id: 'sofa-chaise-l-200x160', label: 'Chaise L 2000 x 1600 mm (DIN)', widthM: 2.0, depthM: 1.6 },
    { id: 'sofa-chaise-r-200x160', label: 'Chaise R 2000 x 1600 mm (DIN)', widthM: 2.0, depthM: 1.6 },
    { id: 'coffee-table-120x60', label: 'Coffee Table 1200 x 600 mm (DIN)', widthM: 1.2, depthM: 0.6 },
    { id: 'coffee-table-90x90', label: 'Coffee Table 900 x 900 mm (Usual)', widthM: 0.9, depthM: 0.9 },
    { id: 'storage-tv-console-180x45', label: 'TV Console 1800 x 450 mm (DIN)', widthM: 1.8, depthM: 0.45 },
    { id: 'living-usm-sofa-side-table-52x37', label: 'USM Sofa Side Table 523 x 373 mm', widthM: 0.523, depthM: 0.373 },
    { id: 'storage-bookshelf-90x30', label: 'Bookshelf 900 x 300 mm', widthM: 0.9, depthM: 0.3 },
    { id: 'mirror-100x5', label: 'Mirror 1000 x 50 mm', widthM: 1.0, depthM: 0.05 },
    { id: 'rug-160x230', label: 'Area Rug 1600 x 2300 mm', widthM: 1.6, depthM: 2.3 },
    { id: 'rug-200x300', label: 'Area Rug 2000 x 3000 mm', widthM: 2.0, depthM: 3.0 }
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
    { id: 'chair-45x45', label: 'Chair 450 x 450 mm (DIN)', widthM: 0.45, depthM: 0.45 }
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
    { id: 'mirror-100x5', label: 'Mirror 1000 x 50 mm', widthM: 1.0, depthM: 0.05 }
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
    { id: 'appliance-bins-60x60', label: 'Bins 600 x 600 mm (DIN)', widthM: 0.6, depthM: 0.6 }
  ],
  laundry: [
    { id: 'appliance-washer-60x60', label: 'Washer 600 x 600 mm (DIN)', widthM: 0.6, depthM: 0.6 },
    { id: 'appliance-dryer-60x60', label: 'Dryer 600 x 600 mm (DIN)', widthM: 0.6, depthM: 0.6 }
  ],
  bath: [
    { id: 'bath-sink-small-40x35', label: 'Small Bath Sink 400 x 350 mm (DIN)', widthM: 0.4, depthM: 0.35 },
    { id: 'toilet-40x70', label: 'Toilet 400 x 700 mm (DIN)', widthM: 0.4, depthM: 0.7 },
    { id: 'toilet-45x75', label: 'Toilet 450 x 750 mm (DIN)', widthM: 0.45, depthM: 0.75 },
    { id: 'toilet-japanese-40x72', label: 'Japanese Toilet 400 x 720 mm (Washlet)', widthM: 0.4, depthM: 0.72 },
    { id: 'shower-90x90', label: 'Shower 900 x 900 mm (DIN)', widthM: 0.9, depthM: 0.9 },
    { id: 'shower-120x90', label: 'Walk-in Shower 1200 x 900 mm (DIN)', widthM: 1.2, depthM: 0.9 },
    { id: 'bathtub-160x70', label: '1600 x 700 mm (DIN)', widthM: 1.6, depthM: 0.7 },
    { id: 'bathtub-180x80', label: '1800 x 800 mm (DIN)', widthM: 1.8, depthM: 0.8 }
  ],
  bedroom: [
    { id: 'bed-90x200', label: '900 x 2000 mm (DIN)', widthM: 0.9, depthM: 2.0 },
    { id: 'bed-160x200', label: '1600 x 2000 mm (DIN)', widthM: 1.6, depthM: 2.0 },
    { id: 'bed-200x200', label: '2000 x 2000 mm', widthM: 2.0, depthM: 2.0 },
    { id: 'nightstand-45x40', label: 'Nightstand 450 x 400 mm (DIN)', widthM: 0.45, depthM: 0.4 },
    { id: 'nightstand-60x45', label: 'Nightstand 600 x 450 mm (DIN)', widthM: 0.6, depthM: 0.45 },
    { id: 'closet-120x60', label: 'Wardrobe 1200 x 600 mm (DIN)', widthM: 1.2, depthM: 0.6 },
    { id: 'closet-180x60', label: 'Wardrobe 1800 x 600 mm (DIN)', widthM: 1.8, depthM: 0.6 },
    { id: 'mirror-100x5', label: 'Mirror 1000 x 50 mm', widthM: 1.0, depthM: 0.05 },
    { id: 'rug-160x230', label: 'Area Rug 1600 x 2300 mm', widthM: 1.6, depthM: 2.3 }
  ],
  office: [
    { id: 'office-desk-140x70', label: 'PC Desk 1400 x 700 mm (DIN)', widthM: 1.4, depthM: 0.7 },
    { id: 'office-desk-180x80', label: 'PC Desk 1800 x 800 mm (DIN)', widthM: 1.8, depthM: 0.8 },
    { id: 'office-chair-hag-70x70', label: 'Office Chair (HAG style) 700 x 700 mm', widthM: 0.7, depthM: 0.7 },
    { id: 'office-projector-35x30', label: 'Projector 350 x 300 mm', widthM: 0.35, depthM: 0.3 },
    { id: 'office-usm-corpus-52x37', label: 'USM Haller Office Corpus 523 x 373 mm', widthM: 0.523, depthM: 0.373 },
    { id: 'office-usm-corpus-77x37', label: 'USM Haller Office Corpus 773 x 373 mm', widthM: 0.773, depthM: 0.373 },
    { id: 'office-usm-corpus-102x37', label: 'USM Haller Office Corpus 1023 x 373 mm', widthM: 1.023, depthM: 0.373 }
  ],
  stairs: [
    { id: 'stairs-straight-100x280', label: 'Straight Stair 1000 x 2800 mm', widthM: 1.0, depthM: 2.8 },
    { id: 'stairs-straight-90x240', label: 'Straight Stair 900 x 2400 mm', widthM: 0.9, depthM: 2.4 }
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
  { value: 'stairs', label: 'Stairs' }
];
