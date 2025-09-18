import { formatDateKey } from '../shared/date.js';
import { clampGoalValue } from '../shared/format.js';
import { DEFAULT_GOALS, STORAGE_KEYS, MESSAGE_TYPES, CLASSIFICATION } from '../shared/constants.js';
import { ensureDailyEntry } from '../shared/storage.js';

const recordedEvents = new Map();
const recordedQueue = [];
const MAX_REMEMBERED_EVENTS = 400;

function rememberEvent(id, info) {
  if (!id) {
    return;
  }
  recordedEvents.set(id, info);
  recordedQueue.push(id);
  trimRecordedQueue();
}

function forgetEvent(id) {
  if (!id || !recordedEvents.has(id)) {
    return null;
  }
  const info = recordedEvents.get(id) || null;
  recordedEvents.delete(id);
  const index = recordedQueue.indexOf(id);
  if (index !== -1) {
    recordedQueue.splice(index, 1);
  }
  return info;
}

function findOppositeEventId(id) {
  if (!id) {
    return null;
  }
  if (id.endsWith(':pos')) {
    return `${id.slice(0, -4)}:neg`;
  }
  if (id.endsWith(':neg')) {
    return `${id.slice(0, -4)}:pos`;
  }
  return null;
}

function trimRecordedQueue() {
  while (recordedQueue.length > MAX_REMEMBERED_EVENTS) {
    const oldest = recordedQueue.shift();
    if (oldest && recordedEvents.has(oldest)) {
      recordedEvents.delete(oldest);
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

function buildEventId(payload, classification, delta) {
  if (payload.eventId) {
    return `${payload.eventId}`;
  }
  const baseId = payload.tweetId ? `${classification}:${payload.tweetId}` : `${classification}:unknown`;
  const timestamp = payload.timestamp || Date.now();
  const direction = delta < 0 ? 'neg' : 'pos';
  return `${baseId}:${timestamp}:${direction}`;
}

export async function handleTrackedEvent(payload) {
  const classification = normalizeClassification(payload.classification);
  const delta = typeof payload.delta === 'number' && !Number.isNaN(payload.delta) ? payload.delta : 1;
  const timestamp = typeof payload.timestamp === 'number' ? payload.timestamp : Date.now();
  const eventId = buildEventId({ ...payload, timestamp }, classification, delta);
  const undoOf = typeof payload.undoOf === 'string' ? payload.undoOf : null;
  const oppositeEventId = findOppositeEventId(eventId);
  let targetKey = null;
  if (delta < 0) {
    const removedInfo = undoOf ? forgetEvent(undoOf) : oppositeEventId ? forgetEvent(oppositeEventId) : null;
    if (removedInfo?.key) {
      targetKey = removedInfo.key;
    }
  } else if (delta > 0 && oppositeEventId) {
    forgetEvent(oppositeEventId);
  }
  if (!targetKey) {
    targetKey = formatDateKey(new Date(timestamp));
  }
  if (recordedEvents.has(eventId)) {
    return;
  }
  rememberEvent(eventId, { key: targetKey, classification });
  await applyDailyDelta(targetKey, classification, delta);
}

function applyDelta(current, delta) {
  const next = (current || 0) + delta;
  return next < 0 ? 0 : next;
}

async function applyDailyDelta(key, classification, delta) {
  if (!delta) {
    return;
  }
  const storage = await chrome.storage.local.get([
    STORAGE_KEYS.dailyCounts,
    STORAGE_KEYS.goals,
    STORAGE_KEYS.goalNotifications,
  ]);

  const dailyCounts = storage[STORAGE_KEYS.dailyCounts] || {};
  const entry = ensureDailyEntry(dailyCounts, key);

  switch (classification) {
    case CLASSIFICATION.reply:
      entry.replies = applyDelta(entry.replies, delta);
      break;
    case CLASSIFICATION.like:
      entry.likes = applyDelta(entry.likes, delta);
      break;
    case CLASSIFICATION.repost:
      entry.reposts = applyDelta(entry.reposts, delta);
      break;
    default:
      entry.posts = applyDelta(entry.posts, delta);
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
