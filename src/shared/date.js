export function startOfDay(date = new Date()) {
  const copy = new Date(date.getTime());
  if (Number.isNaN(copy.getTime())) {
    copy.setTime(Date.now());
  }
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function formatDateKey(date = new Date()) {
  const day = startOfDay(date);
  const year = day.getFullYear();
  const month = `${day.getMonth() + 1}`.padStart(2, '0');
  const dayOfMonth = `${day.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${dayOfMonth}`;
}

export function isSameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function addDays(date, amount) {
  const copy = new Date(startOfDay(date).getTime());
  copy.setDate(copy.getDate() + amount);
  return copy;
}
