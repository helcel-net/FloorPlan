import { mToPx, pxToM, stepCountForRunM } from '../core/geometry';
import { isWallOpeningFixture, normalizeFurnitureType } from '../editor/utils';

export default function FixtureLayer({ renderFixtures, baseUnitM, selectedFixtureId, renderMode }) {
  const isTechnical = renderMode === 'technical' || renderMode === 'utilities';
  const isUtilitiesMode = renderMode === 'utilities';

  return renderFixtures.map((fixture) => {
    if (isWallOpeningFixture(fixture)) {
      const widthPx = mToPx(Number(fixture.widthM) || 0.8, baseUnitM);
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
        const isOpenFrame = windowTypeValue === 'open';
        const tiltApexX = fixture.position.x + openVecX * widthPx * 0.28;
        const tiltApexY = fixture.position.y + openVecY * widthPx * 0.28;

        return (
          <g key={fixture.id}>
            {previewHighlight}
            <g opacity={previewOpacity}>
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={windowStroke}
                strokeWidth={isSelected ? 3 : 2}
                strokeLinecap="round"
                strokeDasharray={isOpenFrame ? '5 4' : undefined}
              />
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

    const widthPx = mToPx(Number(fixture.widthM) || 1, baseUnitM);
    const depthPx = mToPx(Number(fixture.depthM) || 1, baseUnitM);
    const isSelected = !fixture.isPreview && selectedFixtureId === fixture.id;
    const left = fixture.position.x - widthPx / 2;
    const top = fixture.position.y - depthPx / 2;
    const cornerR = Math.max(2, Math.min(10, Math.min(widthPx, depthPx) * 0.08));
    const furnitureTypeValue = normalizeFurnitureType(fixture.furnitureType);
    const presetIdValue = fixture.presetId || '';
    const isLamp = presetIdValue.startsWith('lamp-');
    const isCeilingLight = presetIdValue.startsWith('ceiling-light-');
    const isOfficeChair = furnitureTypeValue === 'office' && presetIdValue.includes('chair');
    const isArmchair = presetIdValue.includes('armchair');
    const isChair = presetIdValue.includes('chair') && !isOfficeChair && !isArmchair;
    const isSofa = presetIdValue.startsWith('sofa-');
    const isFireplace = presetIdValue.startsWith('storage-fireplace-');
    const isBench = presetIdValue.includes('bench');
    const isDresser = presetIdValue.includes('dresser');
    const isProjector = presetIdValue.startsWith('office-projector-');
    const isProjectorScreen = presetIdValue.startsWith('projector-screen-');
    const isTV = presetIdValue.startsWith('tv-');
    const isCrib = presetIdValue.startsWith('crib-');
    const isChangingTable = presetIdValue.startsWith('changing-table-');
    const isStorage = (presetIdValue.startsWith('storage-') && !isFireplace && !isBench && !isDresser) || presetIdValue.includes('usm-corpus');
    const isPlant = presetIdValue.startsWith('plant-');
    const isPlantRound = isPlant && (presetIdValue.includes('pot-') || presetIdValue.includes('tree-'));
    const isMirror = presetIdValue.startsWith('mirror-');
    const isRug = presetIdValue.startsWith('rug-');
    const isStool = presetIdValue.startsWith('stool-');
    const isOttoman = presetIdValue.startsWith('ottoman-');
    const isLounger = presetIdValue.startsWith('lounger-');
    const isParasol = presetIdValue.startsWith('parasol-');
    const isFirepit = presetIdValue.startsWith('firepit-');
    const isBbq = presetIdValue.startsWith('appliance-bbq-');
    const isBath = furnitureTypeValue === 'bath';
    const isKitchen = furnitureTypeValue === 'kitchen';
    const isLaundry = furnitureTypeValue === 'laundry';
    const isElectric = furnitureTypeValue === 'electric';
    const isWater = furnitureTypeValue === 'water';
    const isStairs = presetIdValue.startsWith('stairs-');
    const isCurvedStairs = presetIdValue.startsWith('stairs-curved-');
    const isSpiralStairs = presetIdValue.startsWith('stairs-spiral-');
    const isStraightStairs = isStairs && !isCurvedStairs && !isSpiralStairs;
    const isChaise = isSofa && presetIdValue.includes('chaise');
    const chaiseOnRight = presetIdValue.includes('-r-');
    const isOfuro = presetIdValue.startsWith('bathtub-ofuro-');
    const isWashStation = presetIdValue.startsWith('wash-station-');

    const isTatami = presetIdValue.startsWith('tatami-');
    const isFuton = presetIdValue.startsWith('futon-');
    const isZabuton = presetIdValue.startsWith('zabuton-');
    const isKotatsu = presetIdValue.startsWith('kotatsu-');
    const isChabudai = presetIdValue.startsWith('chabudai-');
    const isByobu = presetIdValue.startsWith('byobu-');
    const isShojiScreen = presetIdValue.startsWith('shoji-screen-');
    const isJapaneseItem = isTatami || isFuton || isZabuton || isKotatsu || isChabudai || isByobu || isShojiScreen;

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
                : isJapaneseItem
                  ? 'rgba(180, 140, 70, 0.18)'
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
              : isJapaneseItem
                ? '#8a5f2b'
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
        {!isChaise && !isRug && !isStool && !isFirepit && !isParasol && !isPlantRound && !isOfficeChair && !isCurvedStairs && !isSpiralStairs && !isKotatsu && !isChabudai && !isByobu && (
          <rect
            x={left}
            y={top}
            width={widthPx}
            height={depthPx}
            fill={baseFill}
            stroke={strokeColor}
            strokeWidth={isSelected ? 3 : 2}
            rx={cornerR}
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

        {isStool && (
          <circle cx={fixture.position.x} cy={fixture.position.y} r={Math.min(widthPx, depthPx) * 0.34} fill="none" stroke={strokeColor} strokeWidth={1} opacity={0.55} />
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

        {isOttoman && (() => {
          const cx = fixture.position.x;
          const cy = fixture.position.y;
          const insetX = left + widthPx * 0.14;
          const insetY = top + depthPx * 0.14;
          const insetW = widthPx * 0.72;
          const insetH = depthPx * 0.72;
          const buttonR = Math.max(1.2, Math.min(widthPx, depthPx) * 0.05);
          return (
            <>
              <rect x={insetX} y={insetY} width={insetW} height={insetH} fill="none" stroke={strokeColor} strokeWidth={1} opacity={0.4} rx={Math.min(insetW, insetH) * 0.14} />
              <line x1={insetX} y1={insetY} x2={insetX + insetW} y2={insetY + insetH} stroke={strokeColor} strokeWidth={0.8} opacity={0.35} />
              <line x1={insetX + insetW} y1={insetY} x2={insetX} y2={insetY + insetH} stroke={strokeColor} strokeWidth={0.8} opacity={0.35} />
              <circle cx={cx} cy={cy} r={buttonR} fill="none" stroke={strokeColor} strokeWidth={0.9} opacity={0.6} />
            </>
          );
        })()}

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
          const armWidth = Math.max(6, Math.min(widthPx * 0.16, depthPx * 0.55));
          const armRadius = armWidth * 0.55;
          const backDepth = Math.max(6, depthPx * 0.22);
          const seatLeft = left + armWidth + 2;
          const seatRight = left + widthPx - armWidth - 2;
          const seatTop = top + backDepth + 3;
          const seatBottom = top + depthPx - 3;
          const seatCount = Math.max(2, Math.round((Number(fixture.widthM) || 1.8) / 0.75));
          const seatWidth = (seatRight - seatLeft) / seatCount;
          const cushionGap = Math.min(3, seatWidth * 0.06);
          const cushionRadius = Math.min(6, seatWidth * 0.12);
          const cushions = Array.from({ length: seatCount }).map((_, i) => (
            <rect
              key={`cushion-${i}`}
              x={seatLeft + i * seatWidth + cushionGap / 2}
              y={seatTop}
              width={Math.max(0, seatWidth - cushionGap)}
              height={Math.max(0, seatBottom - seatTop)}
              fill="none"
              stroke={strokeColor}
              strokeWidth={0.9}
              opacity={0.35}
              rx={cushionRadius}
            />
          ));
          return (
            <>
              <rect x={left} y={top} width={armWidth} height={depthPx} fill={baseFill} stroke={strokeColor} strokeWidth={1.3} rx={armRadius} />
              <rect x={left + widthPx - armWidth} y={top} width={armWidth} height={depthPx} fill={baseFill} stroke={strokeColor} strokeWidth={1.3} rx={armRadius} />
              <rect x={seatLeft} y={top + 2} width={Math.max(0, seatRight - seatLeft)} height={backDepth} fill={baseFill} stroke={strokeColor} strokeWidth={1.2} rx={Math.min(8, backDepth * 0.5)} opacity={0.85} />
              {cushions}
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
          const armWidth = Math.min(widthPx * 0.14, depthPx * 0.32);
          const armRadius = armWidth * 0.55;
          const armX = chaiseOnRight ? left + widthPx - armWidth : left;
          const backDepth = Math.max(5, seatDepth * 0.22);
          const backX = chaiseOnRight ? left : left + armWidth;
          const backWidth = (chaiseOnRight ? left + widthPx - armWidth : left + widthPx) - backX;

          return (
            <>
              <polygon points={outline} fill={baseFill} stroke={strokeColor} strokeWidth={isSelected ? 3 : 2} strokeLinejoin="round" />
              <rect x={armX} y={top} width={armWidth} height={depthPx} fill={baseFill} stroke={strokeColor} strokeWidth={1.2} rx={armRadius} />
              <rect x={backX} y={top + 2} width={Math.max(0, backWidth)} height={backDepth} fill={baseFill} stroke={strokeColor} strokeWidth={1.1} rx={Math.min(7, backDepth * 0.5)} opacity={0.85} />
              <line x1={innerX} y1={top + backDepth + 4} x2={innerX} y2={top + depthPx - 4} stroke={strokeColor} strokeWidth={1} opacity={0.45} />
            </>
          );
        })()}

        {presetIdValue.includes('table') && !isChangingTable && (() => {
          const x0 = left + widthPx * 0.1;
          const y0 = top + depthPx * 0.1;
          const w = widthPx * 0.8;
          const h = depthPx * 0.8;
          if (!presetIdValue.includes('garden')) {
            return <rect x={x0} y={y0} width={w} height={h} fill="none" stroke={strokeColor} strokeWidth={1.2} rx={6} opacity={0.8} />;
          }
          const meshCount = 5;
          const mesh = [];
          for (let i = 1; i < meshCount; i += 1) {
            const fx = x0 + (w * i) / meshCount;
            mesh.push(<line key={`meshV-${i}`} x1={fx} y1={y0} x2={fx} y2={y0 + h} stroke={strokeColor} strokeWidth={0.6} opacity={0.35} />);
            const fy = y0 + (h * i) / meshCount;
            mesh.push(<line key={`meshH-${i}`} x1={x0} y1={fy} x2={x0 + w} y2={fy} stroke={strokeColor} strokeWidth={0.6} opacity={0.35} />);
          }
          return (
            <>
              <rect x={x0} y={y0} width={w} height={h} fill="none" stroke={strokeColor} strokeWidth={1.2} rx={6} opacity={0.8} />
              {mesh}
            </>
          );
        })()}

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
          <>
            <line x1={left + widthPx * 0.04} y1={fixture.position.y} x2={left + widthPx * 0.96} y2={fixture.position.y} stroke={strokeColor} strokeWidth={1} opacity={0.6} />
            <line x1={left + widthPx * 0.04} y1={top} x2={left + widthPx * 0.1} y2={top + depthPx} stroke={strokeColor} strokeWidth={0.8} opacity={0.5} />
            <line x1={left + widthPx * 0.96} y1={top} x2={left + widthPx * 0.9} y2={top + depthPx} stroke={strokeColor} strokeWidth={0.8} opacity={0.5} />
          </>
        )}

        {isTV && (
          <>
            <line x1={left + widthPx * 0.08} y1={fixture.position.y} x2={left + widthPx * 0.92} y2={fixture.position.y} stroke={strokeColor} strokeWidth={1.4} opacity={0.8} />
            <line x1={left + widthPx * 0.08} y1={top} x2={left + widthPx * 0.08} y2={top + depthPx} stroke={strokeColor} strokeWidth={1.1} />
            <line x1={left + widthPx * 0.92} y1={top} x2={left + widthPx * 0.92} y2={top + depthPx} stroke={strokeColor} strokeWidth={1.1} />
          </>
        )}

        {isProjectorScreen && (() => {
          const capR = Math.max(1.6, depthPx * 0.7);
          return (
            <>
              <line x1={left + widthPx * 0.05} y1={fixture.position.y} x2={left + widthPx * 0.95} y2={fixture.position.y} stroke={strokeColor} strokeWidth={1.2} opacity={0.75} />
              <circle cx={left + widthPx * 0.05} cy={fixture.position.y} r={capR} fill="none" stroke={strokeColor} strokeWidth={1} />
              <circle cx={left + widthPx * 0.95} cy={fixture.position.y} r={capR} fill="none" stroke={strokeColor} strokeWidth={1} />
            </>
          );
        })()}

        {isChair && (
          <>
            <rect x={left + widthPx * 0.16} y={top + depthPx * 0.34} width={widthPx * 0.68} height={depthPx * 0.58} fill="none" stroke={strokeColor} strokeWidth={1.3} rx={3} />
            <path
              d={`M ${left + widthPx * 0.16} ${top + depthPx * 0.32} Q ${fixture.position.x} ${top + depthPx * 0.02} ${left + widthPx * 0.84} ${top + depthPx * 0.32}`}
              fill="none"
              stroke={strokeColor}
              strokeWidth={1.4}
            />
            {presetIdValue.includes('garden') && (() => {
              const slatCount = 3;
              const slats = [];
              for (let i = 1; i <= slatCount; i += 1) {
                const y = top + depthPx * 0.34 + (depthPx * 0.58 * i) / (slatCount + 1);
                slats.push(<line key={`cslat-${i}`} x1={left + widthPx * 0.2} y1={y} x2={left + widthPx * 0.8} y2={y} stroke={strokeColor} strokeWidth={0.7} opacity={0.4} />);
              }
              return slats;
            })()}
          </>
        )}

        {isArmchair && (() => {
          const armWidth = Math.max(5, widthPx * 0.15);
          const armRadius = armWidth * 0.55;
          const backDepth = depthPx * 0.24;
          const seatX = left + armWidth + 2;
          const seatWidth = Math.max(0, widthPx - (armWidth + 2) * 2);
          const seatTop = top + backDepth + 2;
          return (
            <>
              <rect x={left} y={top + depthPx * 0.1} width={armWidth} height={depthPx * 0.82} fill={baseFill} stroke={strokeColor} strokeWidth={1.2} rx={armRadius} />
              <rect x={left + widthPx - armWidth} y={top + depthPx * 0.1} width={armWidth} height={depthPx * 0.82} fill={baseFill} stroke={strokeColor} strokeWidth={1.2} rx={armRadius} />
              <path
                d={`M ${seatX} ${top + backDepth} Q ${fixture.position.x} ${top} ${seatX + seatWidth} ${top + backDepth}`}
                fill="none"
                stroke={strokeColor}
                strokeWidth={1.6}
              />
              <rect x={seatX + seatWidth * 0.06} y={seatTop} width={seatWidth * 0.88} height={Math.max(0, top + depthPx - 3 - seatTop)} fill="none" stroke={strokeColor} strokeWidth={1} opacity={0.4} rx={cornerR} />
            </>
          );
        })()}

        {isOfficeChair && (() => {
          // A 5-star swivel base with casters (the real defining silhouette
          // of a task chair from above), a seat circle offset slightly
          // forward, and a distinct backrest block behind it. The previous
          // version clustered a tiny star + a floating backrest arc near
          // the center, which read as a smiley face rather than a chair.
          const cx = fixture.position.x;
          const cy = fixture.position.y;
          const r = Math.min(widthPx, depthPx) / 2;
          const baseR = r * 0.88;
          const casterR = Math.max(1.2, r * 0.07);
          const legCount = 5;
          const legs = [];
          for (let i = 0; i < legCount; i += 1) {
            const angle = (i / legCount) * Math.PI * 2 - Math.PI / 2;
            const tipX = cx + Math.cos(angle) * baseR;
            const tipY = cy + Math.sin(angle) * baseR;
            legs.push(<line key={`leg-${i}`} x1={cx} y1={cy} x2={tipX} y2={tipY} stroke={strokeColor} strokeWidth={1.1} opacity={0.6} />);
            legs.push(<circle key={`caster-${i}`} cx={tipX} cy={tipY} r={casterR} fill="none" stroke={strokeColor} strokeWidth={0.9} opacity={0.7} />);
          }
          const seatR = r * 0.5;
          const seatCy = cy + seatR * 0.25;
          const backW = seatR * 1.7;
          const backH = seatR * 0.9;
          const backCy = cy - seatR * 0.85;
          return (
            <>
              {legs}
              <rect x={cx - backW / 2} y={backCy - backH / 2} width={backW} height={backH} rx={backH * 0.4} fill={baseFill} stroke={strokeColor} strokeWidth={1.3} />
              <circle cx={cx} cy={seatCy} r={seatR} fill={baseFill} stroke={strokeColor} strokeWidth={isSelected ? 3 : 2} />
              <circle cx={cx} cy={cy} r={1.8} fill={strokeColor} />
            </>
          );
        })()}

        {isStorage && presetIdValue.includes('bookshelf') && (() => {
          const wM = Number(fixture.widthM) || 0.9;
          const bayCount = Math.max(2, Math.min(5, Math.round(wM / 0.4)));
          const slotW = widthPx / bayCount;
          const dividers = [];
          for (let i = 1; i < bayCount; i += 1) {
            const x = left + i * slotW;
            dividers.push(<line key={`bay-${i}`} x1={x} y1={top + depthPx * 0.06} x2={x} y2={top + depthPx * 0.94} stroke={strokeColor} strokeWidth={1.0} opacity={0.6} />);
          }
          return dividers;
        })()}

        {isStorage && !presetIdValue.includes('bookshelf') && (() => {
          const wM = Number(fixture.widthM) || 0.9;
          const doorCount = Math.max(1, Math.min(4, Math.round(wM / 0.55)));
          const slotW = widthPx / doorCount;
          const isUsm = presetIdValue.startsWith('storage-usm-haller-') || presetIdValue.includes('usm-corpus');
          const panels = [];
          const handles = [];
          const joints = [];
          for (let i = 0; i < doorCount; i += 1) {
            const doorX = left + i * slotW + slotW * 0.06;
            const doorW = slotW * 0.88;
            panels.push(
              <rect key={`panel-${i}`} x={doorX} y={top + depthPx * 0.1} width={doorW} height={depthPx * 0.8} fill="none" stroke={strokeColor} strokeWidth={0.9} opacity={0.55} rx={2} />
            );
            const handleAtRight = i % 2 === 0;
            const handleX = handleAtRight ? doorX + doorW * 0.88 : doorX + doorW * 0.12;
            handles.push(
              <line key={`handle-${i}`} x1={handleX} y1={top + depthPx * 0.36} x2={handleX} y2={top + depthPx * 0.64} stroke={strokeColor} strokeWidth={1.1} opacity={0.75} />
            );
            if (isUsm && i > 0) {
              const jointX = left + i * slotW;
              joints.push(<circle key={`joint-${i}`} cx={jointX} cy={top + depthPx * 0.5} r={1.3} fill={strokeColor} opacity={0.8} />);
            }
          }
          return (
            <>
              {panels}
              {handles}
              {joints}
            </>
          );
        })()}

        {isDresser && (() => {
          const rows = 3;
          const lines = [];
          const handles = [];
          for (let i = 1; i < rows; i += 1) {
            const y = top + (depthPx * i) / rows;
            lines.push(<line key={`drow-${i}`} x1={left} y1={y} x2={left + widthPx} y2={y} stroke={strokeColor} strokeWidth={1.1} opacity={0.7} />);
          }
          for (let i = 0; i < rows; i += 1) {
            const y = top + (depthPx * (i + 0.5)) / rows;
            handles.push(<line key={`dhandle-${i}`} x1={fixture.position.x - widthPx * 0.12} y1={y} x2={fixture.position.x + widthPx * 0.12} y2={y} stroke={strokeColor} strokeWidth={1.3} opacity={0.8} />);
          }
          return (
            <>
              {lines}
              {handles}
            </>
          );
        })()}

        {isProjector && (
          <>
            <circle cx={fixture.position.x} cy={top + depthPx * 0.6} r={Math.min(widthPx, depthPx) * 0.26} fill="none" stroke={strokeColor} strokeWidth={1.2} />
            <circle cx={fixture.position.x} cy={top + depthPx * 0.6} r={Math.min(widthPx, depthPx) * 0.12} fill={strokeColor} opacity={0.5} />
            <line x1={left + widthPx * 0.22} y1={top + depthPx * 0.16} x2={left + widthPx * 0.78} y2={top + depthPx * 0.16} stroke={strokeColor} strokeWidth={1} opacity={0.5} />
          </>
        )}

        {isFireplace && (
          <rect x={left + widthPx * 0.15} y={top + depthPx * 0.12} width={widthPx * 0.7} height={depthPx * 0.6} fill={isTechnical ? '#ffffff' : 'rgba(60, 50, 45, 0.28)'} stroke={strokeColor} strokeWidth={1.3} rx={2} />
        )}

        {isPlant && (
          <>
            {presetIdValue.includes('pot-') && (
              <>
                <circle cx={fixture.position.x} cy={fixture.position.y} r={Math.min(widthPx, depthPx) * 0.46} fill={baseFill} stroke={strokeColor} strokeWidth={isSelected ? 3 : 2} />
                <circle cx={fixture.position.x} cy={fixture.position.y} r={Math.min(widthPx, depthPx) * 0.24} fill="none" stroke={strokeColor} strokeWidth={1.0} opacity={0.6} />
              </>
            )}
            {presetIdValue.includes('tree-') && (() => {
              const r = Math.min(widthPx, depthPx) * 0.46;
              const bumpCount = 7;
              const bumpR = r * 0.42;
              const bumpDist = r * 0.62;
              const bumps = Array.from({ length: bumpCount }).map((_, i) => {
                const angle = (i / bumpCount) * Math.PI * 2;
                return (
                  <circle
                    key={`bump-${i}`}
                    cx={fixture.position.x + Math.cos(angle) * bumpDist}
                    cy={fixture.position.y + Math.sin(angle) * bumpDist}
                    r={bumpR}
                    fill={baseFill}
                    stroke={strokeColor}
                    strokeWidth={1.2}
                  />
                );
              });
              return (
                <>
                  {bumps}
                  <circle cx={fixture.position.x} cy={fixture.position.y} r={r * 0.68} fill={baseFill} stroke={strokeColor} strokeWidth={isSelected ? 3 : 2} />
                  <circle cx={fixture.position.x} cy={fixture.position.y} r={1.6} fill={strokeColor} />
                </>
              );
            })()}
            {presetIdValue.includes('raisedbed-') && (
              <>
                <rect x={left + widthPx * 0.08} y={top + depthPx * 0.18} width={widthPx * 0.84} height={depthPx * 0.64} fill="none" stroke={strokeColor} strokeWidth={1.2} rx={3} />
                <line x1={left + widthPx * 0.2} y1={top + depthPx * 0.22} x2={left + widthPx * 0.2} y2={top + depthPx * 0.78} stroke={strokeColor} strokeWidth={1.0} opacity={0.75} />
                <line x1={left + widthPx * 0.8} y1={top + depthPx * 0.22} x2={left + widthPx * 0.8} y2={top + depthPx * 0.78} stroke={strokeColor} strokeWidth={1.0} opacity={0.75} />
              </>
            )}
          </>
        )}

        {presetIdValue.startsWith('closet-') && (() => {
          const wM = Number(fixture.widthM) || 1.2;
          const doorCount = Math.max(2, Math.min(4, Math.round(wM / 0.6)));
          const slotW = widthPx / doorCount;
          const panels = [];
          const handles = [];
          for (let i = 0; i < doorCount; i += 1) {
            const doorX = left + i * slotW + slotW * 0.05;
            const doorW = slotW * 0.9;
            panels.push(
              <rect key={`closet-panel-${i}`} x={doorX} y={top + depthPx * 0.08} width={doorW} height={depthPx * 0.84} fill="none" stroke={strokeColor} strokeWidth={1} opacity={0.6} rx={2} />
            );
            const handleAtRight = i % 2 === 0;
            const handleX = handleAtRight ? doorX + doorW * 0.9 : doorX + doorW * 0.1;
            handles.push(
              <line key={`closet-handle-${i}`} x1={handleX} y1={top + depthPx * 0.4} x2={handleX} y2={top + depthPx * 0.6} stroke={strokeColor} strokeWidth={1.2} opacity={0.8} />
            );
          }
          return (
            <>
              {panels}
              {handles}
            </>
          );
        })()}

        {isTatami && (() => {
          const portrait = depthPx >= widthPx;
          const long = portrait ? depthPx : widthPx;
          const lineCount = Math.max(4, Math.round(long / (Math.min(widthPx, depthPx) * 0.5)));
          const weaveLines = [];
          for (let i = 1; i < lineCount; i += 1) {
            if (portrait) {
              const y = top + (depthPx * i) / lineCount;
              weaveLines.push(<line key={`weave-${i}`} x1={left + widthPx * 0.05} y1={y} x2={left + widthPx * 0.95} y2={y} stroke={strokeColor} strokeWidth={0.7} opacity={0.35} />);
            } else {
              const x = left + (widthPx * i) / lineCount;
              weaveLines.push(<line key={`weave-${i}`} x1={x} y1={top + depthPx * 0.05} x2={x} y2={top + depthPx * 0.95} stroke={strokeColor} strokeWidth={0.7} opacity={0.35} />);
            }
          }
          return (
            <>
              {weaveLines}
              <rect x={left + widthPx * 0.045} y={top + depthPx * 0.045} width={widthPx * 0.91} height={depthPx * 0.91} fill="none" stroke={strokeColor} strokeWidth={1.4} opacity={0.7} />
            </>
          );
        })()}

        {isFuton && (() => {
          const channelCount = 4;
          const channels = [];
          for (let i = 1; i < channelCount; i += 1) {
            const x = left + (widthPx * i) / channelCount;
            channels.push(<line key={`ch-${i}`} x1={x} y1={top + depthPx * 0.22} x2={x} y2={top + depthPx * 0.96} stroke={strokeColor} strokeWidth={0.9} opacity={0.35} />);
          }
          return (
            <>
              <rect x={left + widthPx * 0.05} y={top + depthPx * 0.05} width={widthPx * 0.9} height={depthPx * 0.9} fill="none" stroke={strokeColor} strokeWidth={1.3} rx={cornerR} />
              <rect x={left + widthPx * 0.24} y={top + depthPx * 0.08} width={widthPx * 0.52} height={depthPx * 0.14} fill="none" stroke={strokeColor} strokeWidth={1.1} rx={3} />
              {channels}
            </>
          );
        })()}

        {isZabuton && (() => {
          const cx = fixture.position.x;
          const cy = fixture.position.y;
          const dx = widthPx * 0.28;
          const dy = depthPx * 0.28;
          return (
            <>
              <polygon points={`${cx},${cy - dy} ${cx + dx},${cy} ${cx},${cy + dy} ${cx - dx},${cy}`} fill="none" stroke={strokeColor} strokeWidth={1.1} opacity={0.6} />
              <circle cx={cx} cy={cy} r={1.6} fill={strokeColor} opacity={0.7} />
            </>
          );
        })()}

        {isKotatsu && (() => {
          const pad = Math.min(widthPx, depthPx) * 0.14;
          const outerRx = (Math.min(widthPx, depthPx) + pad * 2) * 0.24;
          return (
            <>
              <rect x={left - pad} y={top - pad} width={widthPx + pad * 2} height={depthPx + pad * 2} rx={outerRx} fill={baseFill} stroke={strokeColor} strokeWidth={1.2} opacity={0.9} />
              <rect x={left} y={top} width={widthPx} height={depthPx} rx={cornerR} fill={baseFill} stroke={strokeColor} strokeWidth={isSelected ? 3 : 2} />
              <rect x={fixture.position.x - widthPx * 0.12} y={fixture.position.y - depthPx * 0.12} width={widthPx * 0.24} height={depthPx * 0.24} fill="none" stroke={strokeColor} strokeWidth={1} opacity={0.5} />
            </>
          );
        })()}

        {isChabudai && (() => {
          const r = Math.min(widthPx, depthPx) / 2;
          return (
            <>
              <circle cx={fixture.position.x} cy={fixture.position.y} r={r} fill={baseFill} stroke={strokeColor} strokeWidth={isSelected ? 3 : 2} />
              <circle cx={fixture.position.x} cy={fixture.position.y} r={r * 0.8} fill="none" stroke={strokeColor} strokeWidth={1} opacity={0.5} />
            </>
          );
        })()}

        {isByobu && (() => {
          const panels = 4;
          const yLow = top + depthPx * 0.2;
          const yHigh = top + depthPx * 0.8;
          const pts = [];
          for (let i = 0; i <= panels; i += 1) {
            const x = left + (widthPx * i) / panels;
            const y = i % 2 === 0 ? yLow : yHigh;
            pts.push(`${x},${y}`);
          }
          const joints = [];
          for (let i = 0; i <= panels; i += 1) {
            const x = left + (widthPx * i) / panels;
            const y = i % 2 === 0 ? yLow : yHigh;
            joints.push(<circle key={`bjoint-${i}`} cx={x} cy={y} r={1.6} fill={strokeColor} />);
          }
          return (
            <>
              <rect x={left} y={top} width={widthPx} height={depthPx} fill="none" stroke={strokeColor} strokeWidth={1} opacity={0.25} strokeDasharray="3 3" />
              <polyline points={pts.join(' ')} fill="none" stroke={strokeColor} strokeWidth={1.8} strokeLinejoin="round" />
              {joints}
            </>
          );
        })()}

        {isShojiScreen && (() => {
          const divisions = 6;
          const halfH = Math.max(8, depthPx * 4, widthPx * 0.035);
          const ticks = [];
          for (let i = 1; i < divisions; i += 1) {
            const x = left + (widthPx * i) / divisions;
            ticks.push(<line key={`shoji-${i}`} x1={x} y1={fixture.position.y - halfH} x2={x} y2={fixture.position.y + halfH} stroke={strokeColor} strokeWidth={0.9} opacity={0.55} />);
          }
          return (
            <>
              {ticks}
              <line x1={left} y1={fixture.position.y - halfH} x2={left + widthPx} y2={fixture.position.y - halfH} stroke={strokeColor} strokeWidth={1} opacity={0.55} />
              <line x1={left} y1={fixture.position.y + halfH} x2={left + widthPx} y2={fixture.position.y + halfH} stroke={strokeColor} strokeWidth={1} opacity={0.55} />
            </>
          );
        })()}

        {furnitureTypeValue === 'bedroom' && presetIdValue.startsWith('bed-') && (
          <>
            <line x1={left + widthPx * 0.04} y1={top + depthPx * 0.02} x2={left + widthPx * 0.96} y2={top + depthPx * 0.02} stroke={strokeColor} strokeWidth={2.4} strokeLinecap="round" />
            <rect x={left + widthPx * 0.06} y={top + depthPx * 0.08} width={widthPx * 0.88} height={depthPx * 0.84} fill="none" stroke={strokeColor} strokeWidth={1.4} rx={6} />
            <rect x={left + widthPx * 0.12} y={top + depthPx * 0.12} width={widthPx * 0.34} height={depthPx * 0.18} fill="none" stroke={strokeColor} strokeWidth={1.2} rx={3} />
            <rect x={left + widthPx * 0.54} y={top + depthPx * 0.12} width={widthPx * 0.34} height={depthPx * 0.18} fill="none" stroke={strokeColor} strokeWidth={1.2} rx={3} />
            <path
              d={`M ${left + widthPx * 0.08} ${top + depthPx * 0.7} Q ${fixture.position.x} ${top + depthPx * 0.66} ${left + widthPx * 0.92} ${top + depthPx * 0.7}`}
              fill="none"
              stroke={strokeColor}
              strokeWidth={1}
              opacity={0.4}
            />
          </>
        )}

        {furnitureTypeValue === 'bedroom' && presetIdValue.startsWith('nightstand-') && (
          <>
            <rect x={left + widthPx * 0.14} y={top + depthPx * 0.28} width={widthPx * 0.72} height={depthPx * 0.44} fill="none" stroke={strokeColor} strokeWidth={1.1} rx={2} opacity={0.65} />
            <circle cx={fixture.position.x} cy={top + depthPx * 0.5} r={Math.min(widthPx, depthPx) * 0.05} fill={strokeColor} />
          </>
        )}

        {isCrib && (() => {
          const slatCount = 7;
          const ticks = [];
          for (let i = 0; i <= slatCount; i += 1) {
            const x = left + (widthPx * i) / slatCount;
            ticks.push(<line key={`cribT-${i}`} x1={x} y1={top} x2={x} y2={top + depthPx * 0.05} stroke={strokeColor} strokeWidth={1} opacity={0.7} />);
            ticks.push(<line key={`cribB-${i}`} x1={x} y1={top + depthPx * 0.95} x2={x} y2={top + depthPx} stroke={strokeColor} strokeWidth={1} opacity={0.7} />);
          }
          return (
            <>
              <rect x={left + widthPx * 0.06} y={top + depthPx * 0.06} width={widthPx * 0.88} height={depthPx * 0.88} fill="none" stroke={strokeColor} strokeWidth={1.3} rx={4} />
              {ticks}
            </>
          );
        })()}

        {isChangingTable && (
          <>
            <rect x={left + widthPx * 0.04} y={top + depthPx * 0.04} width={widthPx * 0.92} height={depthPx * 0.92} fill="none" stroke={strokeColor} strokeWidth={1.4} rx={4} />
            <rect x={left + widthPx * 0.14} y={top + depthPx * 0.14} width={widthPx * 0.72} height={depthPx * 0.72} fill="none" stroke={strokeColor} strokeWidth={1} opacity={0.5} rx={3} />
            <line x1={left + widthPx * 0.1} y1={top + depthPx * 0.86} x2={left + widthPx * 0.9} y2={top + depthPx * 0.86} stroke={strokeColor} strokeWidth={0.9} opacity={0.35} />
          </>
        )}

        {furnitureTypeValue === 'office' && presetIdValue.startsWith('office-desk-') && (
          <>
            <line x1={left + widthPx * 0.12} y1={top + depthPx * 0.2} x2={left + widthPx * 0.88} y2={top + depthPx * 0.2} stroke={strokeColor} strokeWidth={1.2} />
            <line x1={left + widthPx * 0.16} y1={top + depthPx * 0.76} x2={left + widthPx * 0.16} y2={top + depthPx * 0.92} stroke={strokeColor} strokeWidth={1.2} opacity={0.7} />
            <line x1={left + widthPx * 0.84} y1={top + depthPx * 0.76} x2={left + widthPx * 0.84} y2={top + depthPx * 0.92} stroke={strokeColor} strokeWidth={1.2} opacity={0.7} />
          </>
        )}

        {isBath && presetIdValue.startsWith('bathtub-') && !isOfuro && (() => {
          const x0 = left + widthPx * 0.08;
          const x1 = left + widthPx * 0.92;
          const y0 = top + depthPx * 0.12;
          const y1 = top + depthPx * 0.88;
          const rHead = Math.min(depthPx, widthPx) * 0.32;
          const rFoot = Math.min(depthPx, widthPx) * 0.08;
          const outline = `M ${x0 + rHead} ${y0}
            L ${x1 - rFoot} ${y0}
            A ${rFoot} ${rFoot} 0 0 1 ${x1} ${y0 + rFoot}
            L ${x1} ${y1 - rFoot}
            A ${rFoot} ${rFoot} 0 0 1 ${x1 - rFoot} ${y1}
            L ${x0 + rHead} ${y1}
            A ${rHead} ${rHead} 0 0 1 ${x0} ${y1 - rHead}
            L ${x0} ${y0 + rHead}
            A ${rHead} ${rHead} 0 0 1 ${x0 + rHead} ${y0} Z`;
          return (
            <>
              <path d={outline} fill="none" stroke={strokeColor} strokeWidth={1.6} strokeLinejoin="round" />
              <line x1={left + widthPx * 0.22} y1={top + depthPx * 0.22} x2={left + widthPx * 0.22} y2={top + depthPx * 0.78} stroke={strokeColor} strokeWidth={1.0} opacity={0.7} />
              <circle cx={left + widthPx * 0.85} cy={fixture.position.y} r={Math.max(1.5, Math.min(widthPx, depthPx) * 0.04)} fill={strokeColor} />
            </>
          );
        })()}

        {isBath && isOfuro && (
          <>
            <rect x={left + widthPx * 0.06} y={top + depthPx * 0.06} width={widthPx * 0.88} height={depthPx * 0.88} fill="none" stroke={strokeColor} strokeWidth={1.8} rx={8} />
            <rect x={left + widthPx * 0.14} y={top + depthPx * 0.14} width={widthPx * 0.72} height={depthPx * 0.72} fill="none" stroke={strokeColor} strokeWidth={1.0} rx={5} opacity={0.6} />
            <rect x={left + widthPx * 0.14} y={top + depthPx * 0.72} width={widthPx * 0.72} height={depthPx * 0.14} fill={baseFill} stroke={strokeColor} strokeWidth={1.0} opacity={0.7} />
            <circle cx={fixture.position.x} cy={top + depthPx * 0.42} r={Math.max(1.5, Math.min(widthPx, depthPx) * 0.035)} fill={strokeColor} />
          </>
        )}

        {isBath && presetIdValue.startsWith('toilet-') && (() => {
          // Tank sits flush against the wall (back edge) and is drawn wide
          // and filled so it reads as a distinct solid block; the bowl
          // proportions are fixed (not derived from the fixture's own
          // width/depth ratio) since a 40x70 footprint stretched that way
          // used to produce a tall, narrow "pill" instead of a bowl.
          const tankW = widthPx * 0.8;
          const tankH = depthPx * 0.2;
          const tankX = left + widthPx * 0.1;
          const gap = depthPx * 0.02;
          const bowlRx = widthPx * 0.36;
          const bowlRy = depthPx * 0.3;
          const bowlCy = top + tankH + gap + bowlRy;
          const hingeY = top + tankH + gap;
          return (
            <>
              <rect x={tankX} y={top} width={tankW} height={tankH} fill={baseFill} stroke={strokeColor} strokeWidth={1.4} rx={2} />
              <circle cx={fixture.position.x - widthPx * 0.14} cy={hingeY} r={1.2} fill={strokeColor} opacity={0.7} />
              <circle cx={fixture.position.x + widthPx * 0.14} cy={hingeY} r={1.2} fill={strokeColor} opacity={0.7} />
              <ellipse cx={fixture.position.x} cy={bowlCy} rx={bowlRx} ry={bowlRy} fill="none" stroke={strokeColor} strokeWidth={1.6} />
              <ellipse cx={fixture.position.x} cy={bowlCy + bowlRy * 0.05} rx={bowlRx * 0.68} ry={bowlRy * 0.72} fill={baseFill} stroke={strokeColor} strokeWidth={1} opacity={0.7} />
              {presetIdValue.includes('japanese') && (
                <circle cx={left + widthPx * 0.86} cy={top + depthPx * 0.12} r={Math.max(2, widthPx * 0.05)} fill={strokeColor} />
              )}
            </>
          );
        })()}

        {isBath && presetIdValue.startsWith('bath-sink-small-') && (
          <>
            <rect x={left + widthPx * 0.12} y={top + depthPx * 0.1} width={widthPx * 0.76} height={depthPx * 0.8} fill="none" stroke={strokeColor} strokeWidth={1.4} rx={4} />
            <ellipse cx={fixture.position.x} cy={fixture.position.y + depthPx * 0.04} rx={widthPx * 0.28} ry={depthPx * 0.24} fill="none" stroke={strokeColor} strokeWidth={1.2} />
            <path d={`M ${fixture.position.x - widthPx * 0.06} ${top + depthPx * 0.16} Q ${fixture.position.x} ${top + depthPx * 0.06} ${fixture.position.x + widthPx * 0.06} ${top + depthPx * 0.16}`} fill="none" stroke={strokeColor} strokeWidth={1.1} />
            <circle cx={fixture.position.x - widthPx * 0.12} cy={top + depthPx * 0.14} r={1.1} fill={strokeColor} opacity={0.75} />
            <circle cx={fixture.position.x + widthPx * 0.12} cy={top + depthPx * 0.14} r={1.1} fill={strokeColor} opacity={0.75} />
          </>
        )}

        {isBath && presetIdValue.startsWith('shower-') && (
          <>
            <rect x={left + widthPx * 0.1} y={top + depthPx * 0.1} width={widthPx * 0.8} height={depthPx * 0.8} fill="none" stroke={strokeColor} strokeWidth={1.4} rx={3} />
            <line x1={left + widthPx * 0.16} y1={top + depthPx * 0.16} x2={fixture.position.x} y2={fixture.position.y} stroke={strokeColor} strokeWidth={0.9} opacity={0.5} />
            <line x1={left + widthPx * 0.84} y1={top + depthPx * 0.16} x2={fixture.position.x} y2={fixture.position.y} stroke={strokeColor} strokeWidth={0.9} opacity={0.5} />
            <line x1={left + widthPx * 0.16} y1={top + depthPx * 0.84} x2={fixture.position.x} y2={fixture.position.y} stroke={strokeColor} strokeWidth={0.9} opacity={0.5} />
            <line x1={left + widthPx * 0.84} y1={top + depthPx * 0.84} x2={fixture.position.x} y2={fixture.position.y} stroke={strokeColor} strokeWidth={0.9} opacity={0.5} />
            <circle cx={fixture.position.x} cy={fixture.position.y} r={Math.max(2, Math.min(widthPx, depthPx) * 0.06)} fill="none" stroke={strokeColor} strokeWidth={1.3} />
          </>
        )}

        {isBath && isWashStation && (() => {
          const stoolSize = Math.min(widthPx, depthPx) * 0.36;
          const stoolX = left + widthPx * 0.3;
          const stoolY = top + depthPx * 0.62;
          const drainX = left + widthPx * 0.76;
          const drainY = top + depthPx * 0.8;
          const drainR = Math.max(2, Math.min(widthPx, depthPx) * 0.06);
          return (
            <>
              <line x1={fixture.position.x} y1={top + depthPx * 0.06} x2={fixture.position.x} y2={top + depthPx * 0.22} stroke={strokeColor} strokeWidth={1.6} />
              <circle cx={fixture.position.x} cy={top + depthPx * 0.06} r={1.6} fill={strokeColor} />
              <path d={`M ${fixture.position.x} ${top + depthPx * 0.22} Q ${fixture.position.x + widthPx * 0.16} ${top + depthPx * 0.26} ${fixture.position.x + widthPx * 0.16} ${top + depthPx * 0.4}`} fill="none" stroke={strokeColor} strokeWidth={1.3} />
              <rect x={stoolX - stoolSize / 2} y={stoolY - stoolSize / 2} width={stoolSize} height={stoolSize} fill={baseFill} stroke={strokeColor} strokeWidth={1.3} rx={stoolSize * 0.18} />
              <rect x={stoolX - stoolSize * 0.28} y={stoolY - stoolSize * 0.28} width={stoolSize * 0.56} height={stoolSize * 0.56} fill="none" stroke={strokeColor} strokeWidth={0.9} opacity={0.5} />
              <circle cx={drainX} cy={drainY} r={drainR} fill="none" stroke={strokeColor} strokeWidth={1.1} />
              <line x1={drainX - drainR * 0.7} y1={drainY} x2={drainX + drainR * 0.7} y2={drainY} stroke={strokeColor} strokeWidth={0.9} />
              <line x1={drainX} y1={drainY - drainR * 0.7} x2={drainX} y2={drainY + drainR * 0.7} stroke={strokeColor} strokeWidth={0.9} />
            </>
          );
        })()}

        {(isKitchen || isLaundry) && (
          <>
            {presetIdValue.includes('kitchen-base') && (() => {
              const isIsland = presetIdValue.includes('island');
              const wM = Number(fixture.widthM) || 0.6;
              const doorCount = wM >= 0.9 ? 2 : 1;
              // Islands are freestanding, so the countertop overhangs the
              // cabinet body on every side (not just the front); a wall run
              // only shows that overhang along the room-facing edge.
              const vMargin = isIsland ? depthPx * 0.14 : depthPx * 0.08;
              const margin = widthPx * (isIsland ? 0.08 : 0.05);
              const slotW = (widthPx - margin * 2) / doorCount;
              const doors = [];
              const handles = [];
              for (let i = 0; i < doorCount; i += 1) {
                const doorX = left + margin + i * slotW + slotW * 0.04;
                const doorW = slotW * 0.92;
                doors.push(
                  <rect key={`door-${i}`} x={doorX} y={top + vMargin} width={doorW} height={depthPx - vMargin * 2} fill="none" stroke={strokeColor} strokeWidth={0.9} opacity={0.55} rx={2} />
                );
                const handleX = doorCount === 1 ? doorX + doorW * 0.85 : (i === 0 ? doorX + doorW * 0.88 : doorX + doorW * 0.12);
                handles.push(
                  <line key={`handle-${i}`} x1={handleX} y1={top + depthPx * 0.3} x2={handleX} y2={top + depthPx * 0.6} stroke={strokeColor} strokeWidth={1.2} opacity={0.8} />
                );
              }
              return (
                <>
                  {isIsland ? (
                    <rect x={left + widthPx * 0.03} y={top + depthPx * 0.03} width={widthPx * 0.94} height={depthPx * 0.94} fill="none" stroke={strokeColor} strokeWidth={1} opacity={0.5} rx={3} />
                  ) : (
                    <line x1={left} y1={top + depthPx * 0.03} x2={left + widthPx} y2={top + depthPx * 0.03} stroke={strokeColor} strokeWidth={1} opacity={0.6} />
                  )}
                  {doors}
                  {handles}
                </>
              );
            })()}
            {presetIdValue.includes('fridge') && (() => {
              const wM = Number(fixture.widthM) || 0.6;
              if (wM >= 0.8) {
                return (
                  <>
                    <line x1={fixture.position.x} y1={top + depthPx * 0.08} x2={fixture.position.x} y2={top + depthPx * 0.62} stroke={strokeColor} strokeWidth={1.1} opacity={0.75} />
                    <line x1={left} y1={top + depthPx * 0.62} x2={left + widthPx} y2={top + depthPx * 0.62} stroke={strokeColor} strokeWidth={1.1} opacity={0.75} />
                    <line x1={left + widthPx * 0.46} y1={top + depthPx * 0.1} x2={left + widthPx * 0.46} y2={top + depthPx * 0.34} stroke={strokeColor} strokeWidth={1.3} strokeLinecap="round" />
                    <line x1={left + widthPx * 0.54} y1={top + depthPx * 0.1} x2={left + widthPx * 0.54} y2={top + depthPx * 0.34} stroke={strokeColor} strokeWidth={1.3} strokeLinecap="round" />
                  </>
                );
              }
              return (
                <>
                  <line x1={left} y1={top + depthPx * 0.7} x2={left + widthPx} y2={top + depthPx * 0.7} stroke={strokeColor} strokeWidth={1.1} opacity={0.75} />
                  <line x1={left + widthPx * 0.88} y1={top + depthPx * 0.1} x2={left + widthPx * 0.88} y2={top + depthPx * 0.62} stroke={strokeColor} strokeWidth={1.6} strokeLinecap="round" opacity={0.85} />
                </>
              );
            })()}
            {presetIdValue.includes('sink') && (() => {
              const counterX = left + widthPx * 0.08;
              const counterY = top + depthPx * 0.16;
              const counterW = widthPx * 0.84;
              const counterH = depthPx * 0.6;
              const basinCount = (Number(fixture.widthM) || 0.8) >= 0.9 ? 2 : 1;
              const basinPad = counterW * 0.09;
              const basinW = basinCount === 2 ? (counterW - basinPad * 3) / 2 : counterW - basinPad * 2;
              const basinH = counterH * 0.8;
              const basinY = counterY + counterH * 0.12;
              // Basins are drawn noticeably rounder than cabinet door panels
              // (which use a near-sharp rx) specifically so the two don't
              // read as the same "inset rectangle" symbol from the top.
              const basins = [];
              for (let i = 0; i < basinCount; i += 1) {
                const bx = counterX + basinPad + i * (basinW + basinPad);
                const bcx = bx + basinW / 2;
                const bcy = basinY + basinH / 2;
                basins.push(
                  <rect
                    key={`basin-${i}`}
                    x={bx}
                    y={basinY}
                    width={basinW}
                    height={basinH}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={1.0}
                    rx={Math.min(basinW, basinH) * 0.4}
                    opacity={0.75}
                  />
                );
                basins.push(
                  <circle key={`drain-${i}`} cx={bcx} cy={bcy} r={Math.max(1, Math.min(basinW, basinH) * 0.07)} fill="none" stroke={strokeColor} strokeWidth={0.8} opacity={0.7} />
                );
              }
              const faucetX = fixture.position.x;
              const faucetTopY = top + depthPx * 0.03;
              return (
                <>
                  <rect x={counterX} y={counterY} width={counterW} height={counterH} fill="none" stroke={strokeColor} strokeWidth={1.2} rx={4} />
                  {basins}
                  <line x1={faucetX} y1={faucetTopY} x2={faucetX} y2={counterY + counterH * 0.02} stroke={strokeColor} strokeWidth={1.3} />
                  <path d={`M ${faucetX} ${faucetTopY} Q ${faucetX + widthPx * 0.11} ${faucetTopY} ${faucetX + widthPx * 0.11} ${faucetTopY + depthPx * 0.12}`} fill="none" stroke={strokeColor} strokeWidth={1.1} />
                  <circle cx={faucetX} cy={faucetTopY} r={1.3} fill={strokeColor} opacity={0.7} />
                </>
              );
            })()}
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
                {[0.32, 0.5, 0.68].map((f) => (
                  <circle key={`knob-${f}`} cx={left + widthPx * f} cy={top + depthPx * 0.16} r={1.1} fill="none" stroke={strokeColor} strokeWidth={0.8} opacity={0.6} />
                ))}
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
            {presetIdValue.includes('microwave') && (
              <>
                <rect x={left + widthPx * 0.1} y={top + depthPx * 0.14} width={widthPx * 0.62} height={depthPx * 0.72} fill="none" stroke={strokeColor} strokeWidth={1.1} rx={2} />
                <rect x={left + widthPx * 0.78} y={top + depthPx * 0.14} width={widthPx * 0.14} height={depthPx * 0.72} fill="none" stroke={strokeColor} strokeWidth={1.0} opacity={0.7} />
                <circle cx={left + widthPx * 0.85} cy={top + depthPx * 0.24} r={1.2} fill={strokeColor} opacity={0.6} />
              </>
            )}
            {presetIdValue.includes('range-hood') && (() => {
              const slatCount = 4;
              const slats = [];
              for (let i = 1; i <= slatCount; i += 1) {
                const y = top + depthPx * (0.22 + (i * 0.5) / (slatCount + 1));
                slats.push(<line key={`hood-${i}`} x1={left + widthPx * 0.2} y1={y} x2={left + widthPx * 0.8} y2={y} stroke={strokeColor} strokeWidth={0.9} opacity={0.5} />);
              }
              return (
                <>
                  <rect x={left + widthPx * 0.14} y={top + depthPx * 0.16} width={widthPx * 0.72} height={depthPx * 0.68} fill="none" stroke={strokeColor} strokeWidth={1.2} rx={3} />
                  {slats}
                  <rect x={left + widthPx * 0.38} y={top + depthPx * 0.02} width={widthPx * 0.24} height={depthPx * 0.12} fill="none" stroke={strokeColor} strokeWidth={1.0} opacity={0.7} />
                </>
              );
            })()}
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
              <>
                <rect x={fixture.position.x - widthPx * 0.1} y={top + depthPx * 0.82} width={widthPx * 0.2} height={depthPx * 0.12} fill="none" stroke={strokeColor} strokeWidth={1.1} opacity={0.8} />
                <circle cx={fixture.position.x} cy={top + depthPx * 0.88} r={1.6} fill="none" stroke={strokeColor} strokeWidth={0.9} opacity={0.8} />
              </>
            )}
          </>
        )}

        {isStraightStairs && (() => {
          const stepCount = stepCountForRunM(Number(fixture.depthM) || 2.5);
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

        {isCurvedStairs && (() => {
          const rOuter = Math.min(widthPx, depthPx);
          const rInner = rOuter * 0.24;
          const pivotX = chaiseOnRight ? left + widthPx : left;
          const pivotY = top;
          const angleStart = chaiseOnRight ? 90 : 0;
          const angleEnd = angleStart + 90;
          const pointAt = (r, deg) => {
            const rad = (deg * Math.PI) / 180;
            return { x: pivotX + Math.cos(rad) * r, y: pivotY + Math.sin(rad) * r };
          };
          const outerStart = pointAt(rOuter, angleStart);
          const outerEnd = pointAt(rOuter, angleEnd);
          const innerEnd = pointAt(rInner, angleEnd);
          const innerStart = pointAt(rInner, angleStart);
          const outline = `M ${outerStart.x} ${outerStart.y} A ${rOuter} ${rOuter} 0 0 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A ${rInner} ${rInner} 0 0 0 ${innerStart.x} ${innerStart.y} Z`;

          const midR = (rInner + rOuter) / 2;
          // Winder treads narrow toward the inner radius, so DIN 18065 sizes
          // them by the going measured at the walking line (here, the
          // radius midpoint) rather than a straight-run going.
          const walkingLineArcM = pxToM(midR * (Math.PI / 2), baseUnitM);
          const stepCount = stepCountForRunM(walkingLineArcM);
          const treads = [];
          for (let i = 1; i < stepCount; i += 1) {
            const deg = angleStart + ((angleEnd - angleStart) * i) / stepCount;
            const from = pointAt(rInner, deg);
            const to = pointAt(rOuter, deg);
            treads.push(<line key={`ctread-${i}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={strokeColor} strokeWidth={1} opacity={0.55} />);
          }

          const arrowFromDeg = angleStart + 14;
          const arrowToDeg = angleEnd - 10;
          const arrowFrom = pointAt(midR, arrowFromDeg);
          const arrowTo = pointAt(midR, arrowToDeg);
          const arrowPath = `M ${arrowFrom.x} ${arrowFrom.y} A ${midR} ${midR} 0 0 1 ${arrowTo.x} ${arrowTo.y}`;
          const tangentRad = ((arrowToDeg + 90) * Math.PI) / 180;
          const perpRad = tangentRad + Math.PI / 2;
          const headSize = rOuter * 0.1;
          const tip = { x: arrowTo.x + Math.cos(tangentRad) * headSize, y: arrowTo.y + Math.sin(tangentRad) * headSize };
          const base = { x: arrowTo.x - Math.cos(tangentRad) * headSize * 0.6, y: arrowTo.y - Math.sin(tangentRad) * headSize * 0.6 };
          const baseLeft = { x: base.x + Math.cos(perpRad) * headSize * 0.6, y: base.y + Math.sin(perpRad) * headSize * 0.6 };
          const baseRight = { x: base.x - Math.cos(perpRad) * headSize * 0.6, y: base.y - Math.sin(perpRad) * headSize * 0.6 };

          return (
            <>
              <path d={outline} fill={baseFill} stroke={strokeColor} strokeWidth={isSelected ? 3 : 2} strokeLinejoin="round" />
              {treads}
              <path d={arrowPath} fill="none" stroke={strokeColor} strokeWidth={1.6} />
              <polygon points={`${tip.x},${tip.y} ${baseLeft.x},${baseLeft.y} ${baseRight.x},${baseRight.y}`} fill={strokeColor} />
            </>
          );
        })()}

        {isSpiralStairs && (() => {
          const rOuter = Math.min(widthPx, depthPx) / 2;
          const rInner = rOuter * 0.2;
          const cx = fixture.position.x;
          const cy = fixture.position.y;
          const midR = (rInner + rOuter) / 2;
          const walkingLineCircumferenceM = pxToM(2 * Math.PI * midR, baseUnitM);
          const stepCount = stepCountForRunM(walkingLineCircumferenceM, 6);
          const treads = Array.from({ length: stepCount }).map((_, i) => {
            const deg = (i / stepCount) * 360;
            const rad = (deg * Math.PI) / 180;
            const from = { x: cx + Math.cos(rad) * rInner, y: cy + Math.sin(rad) * rInner };
            const to = { x: cx + Math.cos(rad) * rOuter, y: cy + Math.sin(rad) * rOuter };
            return <line key={`stread-${i}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={strokeColor} strokeWidth={1} opacity={0.55} />;
          });
          const arrowFromDeg = -80;
          const arrowToDeg = 160;
          const arrowFromRad = (arrowFromDeg * Math.PI) / 180;
          const arrowToRad = (arrowToDeg * Math.PI) / 180;
          const arrowFrom = { x: cx + Math.cos(arrowFromRad) * midR, y: cy + Math.sin(arrowFromRad) * midR };
          const arrowTo = { x: cx + Math.cos(arrowToRad) * midR, y: cy + Math.sin(arrowToRad) * midR };
          const arrowPath = `M ${arrowFrom.x} ${arrowFrom.y} A ${midR} ${midR} 0 1 1 ${arrowTo.x} ${arrowTo.y}`;
          const tangentRad = arrowToRad + Math.PI / 2;
          const perpRad = tangentRad + Math.PI / 2;
          const headSize = rOuter * 0.16;
          const tip = { x: arrowTo.x + Math.cos(tangentRad) * headSize, y: arrowTo.y + Math.sin(tangentRad) * headSize };
          const base = { x: arrowTo.x - Math.cos(tangentRad) * headSize * 0.6, y: arrowTo.y - Math.sin(tangentRad) * headSize * 0.6 };
          const baseLeft = { x: base.x + Math.cos(perpRad) * headSize * 0.6, y: base.y + Math.sin(perpRad) * headSize * 0.6 };
          const baseRight = { x: base.x - Math.cos(perpRad) * headSize * 0.6, y: base.y - Math.sin(perpRad) * headSize * 0.6 };

          return (
            <>
              <circle cx={cx} cy={cy} r={rOuter} fill={baseFill} stroke={strokeColor} strokeWidth={isSelected ? 3 : 2} />
              {treads}
              <path d={arrowPath} fill="none" stroke={strokeColor} strokeWidth={1.4} opacity={0.85} />
              <polygon points={`${tip.x},${tip.y} ${baseLeft.x},${baseLeft.y} ${baseRight.x},${baseRight.y}`} fill={strokeColor} opacity={0.85} />
              <circle cx={cx} cy={cy} r={rInner} fill={baseFill} stroke={strokeColor} strokeWidth={1.4} />
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

        {presetIdValue.startsWith('solar-panel-') && (() => {
          const isInclined = presetIdValue.startsWith('solar-panel-inclined-');
          const cols = 3;
          const rows = 6;
          const gridX0 = left + widthPx * 0.08;
          const gridY0 = top + depthPx * 0.06;
          const gridW = widthPx * 0.84;
          const gridH = depthPx * 0.88;
          const gridLines = [];
          for (let c = 1; c < cols; c += 1) {
            const x = gridX0 + (gridW * c) / cols;
            gridLines.push(<line key={`pvV-${c}`} x1={x} y1={gridY0} x2={x} y2={gridY0 + gridH} stroke={strokeColor} strokeWidth={0.6} opacity={0.45} />);
          }
          for (let r = 1; r < rows; r += 1) {
            const y = gridY0 + (gridH * r) / rows;
            gridLines.push(<line key={`pvH-${r}`} x1={gridX0} y1={y} x2={gridX0 + gridW} y2={y} stroke={strokeColor} strokeWidth={0.6} opacity={0.45} />);
          }
          const minDim = Math.min(widthPx, depthPx);
          return (
            <>
              <rect x={gridX0} y={gridY0} width={gridW} height={gridH} fill="none" stroke={strokeColor} strokeWidth={1} opacity={0.65} />
              {gridLines}
              {isInclined && (
                <polygon
                  points={`${fixture.position.x - minDim * 0.09},${top - minDim * 0.02} ${fixture.position.x + minDim * 0.09},${top - minDim * 0.02} ${fixture.position.x},${top - minDim * 0.16}`}
                  fill={strokeColor}
                  opacity={0.75}
                />
              )}
            </>
          );
        })()}

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
