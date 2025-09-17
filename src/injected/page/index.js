import { installNetworkHooks } from './network.js';
import { debugLog } from './utils.js';

if (!window.__xPostTrackerHookInstalled) {
  window.__xPostTrackerHookInstalled = true;
  installNetworkHooks();
  debugLog('page module initialized');
}
