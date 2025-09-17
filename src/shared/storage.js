import { STORAGE_KEYS } from './constants.js';

export async function readStorage(keys) {
  const result = await chrome.storage.local.get(keys);
  return result;
}

export async function writeStorage(pairs) {
  await chrome.storage.local.set(pairs);
}

export async function readDailyCounts() {
  const data = await readStorage(STORAGE_KEYS.dailyCounts);
  return data[STORAGE_KEYS.dailyCounts] || {};
}

export async function writeDailyCounts(dailyCounts) {
  await writeStorage({ [STORAGE_KEYS.dailyCounts]: dailyCounts });
}

export function ensureDailyEntry(dailyCounts, key) {
  const existing = dailyCounts[key];
  if (existing) {
    return existing;
  }
  const fresh = { posts: 0, replies: 0, likes: 0, reposts: 0 };
  dailyCounts[key] = fresh;
  return fresh;
}

export { STORAGE_KEYS };
