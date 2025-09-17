import { injectPageHook } from './inject.js';
import { setupMessageBridge } from './messages.js';
import { handleTrackedEvent } from './tracker.js';
import { ensureBaseline, handleBaselineResponse } from './baseline.js';

function init() {
  injectPageHook();
  setupMessageBridge({
    onTweetEvent: handleTrackedEvent,
    onBaselineResponse: handleBaselineResponse,
  });
  ensureBaseline().catch(error => {
    console.warn('x-post-tracker: baseline sync failed', error);
  });
}

init();
