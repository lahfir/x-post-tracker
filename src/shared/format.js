export function pluralize(label, value) {
  return value === 1 ? label : `${label}s`;
}

export function safeNumber(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
}

export function clampGoalValue(value, fallback) {
  if (value === '' || value === null || value === undefined) {
    return fallback;
  }
  return Math.max(0, safeNumber(value, fallback));
}
