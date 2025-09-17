const ICON_URL = chrome.runtime.getURL('assets/icon-128.png');
const NOTIFICATION_PREFIX = 'xPostTracker:goal:';
const LABELS = {
  posts: 'Posts',
  replies: 'Replies',
};

function singularFor(goal) {
  return goal === 'replies' ? 'reply' : 'post';
}

function pluralize(goal, count) {
  return count === 1 ? singularFor(goal) : LABELS[goal].toLowerCase();
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'xPostTracker:goalAchieved') {
    return;
  }

  const goal = message.goal === 'replies' ? 'replies' : 'posts';
  const achieved = Number.parseInt(message.achieved, 10) || 0;
  const title = `Goal reached: ${LABELS[goal]}`;
  const body = `You've met your ${LABELS[goal].toLowerCase()} goal with ${achieved} ${pluralize(goal, achieved)} today.`;
  const notificationId = `${NOTIFICATION_PREFIX}${goal}:${message.dateKey || ''}`;

  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: ICON_URL,
    title,
    message: body,
    priority: 1,
  }, () => chrome.runtime.lastError);
});
