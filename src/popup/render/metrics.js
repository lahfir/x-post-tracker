export function renderTotals(elements, totals) {
  elements.totalLikes.textContent = totals.likes.toLocaleString();
  elements.totalReposts.textContent = totals.reposts.toLocaleString();
}
