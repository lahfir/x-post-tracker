export const DEBUG = false;

export function debugLog(...args) {
  if (DEBUG) {
    console.debug('x-post-tracker(page):', ...args);
  }
}

export function postEvent(type, payload) {
  window.postMessage(
    {
      source: 'x-post-tracker',
      type,
      payload,
    },
    '*',
  );
}

export function toJsonSafe(response) {
  try {
    return response.json();
  } catch (error) {
    debugLog('response json parse failed', error);
    return Promise.resolve(null);
  }
}
