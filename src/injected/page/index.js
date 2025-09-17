import { installNetworkHooks } from './network.js';
import { initBaselineHandler } from './baseline.js';
import { debugLog } from './utils.js';

if (!window.__xPostTrackerHookInstalled) {
  window.__xPostTrackerHookInstalled = true;
  installNetworkHooks();
  initBaselineHandler();
  debugLog('page module initialized');
}
