import { VIEW_H, VIEW_W } from '../config/constants';

export function exportSvgAsPng(svg, filenameBase = 'floor-plan') {
  if (!svg) return;

  const serializer = new XMLSerializer();
  const clonedSvg = svg.cloneNode(true);
  if (!(clonedSvg instanceof SVGElement)) return;

  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  const source = serializer.serializeToString(clonedSvg);
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const image = new Image();

  image.onload = () => {
    const width = Math.max(1, svg.clientWidth || VIEW_W);
    const height = Math.max(1, svg.clientHeight || VIEW_H);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      URL.revokeObjectURL(url);
      return;
    }

    context.fillStyle = '#efefea';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `${filenameBase.trim().replace(/\s+/g, '-').toLowerCase() || 'floor-plan'}.png`;
    link.click();
    URL.revokeObjectURL(url);
  };

  image.onerror = () => {
    URL.revokeObjectURL(url);
  };

  image.src = url;
}
