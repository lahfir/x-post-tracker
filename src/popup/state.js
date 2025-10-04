import { formatDateKey, startOfDay } from '../shared/date.js';
import { clampGoalValue } from '../shared/format.js';
import { DEFAULT_GOALS, STORAGE_KEYS } from '../shared/constants.js';

export async function loadState() {
  const {
    [STORAGE_KEYS.dailyCounts]: dailyCounts = {},
    [STORAGE_KEYS.goals]: storedGoals,
  } = await chrome.storage.local.get([STORAGE_KEYS.dailyCounts, STORAGE_KEYS.goals]);

  const goals = { ...DEFAULT_GOALS, ...(storedGoals || {}) };
  return { dailyCounts, goals };
}

export function buildTodaySummary(dailyCounts) {
  const today = startOfDay();
  const key = formatDateKey(today);
  const counts = dailyCounts[key] || {};
  const posts = counts.posts || 0;
  const replies = counts.replies || 0;
  const reposts = counts.reposts || counts.shares || 0;
  const likes = counts.likes || 0;

  return {
    today,
    key,
    posts,
    replies,
    likes,
    reposts,
    total: posts + replies,
  };
}

export function renderGoalRow(fillEl, valueEl, achieved, goal) {
  const safeGoal = Math.max(0, goal || 0);
  const percent = safeGoal > 0 ? Math.min(1, achieved / safeGoal) : 1;
  fillEl.style.width = `${(percent * 100).toFixed(0)}%`;
  valueEl.textContent = `${achieved} / ${safeGoal}`;
  fillEl.classList.toggle('goal-complete', percent >= 1);
}

export function syncGoalInputs({ goalPostsInput, goalRepliesInput }, goals) {
  goalPostsInput.value = clampGoalValue(goals.posts, DEFAULT_GOALS.posts);
  goalRepliesInput.value = clampGoalValue(goals.replies, DEFAULT_GOALS.replies);
}

export async function saveGoals(goals) {
  await chrome.storage.local.set({ [STORAGE_KEYS.goals]: goals });
}

export function clampGoals(rawGoals) {
  return {
    posts: clampGoalValue(rawGoals.posts, DEFAULT_GOALS.posts),
    replies: clampGoalValue(rawGoals.replies, DEFAULT_GOALS.replies),
  };
}
