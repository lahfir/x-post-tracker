export const DEFAULT_GOALS = Object.freeze({ posts: 1, replies: 1 });

export const COLOR_STOPS = [
  'var(--zero)',
  'var(--scale-1)',
  'var(--scale-2)',
  'var(--scale-3)',
  'var(--scale-4)',
];

export const HEATMAP_BUCKETS = [
  { max: 0, label: 'No posts/replies', color: COLOR_STOPS[0] },
  { max: 2, label: '1-2 posts/replies', color: COLOR_STOPS[1] },
  { max: 4, label: '3-4 posts/replies', color: COLOR_STOPS[2] },
  { max: 6, label: '5-6 posts/replies', color: COLOR_STOPS[3] },
  { max: Infinity, label: '7+ posts/replies', color: COLOR_STOPS[4] },
];

export const STORAGE_KEYS = Object.freeze({
  dailyCounts: 'dailyCounts',
  goals: 'goals',
  goalNotifications: 'goalNotifications',
});

export const MESSAGE_TYPES = Object.freeze({
  update: 'xPostTracker:update',
  tweetDetected: 'xPostTracker:tweetDetected',
  goalAchieved: 'xPostTracker:goalAchieved',
});

export const CLASSIFICATION = Object.freeze({
  post: 'post',
  reply: 'reply',
  like: 'like',
  repost: 'repost',
});
