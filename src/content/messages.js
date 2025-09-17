import { MESSAGE_TYPES } from '../shared/constants.js';

export function setupMessageBridge({ onTweetEvent, onBaselineResponse }) {
  window.addEventListener('message', event => {
    if (event.source !== window) {
      return;
    }
    const data = event.data;
    if (!data || data.source !== 'x-post-tracker') {
      return;
    }

    if (data.type === MESSAGE_TYPES.tweetDetected && onTweetEvent) {
      onTweetEvent(data.payload || {});
    }

    if (data.type === MESSAGE_TYPES.baselineResponse && onBaselineResponse) {
      onBaselineResponse(data.payload || {});
    }
  });
}

export function postBaselineRequest(dateKey) {
  window.postMessage(
    {
      source: 'x-post-tracker',
      type: MESSAGE_TYPES.baselineRequest,
      payload: { key: dateKey },
    },
    '*',
  );
}
