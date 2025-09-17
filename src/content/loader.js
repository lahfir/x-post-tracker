(async () => {
  try {
    await import(chrome.runtime.getURL('src/content/main.js'));
  } catch (error) {
    console.error('x-post-tracker: failed to load content module', error);
  }
})();
