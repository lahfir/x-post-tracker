import { injectPageHook } from './inject.js';
import { setupMessageBridge } from './messages.js';
import { handleTrackedEvent } from './tracker.js';

function init() {
  injectPageHook();
  setupMessageBridge({
    onTweetEvent: handleTrackedEvent,
  });
}

init();
