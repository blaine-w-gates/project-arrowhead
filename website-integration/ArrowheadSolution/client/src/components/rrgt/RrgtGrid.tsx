/**
 * RRGT Grid Component
 *
 * Rabbit Race Matrix UI (Rows = tasks, Columns = Start/Subtasks)
 * Renders data returned by GET /api/rrgt/mine (EnrichedPlan[]).
 *
 * PRD v5.2 Section 3.4: RRGT Grid Structure & Item Management
 */

import type { EnrichedPlan } from '@/types';
import { AutoSaveTextarea } from '@/components/rrgt/AutoSaveTextarea';

interface RrgtGridProps {
  plans: EnrichedPlan[];
  onMoveRabbit?: (planId: string, columnIndex: number) => void;
  onSaveSubtask?: (planId: string, columnIndex: number, text: string) => void;
}

const HEADER_COLUMNS: { key: string; label: string; columnIndex?: number }[] = [
  { key: 'task', label: 'Task' },
  { key: 'start', label: 'Start', columnIndex: 0 },
  { key: 's1', label: 'Subtask 1', columnIndex: 1 },
  { key: 's2', label: 'Subtask 2', columnIndex: 2 },
  { key: 's3', label: 'Subtask 3', columnIndex: 3 },
  { key: 's4', label: 'Subtask 4', columnIndex: 4 },
  { key: 's5', label: 'Subtask 5', columnIndex: 5 },
];

export function RrgtGrid({ plans, onMoveRabbit, onSaveSubtask }: RrgtGridProps) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[900px] space-y-2">
        {/* Header Row */}
        <div className="grid grid-cols-7 gap-2 font-semibold text-sm">
          {HEADER_COLUMNS.map((col) => (
            <div key={col.key} className="px-3 py-2 bg-muted rounded-md text-center">
              {col.label}
            </div>
          ))}
        </div>

        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-4">
            No RRGT plans found for the current filters.
          </p>
        ) : (
          <div className="space-y-2">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="grid grid-cols-7 gap-2 items-stretch"
              >
                {/* Task cell */}
                <div className="px-3 py-2 border rounded-md bg-background flex flex-col justify-center">
                  <div className="text-sm font-medium truncate" title={plan.task.title}>
                    {plan.task.title}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-1">
                    {plan.objective?.name}
                  </div>
                </div>

                {/* Start + Subtask columns */}
                {HEADER_COLUMNS.slice(1).map((col) => {
                  if (typeof col.columnIndex !== 'number') {
                    return null;
                  }
                  const columnIndex = col.columnIndex;
                  const subtask = plan.subtasks.find(
                    (s) => s.columnIndex === columnIndex
                  );
                  const hasRabbit =
                    !!plan.rabbit && plan.rabbit.currentColumnIndex === columnIndex;

                  return (
                    <div
                      key={col.key}
                      className="px-3 py-2 border rounded-md bg-muted/40 align-top"
                      data-testid={`rrgt-cell-${plan.id}-${columnIndex}`}
                      onDragOver={onMoveRabbit ? (event) => {
                        event.preventDefault();
                      } : undefined}
                      onDrop={onMoveRabbit ? (event) => {
                        event.preventDefault();
                        const draggedPlanId = event.dataTransfer?.getData('application/x-rrgt-plan-id');
                        if (draggedPlanId) {
                          onMoveRabbit(draggedPlanId, columnIndex);
                        }
                      } : undefined}
                    >
                      <div className="flex items-start justify-between gap-2 min-h-[2.25rem]">
                        <div className="text-sm whitespace-pre-wrap break-words flex-1">
                          <AutoSaveTextarea
                            key={`${plan.id}-${columnIndex}`}
                            initialValue={subtask?.text ?? ''}
                            onSave={(value) => {
                              if (onSaveSubtask) {
                                onSaveSubtask(plan.id, columnIndex, value);
                              }
                            }}
                          />
                        </div>
                        {hasRabbit && (
                          <div
                            data-testid={`rabbit-${plan.id}`}
                            draggable={!!onMoveRabbit}
                            onDragStart={onMoveRabbit ? (event) => {
                              if (event.dataTransfer) {
                                event.dataTransfer.setData('application/x-rrgt-plan-id', plan.id);
                                event.dataTransfer.effectAllowed = 'move';
                              }
                            } : undefined}
                            className="text-2xl leading-none cursor-grab"
                          >
                            🐇
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
