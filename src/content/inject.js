export function injectPageHook() {
  const existing = document.querySelector('script[data-source="x-post-tracker-page"]');
  if (existing) {
    return existing.dataset.loaded === 'true';
  }

  const script = document.createElement('script');
  script.type = 'module';
  script.src = chrome.runtime.getURL('src/injected/page/index.js');
  script.dataset.source = 'x-post-tracker-page';
  script.addEventListener('load', () => {
    script.dataset.loaded = 'true';
    script.remove();
  });
  script.addEventListener('error', error => {
    console.error('x-post-tracker(content): failed to load page module', error);
  });
  (document.documentElement || document.head || document.body).appendChild(script);
  return true;
}
