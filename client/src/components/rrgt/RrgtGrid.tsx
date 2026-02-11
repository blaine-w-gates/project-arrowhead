/**
 * RRGT Grid Component
 *
 * Rabbit Race Matrix UI (Rows = tasks, Columns = Start/Subtasks)
 * Renders data returned by GET /api/rrgt/mine (EnrichedPlan[]).
 *
 * PRD v5.2 Section 3.4: RRGT Grid Structure & Item Management
 */

import { useState } from 'react';
import type { DragEvent } from 'react';
import type { EnrichedPlan } from '@/types';
import { AutoSaveTextarea } from '@/components/rrgt/AutoSaveTextarea';

interface RrgtGridProps {
  plans: EnrichedPlan[];
  onMoveRabbit?: (planId: string, columnIndex: number) => void;
  onSaveSubtask?: (planId: string, columnIndex: number, text: string) => void;
  onRenamePlan?: (planId: string, title: string) => void;
  targetingSlot?: 'left' | 'right' | null;
  onCellClick?: (
    planId: string,
    columnIndex: number,
    text: string,
    isPrivate: boolean,
  ) => void;
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

// Wider task column, narrower Start column, remaining columns equal width
const GRID_TEMPLATE = '2.5fr 0.8fr repeat(5, 1fr)';

export function RrgtGrid({
  plans,
  onMoveRabbit,
  onSaveSubtask,
  onRenamePlan,
  targetingSlot,
  onCellClick,
}: RrgtGridProps) {
  const [explodingCell, setExplodingCell] = useState<string | null>(null);

  return (
    <div className="w-full overflow-x-auto">
      <div
        className={
          'min-w-[900px] space-y-2 rounded-lg' +
          (targetingSlot === 'left'
            ? ' ring-2 ring-purple-400 ring-offset-2'
            : targetingSlot === 'right'
            ? ' ring-2 ring-blue-400 ring-offset-2'
            : '')
        }
      >
        {/* Header Row */}
        <div
          className="grid gap-2 font-semibold text-sm"
          style={{ gridTemplateColumns: GRID_TEMPLATE }}
        >
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
                className="grid gap-2 items-stretch"
                style={{ gridTemplateColumns: GRID_TEMPLATE }}
              >
                {/* Task cell */}
                <div className="px-3 py-2 border rounded-md bg-background flex flex-col justify-center">
                  <div
                    className="text-sm font-medium truncate flex items-center gap-2"
                    title={plan.task.title}
                  >
                    {plan.isIncognito && onRenamePlan ? (
                      <div className="flex items-center gap-2 w-full">
                        <div className="flex-1 text-sm">
                          <AutoSaveTextarea
                            key={`title-${plan.id}`}
                            initialValue={plan.task.title}
                            onSave={(value) => {
                              const nextTitle = value.trim();
                              if (!nextTitle || nextTitle === plan.task.title) return;
                              onRenamePlan(plan.id, nextTitle);
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground" aria-label="Private task">
                          🔒
                        </span>
                      </div>
                    ) : (
                      <>
                        <span className="truncate">{plan.task.title}</span>
                        {plan.isIncognito && (
                          <span className="text-xs text-muted-foreground" aria-label="Private task">
                            🔒
                          </span>
                        )}
                      </>
                    )}
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
                  const cellKey = `${plan.id}-${columnIndex}`;
                  const isAssignableCell = columnIndex > 0;
                  const isTargetingMode = !!targetingSlot && !!onCellClick && isAssignableCell;

                  const handleDrop = onMoveRabbit
                    ? (event: DragEvent<HTMLDivElement>) => {
                        event.preventDefault();
                        const dt = event.dataTransfer;
                        if (!dt) return;
                        const draggedPlanId =
                          dt.getData('application/x-rrgt-plan-id') ||
                          dt.getData('text/plain');
                        if (draggedPlanId) {
                          onMoveRabbit(draggedPlanId, columnIndex);
                          if (subtask?.text && subtask.text.trim().length > 0) {
                            setExplodingCell(cellKey);
                            setTimeout(() => {
                              setExplodingCell((prev) => (prev === cellKey ? null : prev));
                            }, 500);
                          }
                        }
                      }
                    : undefined;

                  const cellContent = (
                    <>
                      <div className="flex flex-col items-center justify-center gap-2 min-h-[2.25rem]">
                        {hasRabbit && (
                          <div
                            data-testid={`rabbit-${plan.id}`}
                            draggable={!!onMoveRabbit}
                            onDragStart={onMoveRabbit ? (event) => {
                              if (event.dataTransfer) {
                                event.dataTransfer.setData('application/x-rrgt-plan-id', plan.id);
                                event.dataTransfer.setData('application/x-rrgt-col-index', String(columnIndex));
                                event.dataTransfer.setData('application/x-rrgt-text', subtask?.text ?? '');
                                event.dataTransfer.setData('application/x-rrgt-is-private', plan.isIncognito ? 'true' : 'false');
                                event.dataTransfer.setData('text/plain', plan.id);
                                event.dataTransfer.effectAllowed = 'move';
                              }
                            } : undefined}
                            className="text-2xl leading-none cursor-grab"
                          >
                            <span className="inline-block transform -scale-x-100">🐇</span>
                          </div>
                        )}
                        <div
                          className={
                            'w-full text-sm whitespace-pre-wrap break-words' +
                            (hasRabbit ? ' hidden' : '')
                          }
                        >
                          <AutoSaveTextarea
                            key={`${plan.id}-${columnIndex}`}
                            initialValue={subtask?.text ?? ''}
                            disabled={!!targetingSlot}
                            onSave={(value) => {
                              if (onSaveSubtask) {
                                onSaveSubtask(plan.id, columnIndex, value);
                              }
                            }}
                          />
                        </div>
                      </div>
                      {explodingCell === cellKey && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl animate-ping">💥</span>
                        </div>
                      )}
                    </>
                  );

                  // Special layout for the Start column: narrower and rabbit centered
                  if (columnIndex === 0) {
                    return (
                      <div
                        key={col.key}
                        className="px-3 py-2 border rounded-md bg-muted/40 align-top relative"
                        data-testid={`rrgt-cell-${plan.id}-${columnIndex}`}
                        onClick={() => {
                          if (!isTargetingMode || !onCellClick) return;
                          const text = subtask?.text ?? '';
                          const isPrivate = !!plan.isIncognito;
                          onCellClick(plan.id, columnIndex, text, isPrivate);
                        }}
                        onDragOver={onMoveRabbit ? (event) => {
                          event.preventDefault();
                        } : undefined}
                        onDrop={handleDrop}
                      >
                        {cellContent}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={col.key}
                      className={
                        'px-3 py-2 border rounded-md bg-muted/40 align-top relative' +
                        (isTargetingMode ? ' cursor-pointer' : '')
                      }
                      data-testid={`rrgt-cell-${plan.id}-${columnIndex}`}
                      onClick={() => {
                        if (!isTargetingMode || !onCellClick) return;
                        const text = subtask?.text ?? '';
                        const isPrivate = !!plan.isIncognito;
                        onCellClick(plan.id, columnIndex, text, isPrivate);
                      }}
                      onDragOver={onMoveRabbit ? (event) => {
                        event.preventDefault();
                      } : undefined}
                      onDrop={handleDrop}
                    >
                      {cellContent}
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
