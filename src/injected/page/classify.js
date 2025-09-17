import { debugLog } from './utils.js';

export function classifyTweetBody(bodyText) {
  if (!bodyText || typeof bodyText !== 'string') {
    return 'post';
  }
  const trimmed = bodyText.trim();
  if (!trimmed) {
    return 'post';
  }
  if (trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed);
      return classifyFromJson(json);
    } catch (error) {
      debugLog('failed parsing JSON request body', error);
    }
  } else {
    try {
      const params = new URLSearchParams(trimmed);
      if (params.has('in_reply_to_status_id') || params.has('in_reply_to_tweet_id')) {
        return 'reply';
      }
    } catch (error) {
      debugLog('failed parsing form body', error);
    }
  }
  return 'post';
}

function classifyFromJson(payload) {
  if (!payload) {
    return 'post';
  }
  const variables = payload.variables || payload.postTweetRequest || payload;
  const reply = variables?.reply || variables?.postTweetRequest?.reply;
  if (
    reply &&
    (reply.in_reply_to_tweet_id || reply.in_reply_to_status_id || reply.conversation_id)
  ) {
    return 'reply';
  }
  if (variables?.in_reply_to_status_id || variables?.in_reply_to_tweet_id) {
    return 'reply';
  }
  return 'post';
}

export function extractTweetIdFromResponse(data) {
  if (!data) {
    return null;
  }
  const graph = data?.data?.create_tweet?.tweet_results?.result;
  if (graph) {
    return graph.rest_id || graph.result?.rest_id || graph.tweet?.rest_id || null;
  }
  const timelineEntry = data?.data?.tweetCreateTimelineEntry;
  if (timelineEntry) {
    const result = timelineEntry?.tweet_results?.result;
    return result?.rest_id || result?.result?.rest_id || null;
  }
  return data?.id_str || data?.data?.create_tweet?.tweet_id || null;
}

export function parseTweetIdFromBody(bodyText) {
  if (!bodyText || typeof bodyText !== 'string') {
    return null;
  }
  const trimmed = bodyText.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed);
      const candidates = [
        json?.variables?.tweet_id,
        json?.variables?.tweetId,
        json?.variables?.tweet?.rest_id,
        json?.variables?.target?.tweet_id,
        json?.variables?.target?.tweetId,
        json?.tweet_id,
        json?.tweetId,
      ];
      for (const candidate of candidates) {
        if (candidate) {
          return `${candidate}`;
        }
      }
      return findTweetIdCandidate(json);
    } catch (error) {
      debugLog('failed parsing body JSON for tweet id', error);
    }
    return null;
  }
  try {
    const params = new URLSearchParams(trimmed);
    return (
      params.get('tweet_id') ||
      params.get('tweetId') ||
      params.get('source_tweet_id') ||
      params.get('id')
    );
  } catch (error) {
    debugLog('failed parsing body params for tweet id', error);
  }
  return null;
}

function findTweetIdCandidate(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = findTweetIdCandidate(item);
      if (candidate) {
        return candidate;
      }
    }
    return null;
  }
  for (const [key, raw] of Object.entries(value)) {
    if (raw && (typeof raw === 'string' || typeof raw === 'number')) {
      const textValue = `${raw}`;
      const isNumeric = /^\d{5,}$/.test(textValue);
      if (/tweet.*id/i.test(key) || /target.*id/i.test(key) || (key.toLowerCase() === 'id' && isNumeric)) {
        return textValue;
      }
    }
    if (raw && typeof raw === 'object') {
      const nested = findTweetIdCandidate(raw);
      if (nested) {
        return nested;
      }
    }
  }
  return null;
}
