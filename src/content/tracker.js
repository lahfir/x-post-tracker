import { formatDateKey } from '../shared/date.js';
import { clampGoalValue } from '../shared/format.js';
import { DEFAULT_GOALS, STORAGE_KEYS, MESSAGE_TYPES, CLASSIFICATION } from '../shared/constants.js';
import { ensureBaseline } from './baseline.js';
import { ensureDailyEntry } from '../shared/storage.js';

const recordedEventIds = new Set();
const recordedQueue = [];
const MAX_REMEMBERED_EVENTS = 400;

function rememberEvent(id) {
  recordedEventIds.add(id);
  recordedQueue.push(id);
  if (recordedQueue.length > MAX_REMEMBERED_EVENTS) {
    const oldest = recordedQueue.shift();
    if (oldest) {
      recordedEventIds.delete(oldest);
    }
  }
}

function normalizeClassification(raw) {
  switch (raw) {
    case CLASSIFICATION.reply:
      return CLASSIFICATION.reply;
    case CLASSIFICATION.like:
      return CLASSIFICATION.like;
    case 'share':
    case CLASSIFICATION.repost:
      return CLASSIFICATION.repost;
    default:
      return CLASSIFICATION.post;
  }
}

function buildEventId(payload, classification) {
  if (payload.eventId) {
    return payload.eventId;
  }
  const baseId = payload.tweetId ? `${payload.tweetId}` : 'unknown';
  const timestamp = payload.timestamp || Date.now();
  return `${classification}:${baseId}:${timestamp}`;
}

export async function handleTrackedEvent(payload) {
  const classification = normalizeClassification(payload.classification);
  const eventId = buildEventId(payload, classification);
  if (recordedEventIds.has(eventId)) {
    return;
  }
  rememberEvent(eventId);
  await incrementDailyCount(classification, payload.timestamp);
}

async function incrementDailyCount(classification, timestamp) {
  await ensureBaseline().catch(() => {});

  const eventDate = timestamp ? new Date(timestamp) : new Date();
  const key = formatDateKey(eventDate);
  const storage = await chrome.storage.local.get([
    STORAGE_KEYS.dailyCounts,
    STORAGE_KEYS.goals,
    STORAGE_KEYS.goalNotifications,
  ]);

  const dailyCounts = storage[STORAGE_KEYS.dailyCounts] || {};
  const entry = ensureDailyEntry(dailyCounts, key);

  switch (classification) {
    case CLASSIFICATION.reply:
      entry.replies += 1;
      break;
    case CLASSIFICATION.like:
      entry.likes += 1;
      break;
    case CLASSIFICATION.repost:
      entry.reposts += 1;
      break;
    default:
      entry.posts += 1;
      break;
  }

  const goals = { ...DEFAULT_GOALS, ...(storage[STORAGE_KEYS.goals] || {}) };
  const notifications = storage[STORAGE_KEYS.goalNotifications] || {};
  const todayNotifications = {
    posts: false,
    replies: false,
    ...(notifications[key] || {}),
  };

  const messages = [];

  const checkGoal = (goalKey, achieved, target) => {
    if (target <= 0) {
      return;
    }
    if (achieved >= target && !todayNotifications[goalKey]) {
      todayNotifications[goalKey] = true;
      messages.push({ goal: goalKey, achieved });
    }
  };

  checkGoal('posts', entry.posts, clampGoalValue(goals.posts, DEFAULT_GOALS.posts));
  checkGoal('replies', entry.replies, clampGoalValue(goals.replies, DEFAULT_GOALS.replies));

  notifications[key] = todayNotifications;

  await chrome.storage.local.set({
    [STORAGE_KEYS.dailyCounts]: dailyCounts,
    [STORAGE_KEYS.goalNotifications]: notifications,
  });

  chrome.runtime.sendMessage({ type: MESSAGE_TYPES.update }).catch(() => {
    /* ignore when popup not open */
  });

  messages.forEach(({ goal, achieved }) => {
    chrome.runtime
      .sendMessage({
        type: MESSAGE_TYPES.goalAchieved,
        goal,
        achieved,
        dateKey: key,
      })
      .catch(() => {
        /* background may be asleep */
      });
  });
}
