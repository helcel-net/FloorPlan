import { GRID } from '../config/constants';
import { normalizeAndSplitWalls } from '../core/walls';
import { roundOutToGrid, roundOutToStep } from './utils';

function scalePoint(point, factor) {
  return {
    x: roundOutToGrid((Number(point?.x) || 0) * factor),
    y: roundOutToGrid((Number(point?.y) || 0) * factor)
  };
}

export function scalePlanForBaseUnit({ walls, fixtures, currentBaseUnitM, nextBaseUnitM }) {
  const factor = currentBaseUnitM / nextBaseUnitM;

  const scaledWalls = normalizeAndSplitWalls(walls.map((wall) => ({
    ...wall,
    start: scalePoint(wall.start, factor),
    end: scalePoint(wall.end, factor)
  })));

  const scaledFixtures = fixtures.map((fixture) => {
    const next = {
      ...fixture,
      position: scalePoint(fixture.position, factor)
    };
    if (fixture.kind === 'door' || fixture.kind === 'window') return next;

    return {
      ...next,
      position: {
        x: roundOutToStep(next.position.x, GRID / 2),
        y: roundOutToStep(next.position.y, GRID / 2)
      }
    };
  });

  return { scaledWalls, scaledFixtures };
}
