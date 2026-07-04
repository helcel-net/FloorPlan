import { VIEW_H, VIEW_W } from '../config/constants';

function svgElementToPngDataUrl(svg, { targetWidth, background = '#efefea' } = {}) {
  return new Promise((resolve) => {
    if (!svg) {
      resolve(null);
      return;
    }

    const serializer = new XMLSerializer();
    const clonedSvg = svg.cloneNode(true);
    if (!(clonedSvg instanceof SVGElement)) {
      resolve(null);
      return;
    }

    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    const source = serializer.serializeToString(clonedSvg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const sourceWidth = Math.max(1, svg.clientWidth || VIEW_W);
      const sourceHeight = Math.max(1, svg.clientHeight || VIEW_H);
      const width = Math.max(1, Math.round(targetWidth || sourceWidth));
      const scale = width / sourceWidth;
      const height = Math.max(1, Math.round(sourceHeight * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(url);
        resolve(null);
        return;
      }

      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    image.src = url;
  });
}

export function exportSvgAsPng(svg, filenameBase = 'floor-plan') {
  svgElementToPngDataUrl(svg).then((pngUrl) => {
    if (!pngUrl) return;
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `${filenameBase.trim().replace(/\s+/g, '-').toLowerCase() || 'floor-plan'}.png`;
    link.click();
  });
}

// Small PNG snapshot of the current view, used as a thumbnail preview when
// listing saved plans. Not meant for export quality.
export function capturePlanPreview(svg, targetWidth = 320) {
  return svgElementToPngDataUrl(svg, { targetWidth });
}
