// Shared client-side types for RRGT Matrix and related APIs

export interface RrgtSubtask {
  id: string;
  planId: string;
  columnIndex: number;
  text: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface RrgtRabbit {
  planId: string;
  currentColumnIndex: number;
  updatedAt: string | null;
}

export interface EnrichedPlanTask {
  id: string;
  objectiveId: string;
  title: string;
  status: string;
  priority: number;
  dueDate: string | null;
}

export interface EnrichedPlanObjective {
  id: string;
  projectId: string;
  name: string;
}

export interface EnrichedPlan {
  id: string;
  taskId: string;
  teamMemberId: string;
  projectId: string;
  objectiveId: string;
  maxColumnIndex: number;
  task: EnrichedPlanTask;
  objective: EnrichedPlanObjective;
  rabbit: RrgtRabbit | null;
  subtasks: RrgtSubtask[];
}

export interface RrgtResponse {
  plans: EnrichedPlan[];
  total: number;
}
