import type { EnrichedPlan, RrgtRabbit, RrgtSubtask } from '@/types';

// Local-only Incognito RRGT plans
// These are stored in the browser (e.g. localStorage) and never sent to the server.
export interface IncognitoPlan {
  // Internal local identifier (without the "incognito:" prefix used in EnrichedPlan.id)
  localId: string;
  title: string;
  maxColumnIndex: number;
  rabbitColumnIndex: number;
  orderIndex: number;
  subtasks: {
    columnIndex: number;
    text: string;
  }[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface LocalRrgtStoreApi {
  /**
   * Return all Incognito plans as EnrichedPlan-shaped rows.
   * Implementations MUST ensure that:
   * - plan.id starts with "incognito:" + localId
   * - plan.isIncognito === true
   * - plan.localId is populated
   */
  getPlans(): EnrichedPlan[];

  /**
   * Create a new Incognito plan with the given title and return it as an EnrichedPlan.
   * The returned plan MUST have:
   * - id: "incognito:" + localId
   * - isIncognito: true
   */
  createPlan(title: string): EnrichedPlan;

  /**
   * Update (or create) a subtask cell for the given Incognito plan.
   */
  updateSubtask(planId: string, colIndex: number, text: string): void;

  /**
   * Move the Incognito rabbit to the given column index.
   */
  moveRabbit(planId: string, colIndex: number): void;

  /**
   * Rename the Incognito plan's title.
   */
  renamePlan(planId: string, title: string): void;
}

const STORAGE_KEY = 'arrowhead_incognito_plans_v1';
const INCOGNITO_ID_PREFIX = 'incognito:';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readRawPlans(): IncognitoPlan[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as IncognitoPlan[];
  } catch (error) {
    console.error('Failed to read incognito RRGT plans from localStorage', error);
    return [];
  }
}

function writeRawPlans(plans: IncognitoPlan[]): void {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  } catch (error) {
    console.error('Failed to write incognito RRGT plans to localStorage', error);
  }
}

function toEnriched(plan: IncognitoPlan): EnrichedPlan {
  const baseId = `${INCOGNITO_ID_PREFIX}${plan.localId}`;

  const rabbit: RrgtRabbit = {
    planId: baseId,
    currentColumnIndex: plan.rabbitColumnIndex,
    updatedAt: plan.updatedAt,
  };

  const subtasks: RrgtSubtask[] = plan.subtasks.map((subtask) => ({
    id: `${baseId}:${subtask.columnIndex}`,
    planId: baseId,
    columnIndex: subtask.columnIndex,
    text: subtask.text,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  }));

  return {
    id: baseId,
    taskId: baseId,
    teamMemberId: 'incognito-local',
    projectId: 'incognito-local',
    objectiveId: 'incognito-local',
    maxColumnIndex: plan.maxColumnIndex,
    task: {
      id: baseId,
      objectiveId: 'incognito-local',
      title: plan.title,
      status: 'incognito',
      priority: 0,
      dueDate: null,
    },
    objective: {
      id: 'incognito-local',
      projectId: 'incognito-local',
      name: 'Private',
    },
    rabbit,
    subtasks,
    isIncognito: true,
    localId: plan.localId,
    localOrderIndex: plan.orderIndex,
  };
}

function getNextOrderIndex(plans: IncognitoPlan[]): number {
  if (plans.length === 0) {
    return 0;
  }
  const maxOrder = Math.max(...plans.map((p) => p.orderIndex));
  return Number.isFinite(maxOrder) ? maxOrder + 1 : 0;
}

function generateLocalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export const LocalRrgtStore: LocalRrgtStoreApi = {
  getPlans(): EnrichedPlan[] {
    const plans = readRawPlans();
    return plans.map(toEnriched);
  },

  createPlan(title: string): EnrichedPlan {
    const now = new Date().toISOString();
    const localId = generateLocalId();

    const existing = readRawPlans();
    const orderIndex = getNextOrderIndex(existing);

    const plan: IncognitoPlan = {
      localId,
      title,
      maxColumnIndex: 6,
      rabbitColumnIndex: 0,
      orderIndex,
      subtasks: [],
      createdAt: now,
      updatedAt: now,
    };

    const updated = [...existing, plan];
    writeRawPlans(updated);

    return toEnriched(plan);
  },

  updateSubtask(planId: string, colIndex: number, text: string): void {
    const localId = planId.startsWith(INCOGNITO_ID_PREFIX)
      ? planId.slice(INCOGNITO_ID_PREFIX.length)
      : planId;

    const plans = readRawPlans();
    const index = plans.findIndex((p) => p.localId === localId);
    if (index === -1) {
      return;
    }

    const plan = plans[index];
    const existingSubtask = plan.subtasks.find((s) => s.columnIndex === colIndex);

    if (existingSubtask) {
      existingSubtask.text = text;
    } else {
      plan.subtasks.push({ columnIndex: colIndex, text });
    }

    plan.updatedAt = new Date().toISOString();
    plans[index] = plan;
    writeRawPlans(plans);
  },

  moveRabbit(planId: string, colIndex: number): void {
    const localId = planId.startsWith(INCOGNITO_ID_PREFIX)
      ? planId.slice(INCOGNITO_ID_PREFIX.length)
      : planId;

    const plans = readRawPlans();
    const index = plans.findIndex((p) => p.localId === localId);
    if (index === -1) {
      return;
    }

    const plan = plans[index];
    plan.rabbitColumnIndex = colIndex;
    plan.updatedAt = new Date().toISOString();
    plans[index] = plan;
    writeRawPlans(plans);
  },

  renamePlan(planId: string, title: string): void {
    const localId = planId.startsWith(INCOGNITO_ID_PREFIX)
      ? planId.slice(INCOGNITO_ID_PREFIX.length)
      : planId;

    const plans = readRawPlans();
    const index = plans.findIndex((p) => p.localId === localId);
    if (index === -1) {
      return;
    }

    const plan = plans[index];
    plan.title = title;
    plan.updatedAt = new Date().toISOString();
    plans[index] = plan;
    writeRawPlans(plans);
  },
};
