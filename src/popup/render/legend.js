import { HEATMAP_BUCKETS } from '../../shared/constants.js';

export function renderLegend(container) {
  container.innerHTML = '';
  HEATMAP_BUCKETS.forEach(({ color, label }) => {
    const item = document.createElement('div');
    item.className = 'legend-item';

    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.backgroundColor = color;
    item.appendChild(swatch);

    const text = document.createElement('span');
    text.className = 'legend-text';
    text.textContent = label;
    item.appendChild(text);

    container.appendChild(item);
  });
}
