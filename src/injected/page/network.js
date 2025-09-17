import { debugLog, postEvent, toJsonSafe } from './utils.js';
import { classifyTweetBody, extractTweetIdFromResponse, parseTweetIdFromBody } from './classify.js';
import { updateAuthFromHeaders } from './auth.js';

const MESSAGE_TYPES = {
  tweetDetected: 'xPostTracker:tweetDetected',
};

const CLASSIFICATION = {
  post: 'post',
  reply: 'reply',
  like: 'like',
  repost: 'repost',
};

const CREATE_TWEET_PATTERN = /https:\/\/(?:[^/]+\.)?x\.com\/i\/api\/graphql\/[^/?]+\/CreateTweet/;
const LEGACY_TWEET_PATTERN = /https:\/\/(?:[^/]+\.)?x\.com\/i\/api\/1\.1\/statuses\/update\.json/;
const LIKE_PATTERN = /https:\/\/(?:[^/]+\.)?x\.com\/i\/api\/graphql\/[^/?]+\/(?:FavoriteTweet|CreateFavorite)(?:\/|$)|https:\/\/(?:[^/]+\.)?x\.com\/i\/api\/1\.1\/favorites\/create\.json/;
const REPOST_PATTERN = /https:\/\/(?:[^/]+\.)?x\.com\/i\/api\/graphql\/[^/?]+\/(?:CreateRetweet|CreateRetweetWithComments)(?:\/|$)|https:\/\/(?:[^/]+\.)?x\.com\/i\/api\/1\.1\/statuses\/retweet\//;

export function installNetworkHooks() {
  patchFetch();
  patchXHR();
}

function patchFetch() {
  const originalFetch = window.fetch;
  if (typeof originalFetch !== 'function') {
    return;
  }

  window.fetch = function patchedFetch(resource, init) {
    const requestInfo = normalizeRequest(resource, init);
    const { url, method } = requestInfo;
    const watchTweet = shouldTrackTweet(url, method);
    const secondary = detectSecondaryAction(url, method);
    const bodyPromise = watchTweet || secondary ? readBodyText(resource, init) : Promise.resolve(null);

    collectAuthFromRequest(resource, init);

    const fetchPromise = originalFetch.apply(this, arguments);
    if (!watchTweet && !secondary) {
      return fetchPromise;
    }

    return fetchPromise.then(response => {
      if (watchTweet) {
        handleTweetResponse(bodyPromise, response);
      }
      if (secondary) {
        handleSecondaryAction(secondary, bodyPromise, response?.ok);
      }
      return response;
    });
  };
}

function patchXHR() {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  const originalSetHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function patchedOpen(method, url) {
    this.__xPostTracker = {
      method: (method || 'GET').toUpperCase(),
      url,
      headers: new Headers(),
    };
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.setRequestHeader = function patchedSetHeader(name, value) {
    if (this.__xPostTracker) {
      this.__xPostTracker.headers.set(name, value);
    }
    return originalSetHeader.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function patchedSend(body) {
    const info = this.__xPostTracker;
    if (!info) {
      return originalSend.apply(this, arguments);
    }

    updateAuthFromHeaders(info.headers);
    const watchTweet = shouldTrackTweet(info.url || '', info.method || 'GET');
    const secondary = detectSecondaryAction(info.url || '', info.method || 'GET');
    const bodyPromise = watchTweet || secondary ? readBodyPayload(body) : Promise.resolve(null);

    if (watchTweet || secondary) {
      this.addEventListener('load', () => {
        const ok = this.status >= 200 && this.status < 300;
        if (watchTweet && ok) {
          try {
            const data = parseXHRResponse(this);
            Promise.all([
              bodyPromise.then(classifyTweetBody).catch(() => CLASSIFICATION.post),
              Promise.resolve(data),
            ])
              .then(([classification, payload]) => {
                if (!payload) {
                  return;
                }
                const tweetId = extractTweetIdFromResponse(payload);
                if (!tweetId) {
                  return;
                }
                dispatchTweetEvent(tweetId, classification);
              })
              .catch(error => {
                debugLog('xhr classification failed', error);
              });
          } catch (error) {
            debugLog('xhr response parse failed', error);
          }
        }
        if (secondary && ok) {
          handleSecondaryAction(secondary, bodyPromise, ok);
        }
      });
    }

    return originalSend.apply(this, arguments);
  };
}

function parseXHRResponse(xhr) {
  const responseType = xhr.responseType;
  if (!responseType || responseType === 'text') {
    if (!xhr.responseText) {
      return null;
    }
    try {
      return JSON.parse(xhr.responseText);
    } catch (error) {
      debugLog('failed parsing xhr responseText', error);
      return null;
    }
  }
  return xhr.response || null;
}

function shouldTrackTweet(url, method) {
  if (method !== 'POST' || !url) {
    return false;
  }
  return CREATE_TWEET_PATTERN.test(url) || LEGACY_TWEET_PATTERN.test(url);
}

function detectSecondaryAction(url, method) {
  if (method !== 'POST' || !url) {
    return null;
  }
  if (LIKE_PATTERN.test(url)) {
    return CLASSIFICATION.like;
  }
  if (REPOST_PATTERN.test(url)) {
    return CLASSIFICATION.repost;
  }
  return null;
}

function normalizeRequest(resource, init) {
  let url = '';
  let method = 'GET';
  if (resource instanceof Request) {
    url = resource.url;
    method = resource.method || method;
  } else if (typeof resource === 'string') {
    url = resource;
  } else if (resource && resource.url) {
    url = `${resource.url}`;
  }
  if (init && init.method) {
    method = init.method;
  }
  return { url, method: (method || 'GET').toUpperCase() };
}

function collectAuthFromRequest(resource, init) {
  if (resource instanceof Request && resource.headers) {
    updateAuthFromHeaders(resource.headers);
  }
  if (init?.headers) {
    updateAuthFromHeaders(new Headers(init.headers));
  }
}

function readBodyText(resource, init) {
  try {
    if (resource instanceof Request && resource.method === 'POST') {
      return resource.clone().text();
    }
  } catch (error) {
    debugLog('failed cloning request body', error);
  }
  if (init && init.body) {
    const body = init.body;
    if (typeof body === 'string') {
      return Promise.resolve(body);
    }
    if (body instanceof URLSearchParams) {
      return Promise.resolve(body.toString());
    }
    if (body instanceof FormData) {
      const params = new URLSearchParams();
      for (const [key, value] of body.entries()) {
        params.append(key, value instanceof File ? value.name : `${value}`);
      }
      return Promise.resolve(params.toString());
    }
  }
  return Promise.resolve(null);
}

function readBodyPayload(body) {
  if (!body) {
    return Promise.resolve(null);
  }
  if (typeof body === 'string') {
    return Promise.resolve(body);
  }
  if (body instanceof URLSearchParams) {
    return Promise.resolve(body.toString());
  }
  if (body instanceof FormData) {
    const params = new URLSearchParams();
    for (const [key, value] of body.entries()) {
      params.append(key, value instanceof File ? value.name : `${value}`);
    }
    return Promise.resolve(params.toString());
  }
  return Promise.resolve(null);
}

function handleTweetResponse(bodyPromise, response) {
  if (!response || !response.ok) {
    return;
  }
  const clone = response.clone();
  Promise.all([
    bodyPromise.then(classifyTweetBody).catch(() => CLASSIFICATION.post),
    toJsonSafe(clone),
  ])
    .then(([classification, data]) => {
      if (!data) {
        return;
      }
      const tweetId = extractTweetIdFromResponse(data);
      if (!tweetId) {
        return;
      }
      dispatchTweetEvent(tweetId, classification);
    })
    .catch(error => {
      debugLog('fetch classification failed', error);
    });
}

function handleSecondaryAction(kind, bodyPromise, ok) {
  if (!ok) {
    return;
  }
  bodyPromise
    .then(bodyText => {
      const tweetId = parseTweetIdFromBody(bodyText);
      const eventId = tweetId
        ? `${kind}:${tweetId}`
        : `${kind}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
      postEvent(MESSAGE_TYPES.tweetDetected, {
        classification: kind,
        tweetId,
        eventId,
        timestamp: Date.now(),
      });
    })
    .catch(error => {
      debugLog('secondary action processing failed', error);
    });
}

function dispatchTweetEvent(tweetId, classification) {
  const normalized = classification === CLASSIFICATION.reply ? CLASSIFICATION.reply : CLASSIFICATION.post;
  const eventId = `${normalized}:${tweetId}`;
  postEvent(MESSAGE_TYPES.tweetDetected, {
    classification: normalized,
    tweetId,
    eventId,
    timestamp: Date.now(),
  });
}
