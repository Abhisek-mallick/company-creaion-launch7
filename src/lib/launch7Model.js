export const WORKSTREAM_KEYS = ['brand', 'product', 'apps', 'legal', 'finance', 'people', 'partners', 'launch'];

export function computeReadiness(tasks) {
  const rows = Object.values(tasks || {}).flat();
  return rows.length ? Math.round(rows.filter((task) => task.status === 'Done').length / rows.length * 100) : 0;
}

export function allWorkstreamsComplete(tasks) {
  return WORKSTREAM_KEYS.every((key) => (tasks?.[key] || []).length > 0 && tasks[key].every((task) => task.status === 'Done'));
}

export function nextAction(tasks) {
  const key = WORKSTREAM_KEYS.find((workstream) => (tasks?.[workstream] || []).some((task) => task.status !== 'Done'));
  return key || 'launch-review';
}
