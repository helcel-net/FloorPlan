const PLAN_STORAGE_KEY = 'jpfp_plans_v1';
const ACTIVE_PLAN_ID_KEY = 'jpfp_active_plan_id_v1';
const PLAN_LIMIT = 20;

function getStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function readRawPlans() {
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

function writeRawPlans(plans) {
  const storage = getStorage();
  if (!storage) throw new Error('Storage unavailable');
  storage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plans));
}

function updatedAtValue(plan) {
  return new Date(plan?.updatedAt || plan?.createdAt || 0).getTime() || 0;
}

// Every saved plan is an independent project, identified by `id`. Saving
// only ever updates the entry matching `id` (or creates a new one when no
// id is given) - it never touches any other stored project.
export function listStoredPlans() {
  return readRawPlans()
    .slice()
    .sort((a, b) => updatedAtValue(b) - updatedAtValue(a));
}

export function getStoredPlan(id) {
  if (!id) return null;
  return readRawPlans().find((plan) => plan.id === id) || null;
}

export function savePlanToStorage(plan, id = null) {
  const storage = getStorage();
  if (!storage) throw new Error('Storage unavailable');

  const now = new Date().toISOString();
  const existing = readRawPlans();
  const existingIndex = id ? existing.findIndex((entry) => entry.id === id) : -1;

  if (existingIndex >= 0) {
    const updated = {
      ...existing[existingIndex],
      ...plan,
      id: existing[existingIndex].id,
      createdAt: existing[existingIndex].createdAt || now,
      updatedAt: now
    };
    const next = existing.slice();
    next[existingIndex] = updated;
    writeRawPlans(next);
    return updated;
  }

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    ...plan
  };

  let next = [entry, ...existing];
  if (next.length > PLAN_LIMIT) {
    next = next
      .slice()
      .sort((a, b) => updatedAtValue(b) - updatedAtValue(a))
      .slice(0, PLAN_LIMIT);
  }
  writeRawPlans(next);
  return entry;
}

export function deletePlanFromStorage(id) {
  if (!id) return;
  const next = readRawPlans().filter((entry) => entry.id !== id);
  writeRawPlans(next);
}

export function getActivePlanId() {
  const storage = getStorage();
  if (!storage) return null;
  return storage.getItem(ACTIVE_PLAN_ID_KEY) || null;
}

export function setActivePlanId(id) {
  const storage = getStorage();
  if (!storage) return;
  if (id) storage.setItem(ACTIVE_PLAN_ID_KEY, id);
  else storage.removeItem(ACTIVE_PLAN_ID_KEY);
}
