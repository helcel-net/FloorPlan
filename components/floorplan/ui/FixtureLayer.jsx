import { GRID } from '../config/constants';
import { isWallOpeningFixture, normalizeFurnitureType } from '../editor/utils';

export default function FixtureLayer({ renderFixtures, baseUnitM, selectedFixtureId, renderMode }) {
  const isTechnical = renderMode === 'technical' || renderMode === 'utilities';
  const isUtilitiesMode = renderMode === 'utilities';

  return renderFixtures.map((fixture) => {
    if (isWallOpeningFixture(fixture)) {
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
      const openingLineStroke = isTechnical ? (isSelected ? '#0f4d6f' : '#1a1a1a') : (isSelected ? '#7f2b21' : '#8a7b62');
      const doorAccentStroke = isTechnical ? '#1a1a1a' : '#ad3c2f';
      const windowStroke = isTechnical ? (isSelected ? '#0f4d6f' : '#1a1a1a') : (isSelected ? '#0f4d6f' : '#2a6f93');

      const previewHighlight = fixture.isPreview && (
        <polygon
          points={`${x1 - nx * 16},${y1 - ny * 16} ${x2 - nx * 16},${y2 - ny * 16} ${x2 + nx * 16},${y2 + ny * 16} ${x1 + nx * 16},${y1 + ny * 16}`}
          fill="#2f6f5e"
          opacity={0.3}
        />
      );

      const hingeSign = fixture.hinge === 'right' ? -1 : 1;
      const swingSide = Number(fixture.swingSide) >= 0 ? -1 : 1;
      const hingeAxisX = axisX * swingSide;
      const hingeAxisY = axisY * swingSide;
      const hingeX = fixture.position.x + hingeAxisX * half * hingeSign;
      const hingeY = fixture.position.y + hingeAxisY * half * hingeSign;
      const leafLength = widthPx;
      const closedVecX = hingeAxisX * (-hingeSign);
      const closedVecY = hingeAxisY * (-hingeSign);
      const openSign = Math.abs(ux) > Math.abs(uy) ? swingSide : -swingSide;
      const openVecX = nx * openSign;
      const openVecY = ny * openSign;
      const leafEndX = hingeX + openVecX * leafLength;
      const leafEndY = hingeY + openVecY * leafLength;
      const closedEndX = hingeX + closedVecX * leafLength;
      const closedEndY = hingeY + closedVecY * leafLength;
      const cross = (closedVecX * openVecY) - (closedVecY * openVecX);
      const sweepFlag = cross < 0 ? 0 : 1;

      if (fixture.kind === 'window') {
        const windowTypeValue = fixture.windowType || 'fixed';
        const tiltApexX = fixture.position.x + openVecX * widthPx * 0.28;
        const tiltApexY = fixture.position.y + openVecY * widthPx * 0.28;

        return (
          <g key={fixture.id}>
            {previewHighlight}
            <g opacity={previewOpacity}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={windowStroke} strokeWidth={isSelected ? 3 : 2} strokeLinecap="round" />
              {windowTypeValue === 'swing' && (
                <>
                  <line x1={hingeX} y1={hingeY} x2={leafEndX} y2={leafEndY} stroke={windowStroke} strokeWidth={isSelected ? 2 : 1.5} strokeLinecap="round" />
                  <path d={`M ${closedEndX} ${closedEndY} A ${leafLength} ${leafLength} 0 0 ${sweepFlag} ${leafEndX} ${leafEndY}`} fill="none" stroke={windowStroke} strokeWidth={isSelected ? 1.5 : 1} />
                </>
              )}
              {windowTypeValue === 'slide' && (
                <line
                  x1={x1 + nx * swingSide * 6}
                  y1={y1 + ny * swingSide * 6}
                  x2={x2 + nx * swingSide * 6}
                  y2={y2 + ny * swingSide * 6}
                  stroke={windowStroke}
                  strokeWidth={isSelected ? 2 : 1.5}
                />
              )}
              {windowTypeValue === 'tilt' && (
                <>
                  <line x1={x1} y1={y1} x2={tiltApexX} y2={tiltApexY} stroke={windowStroke} strokeWidth={isSelected ? 1.5 : 1} strokeDasharray="3 3" />
                  <line x1={x2} y1={y2} x2={tiltApexX} y2={tiltApexY} stroke={windowStroke} strokeWidth={isSelected ? 1.5 : 1} strokeDasharray="3 3" />
                </>
              )}
            </g>
          </g>
        );
      }

      const doorTypeValue = fixture.doorType || 'open';

      return (
        <g key={fixture.id}>
          {previewHighlight}
          <g opacity={previewOpacity}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={openingLineStroke} strokeWidth={isSelected ? 2.5 : 1.5} strokeDasharray="5 4" />
          {doorTypeValue === 'swing' && (
            <>
              <line x1={hingeX} y1={hingeY} x2={leafEndX} y2={leafEndY} stroke={doorAccentStroke} strokeWidth={isSelected ? 3 : 2} strokeLinecap="round" />
              <path d={`M ${closedEndX} ${closedEndY} A ${leafLength} ${leafLength} 0 0 ${sweepFlag} ${leafEndX} ${leafEndY}`} fill="none" stroke={doorAccentStroke} strokeWidth={isSelected ? 2 : 1.5} />
            </>
          )}

          {doorTypeValue === 'slide' && (
            <line
              x1={x1 + nx * swingSide * 8}
              y1={y1 + ny * swingSide * 8}
              x2={x2 + nx * swingSide * 8}
              y2={y2 + ny * swingSide * 8}
              stroke={doorAccentStroke}
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
                    <line x1={hingeX} y1={hingeY} x2={firstEnd.x} y2={firstEnd.y} stroke={doorAccentStroke} strokeWidth={isSelected ? 3 : 2} />
                    <line x1={firstEnd.x} y1={firstEnd.y} x2={secondEnd.x} y2={secondEnd.y} stroke={doorAccentStroke} strokeWidth={isSelected ? 3 : 2} />
                  </>
                );
              })()}
            </>
          )}
          </g>
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
    const isCeilingLight = presetIdValue.startsWith('ceiling-light-');
    const isChair = presetIdValue.includes('chair');
    const isSofa = presetIdValue.startsWith('sofa-');
    const isFireplace = presetIdValue.startsWith('storage-fireplace-');
    const isStorage = (presetIdValue.startsWith('storage-') && !isFireplace) || presetIdValue.includes('usm-corpus');
    const isPlant = presetIdValue.startsWith('plant-');
    const isMirror = presetIdValue.startsWith('mirror-');
    const isRug = presetIdValue.startsWith('rug-');
    const isStool = presetIdValue.startsWith('stool-');
    const isOttoman = presetIdValue.startsWith('ottoman-');
    const isLounger = presetIdValue.startsWith('lounger-');
    const isBench = presetIdValue.startsWith('bench-');
    const isParasol = presetIdValue.startsWith('parasol-');
    const isFirepit = presetIdValue.startsWith('firepit-');
    const isBbq = presetIdValue.startsWith('appliance-bbq-');
    const isBath = furnitureTypeValue === 'bath';
    const isKitchen = furnitureTypeValue === 'kitchen';
    const isLaundry = furnitureTypeValue === 'laundry';
    const isElectric = furnitureTypeValue === 'electric';
    const isWater = furnitureTypeValue === 'water';
    const isStairs = presetIdValue.startsWith('stairs-');
    const isChaise = isSofa && presetIdValue.includes('chaise');
    const chaiseOnRight = presetIdValue.includes('-r-');

    const isUtilityItem = isElectric || isWater;
    const highlightUtility = isUtilitiesMode && isUtilityItem;
    const flatTechnical = isTechnical && !highlightUtility;

    const baseFill = flatTechnical
      ? '#ffffff'
      : isPlant
        ? 'rgba(74, 122, 81, 0.18)'
        : isRug
          ? 'rgba(154, 130, 92, 0.10)'
          : isFirepit
            ? 'rgba(60, 50, 45, 0.22)'
            : isElectric
              ? 'rgba(196, 148, 58, 0.20)'
              : isWater
                ? 'rgba(58, 122, 154, 0.18)'
                : ((isKitchen || isLaundry || isBath || isStairs || isMirror || isBbq) ? 'rgba(101, 117, 132, 0.18)' : 'rgba(58, 95, 66, 0.15)');
    const baseStroke = flatTechnical
      ? '#1a1a1a'
      : isPlant
        ? '#3f6f49'
        : isRug
          ? '#9a8258'
          : isElectric
            ? '#8a6a1f'
            : isWater
              ? '#2f6a93'
              : ((isKitchen || isLaundry || isBath || isStairs || isMirror || isBbq) ? '#4f6072' : '#3a5f42');
    const strokeColor = isSelected ? (flatTechnical ? '#0f4d6f' : '#22303b') : baseStroke;
    const fixtureOpacity = fixture.isPreview
      ? 0.45
      : isUtilitiesMode
        ? (isUtilityItem ? 1 : 0.15)
        : (isTechnical ? 0.5 : 1);
    return (
      <g
        key={fixture.id}
        opacity={fixtureOpacity}
        transform={`rotate(${Number(fixture.angleDeg) || 0} ${fixture.position.x} ${fixture.position.y})`}
      >
        {!isChaise && !isRug && !isStool && !isFirepit && !isParasol && (
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

        {(isStool || isFirepit) && (
          <circle
            cx={fixture.position.x}
            cy={fixture.position.y}
            r={Math.min(widthPx, depthPx) / 2}
            fill={baseFill}
            stroke={strokeColor}
            strokeWidth={isSelected ? 3 : 2}
          />
        )}

        {isFirepit && (
          <circle cx={fixture.position.x} cy={fixture.position.y} r={Math.min(widthPx, depthPx) * 0.22} fill="none" stroke={strokeColor} strokeWidth={1} opacity={0.6} />
        )}

        {isParasol && (() => {
          const r = Math.min(widthPx, depthPx) * 0.46;
          const ribCount = 8;
          const ribs = Array.from({ length: ribCount }).map((_, i) => {
            const angle = (i / ribCount) * Math.PI * 2;
            return (
              <line
                key={`rib-${i}`}
                x1={fixture.position.x}
                y1={fixture.position.y}
                x2={fixture.position.x + Math.cos(angle) * r}
                y2={fixture.position.y + Math.sin(angle) * r}
                stroke={strokeColor}
                strokeWidth={0.8}
                opacity={0.5}
              />
            );
          });
          return (
            <>
              <circle cx={fixture.position.x} cy={fixture.position.y} r={r} fill={baseFill} stroke={strokeColor} strokeWidth={isSelected ? 3 : 2} />
              {ribs}
              <circle cx={fixture.position.x} cy={fixture.position.y} r={2} fill={strokeColor} />
            </>
          );
        })()}

        {isLounger && (
          <path
            d={`M ${left + widthPx * 0.1} ${top + depthPx * 0.28} Q ${fixture.position.x} ${top + depthPx * 0.04} ${left + widthPx * 0.9} ${top + depthPx * 0.28}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth={1.2}
          />
        )}
        {isLounger && (
          <line x1={left + widthPx * 0.1} y1={top + depthPx * 0.66} x2={left + widthPx * 0.9} y2={top + depthPx * 0.66} stroke={strokeColor} strokeWidth={1} opacity={0.4} />
        )}

        {isBench && (() => {
          const slatCount = 4;
          const slats = [];
          for (let i = 1; i < slatCount; i += 1) {
            const y = top + (depthPx * i) / slatCount;
            slats.push(<line key={`slat-${i}`} x1={left + widthPx * 0.05} y1={y} x2={left + widthPx * 0.95} y2={y} stroke={strokeColor} strokeWidth={0.9} opacity={0.4} />);
          }
          return <>{slats}</>;
        })()}

        {isBbq && (() => {
          const grateCount = 4;
          const grates = [];
          for (let i = 1; i <= grateCount; i += 1) {
            const x = left + widthPx * (0.15 + (i * 0.7) / (grateCount + 1));
            grates.push(<line key={`grate-${i}`} x1={x} y1={top + depthPx * 0.18} x2={x} y2={top + depthPx * 0.62} stroke={strokeColor} strokeWidth={0.8} opacity={0.5} />);
          }
          return (
            <>
              <rect x={left + widthPx * 0.12} y={top + depthPx * 0.15} width={widthPx * 0.76} height={depthPx * 0.5} fill="none" stroke={strokeColor} strokeWidth={1.2} rx={2} />
              {grates}
              <rect x={left + widthPx * 0.3} y={top + depthPx * 0.72} width={widthPx * 0.4} height={depthPx * 0.16} fill="none" stroke={strokeColor} strokeWidth={1} rx={2} opacity={0.7} />
            </>
          );
        })()}

        {isOttoman && (
          <circle cx={fixture.position.x} cy={fixture.position.y} r={Math.min(widthPx, depthPx) * 0.32} fill="none" stroke={strokeColor} strokeWidth={1} opacity={0.45} />
        )}

        {isRug && (
          <>
            <rect
              x={left}
              y={top}
              width={widthPx}
              height={depthPx}
              fill={baseFill}
              stroke={strokeColor}
              strokeWidth={isSelected ? 2.5 : 1.5}
              strokeDasharray="6 4"
              rx={Math.min(widthPx, depthPx) * 0.08}
            />
            <rect
              x={left + widthPx * 0.06}
              y={top + depthPx * 0.06}
              width={widthPx * 0.88}
              height={depthPx * 0.88}
              fill="none"
              stroke={strokeColor}
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.5}
              rx={Math.min(widthPx, depthPx) * 0.06}
            />
          </>
        )}

        {isSofa && !isChaise && (() => {
          const seatCount = Math.max(2, Math.round((Number(fixture.widthM) || 1.8) / 0.75));
          const seams = [];
          for (let i = 1; i < seatCount; i += 1) {
            const x = left + (widthPx * i) / seatCount;
            seams.push(
              <line key={`seat-${i}`} x1={x} y1={top + depthPx * 0.2} x2={x} y2={top + depthPx * 0.94} stroke={strokeColor} strokeWidth={0.9} opacity={0.3} />
            );
          }
          return (
            <>
              <line x1={left + widthPx * 0.05} y1={top + depthPx * 0.2} x2={left + widthPx * 0.95} y2={top + depthPx * 0.2} stroke={strokeColor} strokeWidth={1} opacity={0.4} />
              {seams}
            </>
          );
        })()}

        {isChaise && (() => {
          const seatDepth = depthPx * 0.62;
          const footWidth = widthPx * 0.42;
          const innerX = chaiseOnRight ? left + widthPx - footWidth : left + footWidth;
          const outline = chaiseOnRight
            ? `${left},${top} ${left + widthPx},${top} ${left + widthPx},${top + depthPx} ${innerX},${top + depthPx} ${innerX},${top + seatDepth} ${left},${top + seatDepth}`
            : `${left},${top} ${left + widthPx},${top} ${left + widthPx},${top + seatDepth} ${innerX},${top + seatDepth} ${innerX},${top + depthPx} ${left},${top + depthPx}`;

          return (
            <>
              <polygon points={outline} fill={baseFill} stroke={strokeColor} strokeWidth={isSelected ? 3 : 2} strokeLinejoin="round" />
              <line x1={left + widthPx * 0.08} y1={top + seatDepth * 0.5} x2={(chaiseOnRight ? innerX : left + widthPx) - widthPx * 0.04} y2={top + seatDepth * 0.5} stroke={strokeColor} strokeWidth={1.1} opacity={0.5} />
            </>
          );
        })()}

        {presetIdValue.includes('table') && (
          <rect x={left + widthPx * 0.1} y={top + depthPx * 0.1} width={widthPx * 0.8} height={depthPx * 0.8} fill="none" stroke={strokeColor} strokeWidth={1} rx={6} opacity={0.5} />
        )}

        {isLamp && (
          <>
            <circle cx={fixture.position.x} cy={fixture.position.y} r={Math.min(widthPx, depthPx) * 0.42} fill="none" stroke={strokeColor} strokeWidth={1.3} opacity={0.55} />
            <circle cx={fixture.position.x} cy={fixture.position.y} r={Math.min(widthPx, depthPx) * 0.1} fill={strokeColor} />
          </>
        )}

        {isCeilingLight && (
          <>
            <circle cx={fixture.position.x} cy={fixture.position.y} r={Math.min(widthPx, depthPx) * 0.4} fill="none" stroke={strokeColor} strokeWidth={1.3} />
            <line x1={fixture.position.x - Math.min(widthPx, depthPx) * 0.4} y1={fixture.position.y} x2={fixture.position.x + Math.min(widthPx, depthPx) * 0.4} y2={fixture.position.y} stroke={strokeColor} strokeWidth={1} opacity={0.6} />
            <line x1={fixture.position.x} y1={fixture.position.y - Math.min(widthPx, depthPx) * 0.4} x2={fixture.position.x} y2={fixture.position.y + Math.min(widthPx, depthPx) * 0.4} stroke={strokeColor} strokeWidth={1} opacity={0.6} />
          </>
        )}

        {isMirror && (
          <line x1={left + widthPx * 0.05} y1={fixture.position.y} x2={left + widthPx * 0.95} y2={fixture.position.y} stroke={strokeColor} strokeWidth={1} opacity={0.5} strokeDasharray="2 2" />
        )}

        {isChair && (
          <>
            <rect x={left + widthPx * 0.16} y={top + depthPx * 0.34} width={widthPx * 0.68} height={depthPx * 0.58} fill="none" stroke={strokeColor} strokeWidth={1.3} rx={3} />
            <path
              d={`M ${left + widthPx * 0.16} ${top + depthPx * 0.32} Q ${fixture.position.x} ${top + depthPx * 0.02} ${left + widthPx * 0.84} ${top + depthPx * 0.32}`}
              fill="none"
              stroke={strokeColor}
              strokeWidth={1.4}
            />
          </>
        )}

        {isStorage && (
          <>
            <line x1={left + widthPx * 0.33} y1={top} x2={left + widthPx * 0.33} y2={top + depthPx} stroke={strokeColor} strokeWidth={1.1} opacity={0.75} />
            <line x1={left + widthPx * 0.66} y1={top} x2={left + widthPx * 0.66} y2={top + depthPx} stroke={strokeColor} strokeWidth={1.1} opacity={0.75} />
            <line x1={left} y1={top + depthPx * 0.5} x2={left + widthPx} y2={top + depthPx * 0.5} stroke={strokeColor} strokeWidth={1.0} opacity={0.45} />
            {(presetIdValue.startsWith('storage-usm-haller-') || presetIdValue.includes('usm-corpus')) && (
              <>
                <circle cx={left + widthPx * 0.33} cy={top + depthPx * 0.5} r={1.4} fill={strokeColor} />
                <circle cx={left + widthPx * 0.66} cy={top + depthPx * 0.5} r={1.4} fill={strokeColor} />
              </>
            )}
          </>
        )}

        {isFireplace && (
          <rect x={left + widthPx * 0.15} y={top + depthPx * 0.12} width={widthPx * 0.7} height={depthPx * 0.6} fill={isTechnical ? '#ffffff' : 'rgba(60, 50, 45, 0.28)'} stroke={strokeColor} strokeWidth={1.3} rx={2} />
        )}

        {isPlant && (
          <>
            {presetIdValue.includes('pot-') && (
              <>
                <circle cx={fixture.position.x} cy={fixture.position.y} r={Math.min(widthPx, depthPx) * 0.42} fill="none" stroke={strokeColor} strokeWidth={1.3} />
                <circle cx={fixture.position.x} cy={fixture.position.y} r={Math.min(widthPx, depthPx) * 0.24} fill="none" stroke={strokeColor} strokeWidth={1.0} opacity={0.6} />
              </>
            )}
            {presetIdValue.includes('tree-') && (
              <>
                <circle cx={fixture.position.x} cy={fixture.position.y} r={Math.min(widthPx, depthPx) * 0.44} fill="none" stroke={strokeColor} strokeWidth={1.3} />
                <circle cx={fixture.position.x} cy={fixture.position.y} r={1.6} fill={strokeColor} />
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

        {(isKitchen || isLaundry) && (
          <>
            {presetIdValue.includes('kitchen-base') && (
              <>
                <line x1={left} y1={top + depthPx * 0.14} x2={left + widthPx} y2={top + depthPx * 0.14} stroke={strokeColor} strokeWidth={1} opacity={0.6} />
                <line x1={fixture.position.x} y1={top + depthPx * 0.14} x2={fixture.position.x} y2={top + depthPx * 0.92} stroke={strokeColor} strokeWidth={0.9} opacity={0.4} />
              </>
            )}
            {presetIdValue.includes('fridge') && (
              <>
                <line x1={left} y1={top + depthPx * 0.5} x2={left + widthPx} y2={top + depthPx * 0.5} stroke={strokeColor} strokeWidth={1.1} opacity={0.75} />
                <line x1={left + widthPx * 0.86} y1={top + depthPx * 0.12} x2={left + widthPx * 0.86} y2={top + depthPx * 0.38} stroke={strokeColor} strokeWidth={1.4} strokeLinecap="round" />
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
                <line x1={left + widthPx * 0.14} y1={top + depthPx * 0.86} x2={left + widthPx * 0.86} y2={top + depthPx * 0.86} stroke={strokeColor} strokeWidth={1.3} opacity={0.7} />
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

        {isLaundry && !presetIdValue.includes('sink') && (
          <>
            <circle cx={fixture.position.x} cy={fixture.position.y} r={Math.min(widthPx, depthPx) * 0.24} fill="none" stroke={strokeColor} strokeWidth={1.3} />
            <circle cx={fixture.position.x} cy={fixture.position.y} r={Math.min(widthPx, depthPx) * 0.13} fill="none" stroke={strokeColor} strokeWidth={1.0} opacity={0.75} />
            <line x1={left + widthPx * 0.2} y1={top + depthPx * 0.16} x2={left + widthPx * 0.8} y2={top + depthPx * 0.16} stroke={strokeColor} strokeWidth={1.0} />
            <circle cx={left + widthPx * 0.26} cy={top + depthPx * 0.16} r={1.2} fill={strokeColor} />
            <circle cx={left + widthPx * 0.74} cy={top + depthPx * 0.16} r={1.2} fill={strokeColor} />
            {presetIdValue.includes('dryer') && (
              <line x1={fixture.position.x} y1={top + depthPx * 0.86} x2={fixture.position.x} y2={top + depthPx * 0.94} stroke={strokeColor} strokeWidth={1.2} opacity={0.6} />
            )}
          </>
        )}

        {isStairs && (() => {
          const stepCount = 10;
          const treads = [];
          for (let i = 1; i < stepCount; i += 1) {
            const y = top + (depthPx * i) / stepCount;
            treads.push(
              <line key={`tread-${i}`} x1={left} y1={y} x2={left + widthPx} y2={y} stroke={strokeColor} strokeWidth={1} opacity={0.55} />
            );
          }
          const arrowX = fixture.position.x;
          const arrowStartY = top + depthPx * 0.86;
          const arrowEndY = top + depthPx * 0.16;
          const headSize = Math.min(widthPx, depthPx) * 0.09;

          return (
            <>
              {treads}
              <line x1={arrowX} y1={arrowStartY} x2={arrowX} y2={arrowEndY} stroke={strokeColor} strokeWidth={1.6} />
              <polygon
                points={`${arrowX - headSize},${arrowEndY + headSize} ${arrowX + headSize},${arrowEndY + headSize} ${arrowX},${arrowEndY}`}
                fill={strokeColor}
              />
            </>
          );
        })()}

        {presetIdValue.startsWith('electric-outlet-') && (
          <>
            <circle cx={fixture.position.x} cy={fixture.position.y} r={Math.min(widthPx, depthPx) * 0.42} fill="none" stroke={strokeColor} strokeWidth={1.1} />
            <line x1={fixture.position.x - widthPx * 0.14} y1={fixture.position.y - depthPx * 0.16} x2={fixture.position.x - widthPx * 0.14} y2={fixture.position.y + depthPx * 0.16} stroke={strokeColor} strokeWidth={1.3} />
            <line x1={fixture.position.x + widthPx * 0.14} y1={fixture.position.y - depthPx * 0.16} x2={fixture.position.x + widthPx * 0.14} y2={fixture.position.y + depthPx * 0.16} stroke={strokeColor} strokeWidth={1.3} />
          </>
        )}

        {presetIdValue.startsWith('electric-switch-') && (
          <>
            <circle cx={fixture.position.x} cy={fixture.position.y} r={Math.min(widthPx, depthPx) * 0.38} fill="none" stroke={strokeColor} strokeWidth={1.1} />
            <line
              x1={fixture.position.x - widthPx * 0.14}
              y1={fixture.position.y + depthPx * 0.16}
              x2={fixture.position.x + widthPx * 0.16}
              y2={fixture.position.y - depthPx * 0.18}
              stroke={strokeColor}
              strokeWidth={1.4}
            />
          </>
        )}

        {presetIdValue.startsWith('electric-panel-') && (
          <>
            <rect x={left + widthPx * 0.12} y={top + depthPx * 0.1} width={widthPx * 0.76} height={depthPx * 0.8} fill="none" stroke={strokeColor} strokeWidth={1.1} />
            {[0.28, 0.46, 0.64, 0.82].map((f) => (
              <line
                key={`breaker-${f}`}
                x1={left + widthPx * 0.22}
                y1={top + depthPx * f}
                x2={left + widthPx * 0.78}
                y2={top + depthPx * f}
                stroke={strokeColor}
                strokeWidth={1}
                opacity={0.7}
              />
            ))}
          </>
        )}

        {presetIdValue.startsWith('electric-solar-') && (
          <>
            <rect x={left + widthPx * 0.1} y={top + depthPx * 0.1} width={widthPx * 0.8} height={depthPx * 0.8} fill="none" stroke={strokeColor} strokeWidth={1.1} />
            <polyline
              points={`${left + widthPx * 0.2},${top + depthPx * 0.65} ${left + widthPx * 0.38},${top + depthPx * 0.35} ${left + widthPx * 0.52},${top + depthPx * 0.65} ${left + widthPx * 0.7},${top + depthPx * 0.35} ${left + widthPx * 0.82},${top + depthPx * 0.55}`}
              fill="none"
              stroke={strokeColor}
              strokeWidth={1.3}
            />
          </>
        )}

        {presetIdValue.startsWith('water-valve-') && (
          <>
            <circle cx={fixture.position.x} cy={fixture.position.y} r={Math.min(widthPx, depthPx) * 0.34} fill="none" stroke={strokeColor} strokeWidth={1.1} />
            <line x1={fixture.position.x} y1={top + depthPx * 0.08} x2={fixture.position.x} y2={top + depthPx * 0.3} stroke={strokeColor} strokeWidth={1.3} />
          </>
        )}

        {presetIdValue.startsWith('water-drain-') && (
          <>
            <circle cx={fixture.position.x} cy={fixture.position.y} r={Math.min(widthPx, depthPx) * 0.4} fill="none" stroke={strokeColor} strokeWidth={1.1} />
            <line x1={fixture.position.x} y1={fixture.position.y - depthPx * 0.22} x2={fixture.position.x} y2={fixture.position.y + depthPx * 0.22} stroke={strokeColor} strokeWidth={1.1} />
            <line x1={fixture.position.x - widthPx * 0.22} y1={fixture.position.y} x2={fixture.position.x + widthPx * 0.22} y2={fixture.position.y} stroke={strokeColor} strokeWidth={1.1} />
          </>
        )}

        {presetIdValue.startsWith('water-pump-') && (
          <>
            <circle cx={fixture.position.x} cy={fixture.position.y} r={Math.min(widthPx, depthPx) * 0.4} fill="none" stroke={strokeColor} strokeWidth={1.1} />
            <line
              x1={fixture.position.x - widthPx * 0.18}
              y1={fixture.position.y - depthPx * 0.18}
              x2={fixture.position.x + widthPx * 0.18}
              y2={fixture.position.y + depthPx * 0.18}
              stroke={strokeColor}
              strokeWidth={1.1}
            />
            <line
              x1={fixture.position.x + widthPx * 0.18}
              y1={fixture.position.y - depthPx * 0.18}
              x2={fixture.position.x - widthPx * 0.18}
              y2={fixture.position.y + depthPx * 0.18}
              stroke={strokeColor}
              strokeWidth={1.1}
            />
          </>
        )}

        {presetIdValue.startsWith('water-filter-') && (
          <>
            <rect x={left + widthPx * 0.14} y={top + depthPx * 0.08} width={widthPx * 0.72} height={depthPx * 0.84} fill="none" stroke={strokeColor} strokeWidth={1.1} rx={widthPx * 0.1} />
            {[0.3, 0.48, 0.66, 0.84].map((f) => (
              <line
                key={`mesh-${f}`}
                x1={left + widthPx * 0.22}
                y1={top + depthPx * f}
                x2={left + widthPx * 0.78}
                y2={top + depthPx * f}
                stroke={strokeColor}
                strokeWidth={1}
                opacity={0.7}
              />
            ))}
          </>
        )}

        {presetIdValue.startsWith('water-heater-') && (
          <>
            <circle cx={fixture.position.x} cy={fixture.position.y} r={Math.min(widthPx, depthPx) * 0.36} fill="none" stroke={strokeColor} strokeWidth={1.1} />
            <polyline
              points={`${fixture.position.x - widthPx * 0.16},${fixture.position.y + depthPx * 0.1} ${fixture.position.x - widthPx * 0.05},${fixture.position.y - depthPx * 0.12} ${fixture.position.x + widthPx * 0.06},${fixture.position.y + depthPx * 0.1} ${fixture.position.x + widthPx * 0.17},${fixture.position.y - depthPx * 0.12}`}
              fill="none"
              stroke={strokeColor}
              strokeWidth={1.2}
            />
          </>
        )}
      </g>
    );
  });
}
