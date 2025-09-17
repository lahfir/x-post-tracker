import { formatDateKey } from '../shared/date.js';
import { STORAGE_KEYS, MESSAGE_TYPES } from '../shared/constants.js';
import { postBaselineRequest } from './messages.js';
import { ensureDailyEntry } from '../shared/storage.js';

const BASELINE_TIMEOUT = 15000;
let baselinePromise = null;
let baselineResolver;
let baselineRejecter;
let timeoutId;
let pendingKey = null;
let lastBaselineKey = null;

export function ensureBaseline() {
  const todayKey = formatDateKey();
  if (lastBaselineKey !== todayKey) {
    baselinePromise = null;
  }
  if (!baselinePromise) {
    baselinePromise = initiateBaseline(todayKey);
  }
  return baselinePromise;
}

async function initiateBaseline(todayKey) {
  pendingKey = todayKey;
  lastBaselineKey = todayKey;
  const {
    [STORAGE_KEYS.baseline]: snapshots = {},
  } = await chrome.storage.local.get(STORAGE_KEYS.baseline);

  const snapshot = snapshots?.[todayKey];
  if (snapshot?.synced) {
    return snapshot;
  }

  postBaselineRequest(todayKey);

  return new Promise((resolve, reject) => {
    baselineResolver = resolve;
    baselineRejecter = reject;
    timeoutId = setTimeout(() => {
      cleanup();
      resolve({ synced: false, timeout: true });
    }, BASELINE_TIMEOUT);
  });
}

function cleanup() {
  clearTimeout(timeoutId);
  timeoutId = null;
  baselineResolver = null;
  baselineRejecter = null;
  pendingKey = null;
}

export async function handleBaselineResponse(payload) {
  if (!payload || payload.key !== pendingKey) {
    return;
  }
  const counts = payload.counts || {};
  const success = Boolean(payload.success);
  const key = pendingKey;
  try {
    const storage = await chrome.storage.local.get([
      STORAGE_KEYS.dailyCounts,
      STORAGE_KEYS.baseline,
    ]);
    const dailyCounts = storage[STORAGE_KEYS.dailyCounts] || {};
    const baselineSnapshots = storage[STORAGE_KEYS.baseline] || {};
    const entry = ensureDailyEntry(dailyCounts, key);

    entry.posts = Math.max(entry.posts || 0, counts.posts || 0);
    entry.replies = Math.max(entry.replies || 0, counts.replies || 0);
    entry.reposts = Math.max(entry.reposts || entry.shares || 0, counts.reposts || counts.shares || 0);
    entry.likes = Math.max(entry.likes || 0, counts.likes || 0);
    if ('shares' in entry) {
      delete entry.shares;
    }

    baselineSnapshots[key] = {
      synced: success,
      timestamp: Date.now(),
      counts: {
        posts: entry.posts,
        replies: entry.replies,
        reposts: entry.reposts,
        likes: entry.likes,
      },
    };

    await chrome.storage.local.set({
      [STORAGE_KEYS.dailyCounts]: dailyCounts,
      [STORAGE_KEYS.baseline]: baselineSnapshots,
    });

    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.update }).catch(() => {
      /* ignore missing listeners */
    });

    if (baselineResolver) {
      baselineResolver({ synced: success, counts });
    }
    baselinePromise = Promise.resolve({ synced: success, counts });
  } catch (error) {
    console.error('x-post-tracker: failed applying baseline', error);
    if (baselineRejecter) {
      baselineRejecter(error);
    }
    baselinePromise = null;
  } finally {
    cleanup();
  }
}
