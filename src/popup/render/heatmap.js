import { pluralize } from '../../shared/format.js';
import { HEATMAP_BUCKETS } from '../../shared/constants.js';

export function renderHeatmap(container, summary) {
  const { today, posts, replies, reposts, likes, total } = summary;
  container.innerHTML = '';
  container.classList.add('single-day');

  const card = document.createElement('div');
  card.className = 'today-card';

  const label = document.createElement('span');
  label.className = 'today-card-label';
  label.textContent = today.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  card.appendChild(label);

  const cell = document.createElement('div');
  cell.className = 'day-cell';
  const bucket = HEATMAP_BUCKETS.find(item => total <= item.max) || HEATMAP_BUCKETS[HEATMAP_BUCKETS.length - 1];
  cell.style.backgroundColor = bucket.color;
  cell.dataset.count = String(total);
  const tooltipDate = today.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  cell.title = `${tooltipDate}\n${posts} ${pluralize('post', posts)}, ${replies} ${pluralize('reply', replies)}`;
  card.appendChild(cell);

  const counts = document.createElement('div');
  counts.className = 'today-card-counts';

  const totalLabel = document.createElement('span');
  totalLabel.className = 'today-total';
  const descriptor = total === 1 ? 'post/reply' : 'posts/replies';
  totalLabel.textContent = `${total} ${descriptor}`;
  counts.appendChild(totalLabel);

  const primary = document.createElement('span');
  primary.className = 'today-breakdown';
  primary.textContent = `${posts} ${pluralize('post', posts)} · ${replies} ${pluralize('reply', replies)}`;
  counts.appendChild(primary);

  const secondary = document.createElement('span');
  secondary.className = 'today-breakdown today-breakdown-secondary';
  secondary.textContent = `${reposts} ${pluralize('repost', reposts)} · ${likes} ${pluralize('like', likes)}`;
  counts.appendChild(secondary);

  card.appendChild(counts);
  container.appendChild(card);
}
