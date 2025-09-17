import { renderGoalRow } from '../state.js';

export function renderGoalProgress(elements, counts, goals) {
  renderGoalRow(elements.goalPostsProgress, elements.goalPostsValue, counts.posts || 0, goals.posts);
  renderGoalRow(elements.goalRepliesProgress, elements.goalRepliesValue, counts.replies || 0, goals.replies);
}
