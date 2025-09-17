import { MESSAGE_TYPES } from '../shared/constants.js';

export function setupMessageBridge({ onTweetEvent }) {
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
  });
}
