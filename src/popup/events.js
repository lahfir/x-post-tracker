import { clampGoals, saveGoals, syncGoalInputs } from './state.js';
import { renderGoalProgress } from './render/goals.js';

export function bindGoalForm(elements, goals, latestCounts, onUpdate) {
  const handleSubmit = async event => {
    event.preventDefault();
    const formData = new FormData(elements.goalsForm);
    const nextGoals = clampGoals({
      posts: formData.get('posts'),
      replies: formData.get('replies'),
    });
    await saveGoals(nextGoals);
    goals.posts = nextGoals.posts;
    goals.replies = nextGoals.replies;
    renderGoalProgress(elements, latestCounts.current, goals);
    if (onUpdate) {
      onUpdate(nextGoals);
    }
  };

  elements.goalsForm.addEventListener('submit', handleSubmit);
  syncGoalInputs(elements, goals);

  return () => {
    elements.goalsForm.removeEventListener('submit', handleSubmit);
  };
}
