import { GRID } from '../config/constants';
import { normalizeFurnitureType } from '../editor/utils';

export default function FixtureLayer({ renderFixtures, baseUnitM, selectedFixtureId }) {
  return renderFixtures.map((fixture) => {
    if (fixture.kind === 'door' || fixture.kind === 'window') {
      const widthPx = ((Number(fixture.widthM) || 0.8) / baseUnitM) * GRID;
      const half = widthPx / 2;
      const angle = Number(fixture.angle) || 0;
      const ux = Math.cos(angle);
      const uy = Math.sin(angle);
      const dirSign = (Math.abs(ux) > Math.abs(uy) ? (ux >= 0 ? 1 : -1) : (uy >= 0 ? 1 : -1));
      const axisX = ux * dirSign;
      const axisY = uy * dirSign;
      const nx = -axisY;
      const ny = axisX;
      const x1 = fixture.position.x - ux * half;
      const y1 = fixture.position.y - uy * half;
      const x2 = fixture.position.x + ux * half;
      const y2 = fixture.position.y + uy * half;
      const previewOpacity = fixture.isPreview ? 0.45 : 1;
      const isSelected = !fixture.isPreview && selectedFixtureId === fixture.id;

      if (fixture.kind === 'window') {
        return (
          <g key={fixture.id} opacity={previewOpacity}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={isSelected ? '#0f4d6f' : '#2a6f93'} strokeWidth={isSelected ? 3 : 2} strokeLinecap="round" />
          </g>
        );
      }

      const hingeSign = fixture.hinge === 'right' ? -1 : 1;
      const swingSide = Number(fixture.swingSide) >= 0 ? -1 : 1;
      const hingeAxisX = axisX * swingSide;
      const hingeAxisY = axisY * swingSide;
      const hingeX = fixture.position.x + hingeAxisX * half * hingeSign;
      const hingeY = fixture.position.y + hingeAxisY * half * hingeSign;
      const leafLength = widthPx;
      const closedVecX = hingeAxisX * (-hingeSign);
      const closedVecY = hingeAxisY * (-hingeSign);
      const openVecX = nx * -swingSide;
      const openVecY = ny * swingSide;
      const leafEndX = hingeX + openVecX * leafLength;
      const leafEndY = hingeY + openVecY * leafLength;
      const closedEndX = hingeX + closedVecX * leafLength;
      const closedEndY = hingeY + closedVecY * leafLength;
      const cross = (closedVecX * openVecY) - (closedVecY * openVecX);
      const sweepFlag = cross < 0 ? 0 : 1;
      const doorTypeValue = fixture.doorType || 'open';

      return (
        <g key={fixture.id} opacity={previewOpacity}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={isSelected ? '#7f2b21' : '#8a7b62'} strokeWidth={isSelected ? 2.5 : 1.5} strokeDasharray="5 4" />
          {doorTypeValue === 'swing' && (
            <>
              <line x1={hingeX} y1={hingeY} x2={leafEndX} y2={leafEndY} stroke="#ad3c2f" strokeWidth={isSelected ? 3 : 2} strokeLinecap="round" />
              <path d={`M ${closedEndX} ${closedEndY} A ${leafLength} ${leafLength} 0 0 ${sweepFlag} ${leafEndX} ${leafEndY}`} fill="none" stroke="#ad3c2f" strokeWidth={isSelected ? 2 : 1.5} />
            </>
          )}

          {doorTypeValue === 'slide' && (
            <line
              x1={x1 + nx * swingSide * 8}
              y1={y1 + ny * swingSide * 8}
              x2={x2 + nx * swingSide * 8}
              y2={y2 + ny * swingSide * 8}
              stroke="#ad3c2f"
              strokeWidth={isSelected ? 3 : 2}
            />
          )}

          {doorTypeValue === 'fold' && (
            <>
              {(() => {
                const foldLeafLength = widthPx * 0.5;
                const openAngle = (Math.PI / 2) * 0.75;
                const signedAngle = swingSide * openAngle;
                const cosOpen = Math.cos(signedAngle);
                const sinOpen = Math.sin(signedAngle);
                const cosClose = Math.cos(-signedAngle);
                const sinClose = Math.sin(-signedAngle);
                const rotate = (vx, vy, cosV, sinV) => ({
                  x: (vx * cosV) - (vy * sinV),
                  y: (vx * sinV) + (vy * cosV)
                });
                const base = { x: closedVecX, y: closedVecY };
                const firstDir = rotate(base.x, base.y, cosOpen, sinOpen);
                const secondDir = rotate(base.x, base.y, cosClose, sinClose);
                const firstEnd = { x: hingeX + firstDir.x * foldLeafLength, y: hingeY + firstDir.y * foldLeafLength };
                const secondEnd = { x: firstEnd.x + secondDir.x * foldLeafLength, y: firstEnd.y + secondDir.y * foldLeafLength };

                return (
                  <>
                    <line x1={hingeX} y1={hingeY} x2={firstEnd.x} y2={firstEnd.y} stroke="#ad3c2f" strokeWidth={isSelected ? 3 : 2} />
                    <line x1={firstEnd.x} y1={firstEnd.y} x2={secondEnd.x} y2={secondEnd.y} stroke="#ad3c2f" strokeWidth={isSelected ? 3 : 2} />
                  </>
                );
              })()}
            </>
          )}
        </g>
      );
    }

    const widthPx = ((Number(fixture.widthM) || 1) / baseUnitM) * GRID;
    const depthPx = ((Number(fixture.depthM) || 1) / baseUnitM) * GRID;
    const isSelected = !fixture.isPreview && selectedFixtureId === fixture.id;
    const left = fixture.position.x - widthPx / 2;
    const top = fixture.position.y - depthPx / 2;
    const furnitureTypeValue = normalizeFurnitureType(fixture.furnitureType);
    const presetIdValue = fixture.presetId || '';
    const isLamp = presetIdValue.startsWith('lamp-');
    const isChair = presetIdValue.startsWith('chair-');
    const isSofa = presetIdValue.startsWith('sofa-');
    const isStorage = presetIdValue.startsWith('storage-') || presetIdValue.startsWith('closet-');
    const isPlant = presetIdValue.startsWith('plant-');
    const isBath = furnitureTypeValue === 'bath';
    const isKitchen = furnitureTypeValue === 'kitchen';
    const isLaundry = furnitureTypeValue === 'laundry';
    const isChaise = isSofa && presetIdValue.includes('chaise');
    const chaiseOnRight = presetIdValue.includes('-r-');

    const baseFill = isPlant
      ? 'rgba(74, 122, 81, 0.18)'
      : ((isKitchen || isLaundry || isBath) ? 'rgba(101, 117, 132, 0.18)' : 'rgba(58, 95, 66, 0.15)');
    const baseStroke = isPlant ? '#3f6f49' : ((isKitchen || isLaundry || isBath) ? '#4f6072' : '#3a5f42');
    const strokeColor = isSelected ? '#22303b' : baseStroke;
    return (
      <g
        key={fixture.id}
        opacity={fixture.isPreview ? 0.45 : 1}
        transform={`rotate(${Number(fixture.angleDeg) || 0} ${fixture.position.x} ${fixture.position.y})`}
      >
        {!isChaise && (
          <rect
            x={left}
            y={top}
            width={widthPx}
            height={depthPx}
            fill={baseFill}
            stroke={strokeColor}
            strokeWidth={isSelected ? 3 : 2}
            rx={4}
          />
        )}

        {isChaise && (
          <>
            <rect
              x={left}
              y={top}
              width={widthPx}
              height={depthPx * 0.62}
              fill="rgba(74, 91, 76, 0.18)"
              stroke={strokeColor}
              strokeWidth={isSelected ? 3 : 2}
              rx={4}
            />
            <rect
              x={chaiseOnRight ? (left + widthPx * 0.58) : left}
              y={top + depthPx * 0.44}
              width={widthPx * 0.42}
              height={depthPx * 0.56}
              fill="rgba(74, 91, 76, 0.18)"
              stroke={strokeColor}
              strokeWidth={isSelected ? 3 : 2}
              rx={4}
            />
            <line x1={left + widthPx * 0.1} y1={top + depthPx * 0.2} x2={left + widthPx * 0.9} y2={top + depthPx * 0.2} stroke={strokeColor} strokeWidth={1.5} opacity={0.65} />
            <line x1={left + widthPx * 0.16} y1={top + depthPx * 0.5} x2={left + widthPx * 0.84} y2={top + depthPx * 0.5} stroke={strokeColor} strokeWidth={1.1} opacity={0.5} />
          </>
        )}

        {presetIdValue.startsWith('coffee-table-') && (
          <>
            <rect x={left + widthPx * 0.08} y={top + depthPx * 0.08} width={widthPx * 0.84} height={depthPx * 0.84} fill="none" stroke={strokeColor} strokeWidth={1.25} rx={8} opacity={0.8} />
            <line x1={left + widthPx * 0.2} y1={top + depthPx * 0.2} x2={left + widthPx * 0.8} y2={top + depthPx * 0.8} stroke={strokeColor} strokeWidth={0.9} opacity={0.45} />
            <line x1={left + widthPx * 0.8} y1={top + depthPx * 0.2} x2={left + widthPx * 0.2} y2={top + depthPx * 0.8} stroke={strokeColor} strokeWidth={0.9} opacity={0.45} />
          </>
        )}

        {isLamp && (
          <>
            <circle cx={fixture.position.x} cy={fixture.position.y + depthPx * 0.22} r={Math.min(widthPx, depthPx) * 0.12} fill="none" stroke={strokeColor} strokeWidth={1.4} />
            <circle cx={fixture.position.x} cy={fixture.position.y + depthPx * 0.22} r={Math.min(widthPx, depthPx) * 0.36} fill="none" stroke={strokeColor} strokeWidth={1.1} opacity={0.42} />
            <line x1={fixture.position.x} y1={fixture.position.y + depthPx * 0.1} x2={fixture.position.x - widthPx * 0.08} y2={fixture.position.y - depthPx * 0.18} stroke={strokeColor} strokeWidth={1.5} />
            <line x1={fixture.position.x - widthPx * 0.08} y1={fixture.position.y - depthPx * 0.18} x2={fixture.position.x + widthPx * 0.18} y2={fixture.position.y - depthPx * 0.34} stroke={strokeColor} strokeWidth={1.5} />
            <line x1={fixture.position.x - widthPx * 0.02} y1={fixture.position.y - depthPx * 0.12} x2={fixture.position.x + widthPx * 0.12} y2={fixture.position.y - depthPx * 0.24} stroke={strokeColor} strokeWidth={1.1} opacity={0.8} />
            <polygon points={`${fixture.position.x + widthPx * 0.2},${fixture.position.y - depthPx * 0.36} ${fixture.position.x + widthPx * 0.36},${fixture.position.y - depthPx * 0.32} ${fixture.position.x + widthPx * 0.22},${fixture.position.y - depthPx * 0.22}`} fill="none" stroke={strokeColor} strokeWidth={1.4} />
            <line x1={fixture.position.x + widthPx * 0.2} y1={fixture.position.y - depthPx * 0.36} x2={fixture.position.x + widthPx * 0.22} y2={fixture.position.y - depthPx * 0.22} stroke={strokeColor} strokeWidth={1.0} opacity={0.75} />
          </>
        )}

        {isChair && (
          <>
            <rect x={left + widthPx * 0.18} y={top + depthPx * 0.2} width={widthPx * 0.64} height={depthPx * 0.55} fill="none" stroke={strokeColor} strokeWidth={1.3} rx={3} />
            <line x1={left + widthPx * 0.22} y1={top + depthPx * 0.2} x2={left + widthPx * 0.22} y2={top + depthPx * 0.05} stroke={strokeColor} strokeWidth={1.2} />
            <line x1={left + widthPx * 0.78} y1={top + depthPx * 0.2} x2={left + widthPx * 0.78} y2={top + depthPx * 0.05} stroke={strokeColor} strokeWidth={1.2} />
            <line x1={left + widthPx * 0.26} y1={top + depthPx * 0.76} x2={left + widthPx * 0.26} y2={top + depthPx * 0.92} stroke={strokeColor} strokeWidth={1.1} opacity={0.75} />
            <line x1={left + widthPx * 0.74} y1={top + depthPx * 0.76} x2={left + widthPx * 0.74} y2={top + depthPx * 0.92} stroke={strokeColor} strokeWidth={1.1} opacity={0.75} />
          </>
        )}

        {isStorage && (
          <>
            <line x1={left + widthPx * 0.33} y1={top} x2={left + widthPx * 0.33} y2={top + depthPx} stroke={strokeColor} strokeWidth={1.1} opacity={0.75} />
            <line x1={left + widthPx * 0.66} y1={top} x2={left + widthPx * 0.66} y2={top + depthPx} stroke={strokeColor} strokeWidth={1.1} opacity={0.75} />
            <line x1={left} y1={top + depthPx * 0.5} x2={left + widthPx} y2={top + depthPx * 0.5} stroke={strokeColor} strokeWidth={1.0} opacity={0.45} />
            {presetIdValue.startsWith('storage-usm-haller-') && (
              <>
                <circle cx={left + widthPx * 0.33} cy={top + depthPx * 0.5} r={1.4} fill={strokeColor} />
                <circle cx={left + widthPx * 0.66} cy={top + depthPx * 0.5} r={1.4} fill={strokeColor} />
              </>
            )}
          </>
        )}

        {isPlant && (
          <>
            {presetIdValue.includes('pot-') && (
              <>
                <ellipse cx={fixture.position.x} cy={fixture.position.y + depthPx * 0.1} rx={widthPx * 0.26} ry={depthPx * 0.18} fill="none" stroke={strokeColor} strokeWidth={1.2} />
                <path d={`M ${left + widthPx * 0.34} ${top + depthPx * 0.72} L ${left + widthPx * 0.66} ${top + depthPx * 0.72} L ${left + widthPx * 0.58} ${top + depthPx * 0.92} L ${left + widthPx * 0.42} ${top + depthPx * 0.92} Z`} fill="none" stroke={strokeColor} strokeWidth={1.1} />
              </>
            )}
            {presetIdValue.includes('tree-') && (
              <>
                <circle cx={fixture.position.x} cy={fixture.position.y - depthPx * 0.05} r={Math.min(widthPx, depthPx) * 0.28} fill="none" stroke={strokeColor} strokeWidth={1.3} />
                <line x1={fixture.position.x} y1={fixture.position.y + depthPx * 0.08} x2={fixture.position.x} y2={top + depthPx * 0.86} stroke={strokeColor} strokeWidth={1.4} />
              </>
            )}
            {presetIdValue.includes('raisedbed-') && (
              <>
                <rect x={left + widthPx * 0.08} y={top + depthPx * 0.18} width={widthPx * 0.84} height={depthPx * 0.64} fill="none" stroke={strokeColor} strokeWidth={1.2} rx={3} />
                <line x1={left + widthPx * 0.2} y1={top + depthPx * 0.22} x2={left + widthPx * 0.2} y2={top + depthPx * 0.78} stroke={strokeColor} strokeWidth={1.0} opacity={0.75} />
                <line x1={left + widthPx * 0.8} y1={top + depthPx * 0.22} x2={left + widthPx * 0.8} y2={top + depthPx * 0.78} stroke={strokeColor} strokeWidth={1.0} opacity={0.75} />
              </>
            )}
          </>
        )}

        {presetIdValue.startsWith('closet-') && (
          <>
            <line x1={fixture.position.x} y1={top + depthPx * 0.1} x2={fixture.position.x} y2={top + depthPx * 0.9} stroke={strokeColor} strokeWidth={1.4} />
            <circle cx={fixture.position.x - widthPx * 0.08} cy={fixture.position.y} r={1.6} fill={strokeColor} />
            <circle cx={fixture.position.x + widthPx * 0.08} cy={fixture.position.y} r={1.6} fill={strokeColor} />
          </>
        )}

        {furnitureTypeValue === 'bedroom' && presetIdValue.startsWith('bed-') && (
          <>
            <rect x={left + widthPx * 0.06} y={top + depthPx * 0.08} width={widthPx * 0.88} height={depthPx * 0.84} fill="none" stroke={strokeColor} strokeWidth={1.4} rx={4} />
            <rect x={left + widthPx * 0.12} y={top + depthPx * 0.12} width={widthPx * 0.34} height={depthPx * 0.18} fill="none" stroke={strokeColor} strokeWidth={1.2} rx={3} />
            <rect x={left + widthPx * 0.54} y={top + depthPx * 0.12} width={widthPx * 0.34} height={depthPx * 0.18} fill="none" stroke={strokeColor} strokeWidth={1.2} rx={3} />
          </>
        )}

        {furnitureTypeValue === 'bedroom' && presetIdValue.startsWith('nightstand-') && (
          <>
            <line x1={left + widthPx * 0.18} y1={top + depthPx * 0.45} x2={left + widthPx * 0.82} y2={top + depthPx * 0.45} stroke={strokeColor} strokeWidth={1.2} />
            <circle cx={fixture.position.x} cy={top + depthPx * 0.7} r={Math.min(widthPx, depthPx) * 0.06} fill={strokeColor} />
          </>
        )}

        {furnitureTypeValue === 'office' && presetIdValue.startsWith('office-desk-') && (
          <>
            <line x1={left + widthPx * 0.12} y1={top + depthPx * 0.2} x2={left + widthPx * 0.88} y2={top + depthPx * 0.2} stroke={strokeColor} strokeWidth={1.2} />
            <line x1={left + widthPx * 0.2} y1={top + depthPx * 0.22} x2={left + widthPx * 0.2} y2={top + depthPx * 0.9} stroke={strokeColor} strokeWidth={1.2} />
            <line x1={left + widthPx * 0.8} y1={top + depthPx * 0.22} x2={left + widthPx * 0.8} y2={top + depthPx * 0.9} stroke={strokeColor} strokeWidth={1.2} />
          </>
        )}

        {isBath && presetIdValue.startsWith('bathtub-') && (
          <>
            <rect x={left + widthPx * 0.08} y={top + depthPx * 0.12} width={widthPx * 0.84} height={depthPx * 0.76} fill="none" stroke={strokeColor} strokeWidth={1.6} rx={10} />
            <line x1={left + widthPx * 0.2} y1={top + depthPx * 0.2} x2={left + widthPx * 0.2} y2={top + depthPx * 0.8} stroke={strokeColor} strokeWidth={1.0} opacity={0.7} />
            <circle cx={left + widthPx * 0.17} cy={top + depthPx * 0.24} r={Math.max(1.5, Math.min(widthPx, depthPx) * 0.04)} fill={strokeColor} />
          </>
        )}

        {isBath && presetIdValue.startsWith('toilet-') && (
          <>
            <ellipse cx={fixture.position.x} cy={top + depthPx * 0.64} rx={widthPx * 0.26} ry={depthPx * 0.26} fill="none" stroke={strokeColor} strokeWidth={1.6} />
            <rect x={left + widthPx * 0.25} y={top + depthPx * 0.1} width={widthPx * 0.5} height={depthPx * 0.2} fill="none" stroke={strokeColor} strokeWidth={1.4} rx={3} />
            {presetIdValue.includes('japanese') && (
              <circle cx={left + widthPx * 0.86} cy={top + depthPx * 0.2} r={Math.max(2, widthPx * 0.05)} fill={strokeColor} />
            )}
          </>
        )}

        {isBath && presetIdValue.startsWith('bath-sink-small-') && (
          <>
            <rect x={left + widthPx * 0.12} y={top + depthPx * 0.1} width={widthPx * 0.76} height={depthPx * 0.8} fill="none" stroke={strokeColor} strokeWidth={1.4} rx={4} />
            <circle cx={fixture.position.x} cy={fixture.position.y} r={Math.min(widthPx, depthPx) * 0.16} fill="none" stroke={strokeColor} strokeWidth={1.2} />
            <line x1={fixture.position.x - widthPx * 0.1} y1={top + depthPx * 0.12} x2={fixture.position.x + widthPx * 0.1} y2={top + depthPx * 0.12} stroke={strokeColor} strokeWidth={1.1} />
          </>
        )}

        {isBath && presetIdValue.startsWith('shower-') && (
          <>
            <rect x={left + widthPx * 0.1} y={top + depthPx * 0.1} width={widthPx * 0.8} height={depthPx * 0.8} fill="none" stroke={strokeColor} strokeWidth={1.4} rx={3} />
            <line x1={left + widthPx * 0.18} y1={top + depthPx * 0.82} x2={left + widthPx * 0.82} y2={top + depthPx * 0.18} stroke={strokeColor} strokeWidth={1.2} opacity={0.8} />
            <circle cx={left + widthPx * 0.78} cy={top + depthPx * 0.24} r={Math.max(2, Math.min(widthPx, depthPx) * 0.05)} fill={strokeColor} />
          </>
        )}

        {isKitchen && (
          <>
            {presetIdValue.includes('fridge') && (
              <>
                <line x1={left} y1={top + depthPx * 0.5} x2={left + widthPx} y2={top + depthPx * 0.5} stroke={strokeColor} strokeWidth={1.1} opacity={0.75} />
                <line x1={left + widthPx * 0.82} y1={top + depthPx * 0.16} x2={left + widthPx * 0.82} y2={top + depthPx * 0.42} stroke={strokeColor} strokeWidth={1.0} />
                <line x1={left + widthPx * 0.82} y1={top + depthPx * 0.58} x2={left + widthPx * 0.82} y2={top + depthPx * 0.84} stroke={strokeColor} strokeWidth={1.0} />
              </>
            )}
            {presetIdValue.includes('sink') && (
              <>
                <rect x={left + widthPx * 0.12} y={top + depthPx * 0.18} width={widthPx * 0.76} height={depthPx * 0.54} fill="none" stroke={strokeColor} strokeWidth={1.2} rx={4} />
                <line x1={fixture.position.x} y1={top + depthPx * 0.18} x2={fixture.position.x} y2={top + depthPx * 0.72} stroke={strokeColor} strokeWidth={1.0} opacity={0.75} />
                <path d={`M ${left + widthPx * 0.65} ${top + depthPx * 0.16} Q ${left + widthPx * 0.72} ${top + depthPx * 0.06} ${left + widthPx * 0.79} ${top + depthPx * 0.16}`} fill="none" stroke={strokeColor} strokeWidth={1.1} />
              </>
            )}
            {presetIdValue.includes('stove') && (
              <>
                <circle cx={left + widthPx * 0.3} cy={top + depthPx * 0.34} r={Math.min(widthPx, depthPx) * 0.12} fill="none" stroke={strokeColor} strokeWidth={1.1} />
                <circle cx={left + widthPx * 0.7} cy={top + depthPx * 0.34} r={Math.min(widthPx, depthPx) * 0.12} fill="none" stroke={strokeColor} strokeWidth={1.1} />
                <circle cx={left + widthPx * 0.3} cy={top + depthPx * 0.68} r={Math.min(widthPx, depthPx) * 0.12} fill="none" stroke={strokeColor} strokeWidth={1.1} />
                <circle cx={left + widthPx * 0.7} cy={top + depthPx * 0.68} r={Math.min(widthPx, depthPx) * 0.12} fill="none" stroke={strokeColor} strokeWidth={1.1} />
              </>
            )}
            {presetIdValue.includes('dishwasher') && (
              <>
                <rect x={left + widthPx * 0.16} y={top + depthPx * 0.18} width={widthPx * 0.68} height={depthPx * 0.44} fill="none" stroke={strokeColor} strokeWidth={1.1} rx={2} />
                <circle cx={fixture.position.x} cy={top + depthPx * 0.76} r={Math.min(widthPx, depthPx) * 0.08} fill="none" stroke={strokeColor} strokeWidth={1.0} />
              </>
            )}
            {presetIdValue.includes('oven') && (
              <>
                <rect x={left + widthPx * 0.16} y={top + depthPx * 0.22} width={widthPx * 0.68} height={depthPx * 0.42} fill="none" stroke={strokeColor} strokeWidth={1.1} rx={2} />
                <line x1={left + widthPx * 0.2} y1={top + depthPx * 0.16} x2={left + widthPx * 0.8} y2={top + depthPx * 0.16} stroke={strokeColor} strokeWidth={1.0} />
              </>
            )}
            {presetIdValue.includes('bins') && (
              <>
                <line x1={fixture.position.x} y1={top + depthPx * 0.14} x2={fixture.position.x} y2={top + depthPx * 0.86} stroke={strokeColor} strokeWidth={1.0} />
                <rect x={left + widthPx * 0.1} y={top + depthPx * 0.12} width={widthPx * 0.34} height={depthPx * 0.72} fill="none" stroke={strokeColor} strokeWidth={1.0} rx={2} />
                <rect x={left + widthPx * 0.56} y={top + depthPx * 0.12} width={widthPx * 0.34} height={depthPx * 0.72} fill="none" stroke={strokeColor} strokeWidth={1.0} rx={2} />
              </>
            )}
          </>
        )}

        {isLaundry && (
          <>
            <circle cx={fixture.position.x} cy={fixture.position.y} r={Math.min(widthPx, depthPx) * 0.24} fill="none" stroke={strokeColor} strokeWidth={1.3} />
            <circle cx={fixture.position.x} cy={fixture.position.y} r={Math.min(widthPx, depthPx) * 0.13} fill="none" stroke={strokeColor} strokeWidth={1.0} opacity={0.75} />
            <line x1={left + widthPx * 0.2} y1={top + depthPx * 0.16} x2={left + widthPx * 0.8} y2={top + depthPx * 0.16} stroke={strokeColor} strokeWidth={1.0} />
            <circle cx={left + widthPx * 0.26} cy={top + depthPx * 0.16} r={1.2} fill={strokeColor} />
            <circle cx={left + widthPx * 0.74} cy={top + depthPx * 0.16} r={1.2} fill={strokeColor} />
          </>
        )}
      </g>
    );
  });
}
