const PLAN_STORAGE_KEY = 'jpfp_plans_v1';
const PLAN_LIMIT = 20;

function getStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function readStoredPlans() {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function savePlanToStorage(plan) {
  const storage = getStorage();
  if (!storage) throw new Error('Storage unavailable');

  const entry = {
    id: `${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...plan
  };

  const existing = readStoredPlans();
  const next = [entry, ...existing].slice(0, PLAN_LIMIT);
  storage.setItem(PLAN_STORAGE_KEY, JSON.stringify(next));
  return entry;
}

export function loadLatestPlanFromStorage() {
  const plans = readStoredPlans();
  return plans[0] || null;
}
