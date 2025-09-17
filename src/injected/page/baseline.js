import { debugLog, postEvent } from './utils.js';
import { getAuthHeaders } from './auth.js';

const MESSAGE_TYPES = {
  baselineRequest: 'xPostTracker:baselineRequest',
  baselineResponse: 'xPostTracker:baselineResponse',
};

export function initBaselineHandler() {
  window.addEventListener('message', event => {
    if (event.source !== window) {
      return;
    }
    const data = event.data;
    if (!data || data.source !== 'x-post-tracker' || data.type !== MESSAGE_TYPES.baselineRequest) {
      return;
    }
    const key = data.payload?.key;
    if (!key) {
      return;
    }
    collectDailyCounts()
      .then(counts => {
        postEvent(MESSAGE_TYPES.baselineResponse, { key, success: true, counts });
      })
      .catch(error => {
        debugLog('baseline fetch failed', error);
        postEvent(MESSAGE_TYPES.baselineResponse, {
          key,
          success: false,
          error: String(error && error.message ? error.message : error),
        });
      });
  });
}

async function collectDailyCounts() {
  const session = extractSessionInfo();
  if (!session.userId) {
    throw new Error('missing user id');
  }
  const headers = getAuthHeaders();
  headers.set('accept', 'application/json');

  const url = new URL('https://x.com/i/api/1.1/statuses/user_timeline.json');
  url.searchParams.set('user_id', session.userId);
  url.searchParams.set('count', '200');
  url.searchParams.set('include_rts', 'true');
  url.searchParams.set('exclude_replies', 'false');
  url.searchParams.set('tweet_mode', 'extended');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`timeline request failed: ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('unexpected timeline payload');
  }

  const today = startOfDay();
  const nextDay = addDays(today, 1);
  const counts = { posts: 0, replies: 0, reposts: 0 };

  data.forEach(tweet => {
    const createdAt = parseTweetDate(tweet);
    if (!createdAt || createdAt < today || createdAt >= nextDay) {
      return;
    }
    if (isRepost(tweet)) {
      counts.reposts += 1;
    } else if (isReply(tweet)) {
      counts.replies += 1;
    } else {
      counts.posts += 1;
    }
  });

  return counts;
}

function extractSessionInfo() {
  const state = window.__INITIAL_STATE__ || window.__INITIAL_DATA__ || window.__NUXT__?.state || {};
  const session = state.session || state.user || {};
  const user = session.user || session.account || {};
  const metaUser = document.querySelector('meta[name="user-id"]')?.getAttribute('content');
  const metaScreen = document.querySelector('meta[name="screen-name"]')?.getAttribute('content');

  return {
    userId: session.user_id || session.userId || user.id || metaUser || null,
    screenName: user.screen_name || user.username || metaScreen || null,
  };
}

function parseTweetDate(tweet) {
  const source = tweet?.created_at || tweet?.legacy?.created_at;
  if (!source) {
    return null;
  }
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function isReply(tweet) {
  const legacy = tweet.legacy || tweet;
  return Boolean(legacy.in_reply_to_status_id_str || legacy.in_reply_to_status_id);
}

function isRepost(tweet) {
  const legacy = tweet.legacy || tweet;
  return Boolean(legacy.retweeted_status_id_str || legacy.retweeted_status || legacy.retweeted_status_id);
}

function startOfDay(date = new Date()) {
  const copy = new Date(date.getTime());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date, amount) {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + amount);
  return startOfDay(copy);
}
