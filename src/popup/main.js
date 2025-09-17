import { elements } from './dom.js';
import { loadState, buildTodaySummary, computeTotals, syncGoalInputs } from './state.js';
import { renderHeatmap } from './render/heatmap.js';
import { renderLegend } from './render/legend.js';
import { renderTotals } from './render/metrics.js';
import { renderGoalProgress } from './render/goals.js';
import { bindGoalForm } from './events.js';
import { MESSAGE_TYPES } from '../shared/constants.js';

const latestCounts = { current: { posts: 0, replies: 0, likes: 0, reposts: 0 } };
const goalsState = { posts: 0, replies: 0 };
let unbindGoalForm = null;

async function refresh() {
  const { dailyCounts, goals } = await loadState();
  goalsState.posts = goals.posts;
  goalsState.replies = goals.replies;

  const todaySummary = buildTodaySummary(dailyCounts);
  latestCounts.current = todaySummary;

  renderHeatmap(elements.heatmap, todaySummary);
  renderLegend(elements.legendScale);
  renderTotals(elements, computeTotals(dailyCounts));
  renderGoalProgress(elements, todaySummary, goalsState);
  elements.emptyState.hidden = todaySummary.total > 0;
  syncGoalInputs(elements, goalsState);
}

function subscribeToRuntimeMessages() {
  chrome.runtime.onMessage.addListener(message => {
    if (message?.type === MESSAGE_TYPES.update) {
      refresh();
    }
  });
}

function initFormBinding() {
  if (unbindGoalForm) {
    unbindGoalForm();
  }
  unbindGoalForm = bindGoalForm(elements, goalsState, latestCounts, () => {
    renderGoalProgress(elements, latestCounts.current, goalsState);
  });
}

function init() {
  subscribeToRuntimeMessages();
  initFormBinding();
  refresh().catch(error => {
    console.error('x-post-tracker: failed to render popup', error);
  });
}

init();
