import React, { useMemo } from 'react';
import { GanttChartSquare, Flag } from 'lucide-react';
import type { AppState, AppAction } from '../types';
import { getTaskStats, formatDate } from '../utils';

interface TimelineViewProps {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

// ── Timeline (Gantt-lite): goal bars from creation → deadline with progress ─
export function TimelineView({ state, dispatch }: TimelineViewProps) {
  const { rows, minDate, maxDate } = useMemo(() => {
    const now = new Date();
    let min = now.getTime();
    let max = now.getTime();

    const rows = state.goals.map((goal) => {
      const start = new Date(goal.createdAt).getTime();
      const end = new Date(goal.targetDate).getTime();
      min = Math.min(min, start);
      max = Math.max(max, end);
      const { percent } = getTaskStats(goal);
      return {
        goal,
        start,
        end,
        percent,
        milestones: goal.milestones.map((m) => new Date(m.date).getTime()),
      };
    }).sort((a, b) => a.end - b.end);

    // Pad range a little on both sides
    const pad = Math.max(3 * 24 * 60 * 60 * 1000, (max - min) * 0.03);
    return { rows, minDate: min - pad, maxDate: max + pad };
  }, [state.goals]);

  const totalMs = maxDate - minDate;

  function frac(t: number): number {
    return Math.min(100, Math.max(0, ((t - minDate) / totalMs) * 100));
  }

  const todayFrac = frac(Date.now());

  if (rows.length === 0) {
    return (
      <div className="p-6 max-w-6xl w-full mx-auto">
        <div className="card p-10 text-center text-slate-400 dark:text-neutral-500">
          <GanttChartSquare size={32} className="mx-auto mb-3 opacity-40" aria-hidden />
          <p className="text-sm font-medium">No goals to plot yet.</p>
          <p className="text-xs mt-1">Add a goal in the sidebar to see it on the timeline.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl w-full mx-auto">
      <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-2 mb-5">
        <GanttChartSquare size={22} className="text-blue-600 shrink-0" aria-hidden />
        Goal Timeline
      </h2>

      <div className="card p-4 overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Month axis */}
          <div className="relative h-5 mb-2">
            {(() => {
              const labels: { label: string; frac: number }[] = [];
              const cursor = new Date(minDate);
              cursor.setDate(1);
              while (cursor.getTime() <= maxDate) {
                const f = frac(cursor.getTime());
                if (f > 0 && f < 100) {
                  labels.push({
                    label: cursor.toLocaleDateString('en-US', { month: 'short' }),
                    frac: f,
                  });
                }
                cursor.setMonth(cursor.getMonth() + 1);
              }
              return labels.map((l, i) => (
                <span
                  key={i}
                  className="absolute top-0 text-[9px] uppercase tracking-widest text-slate-400 dark:text-neutral-600 -translate-x-1/2"
                  style={{ left: `${l.frac}%` }}
                >
                  {l.label}
                </span>
              ));
            })()}
          </div>

          {/* Rows */}
          <div className="flex flex-col gap-3">
            {rows.map(({ goal, start, end, percent, milestones }) => {
              const isOverdue = end < Date.now() && percent < 100;
              return (
                <button
                  key={goal.id}
                  onClick={() => {
                    dispatch({ type: 'SET_ACTIVE_VIEW', payload: { view: 'goal' } });
                    dispatch({ type: 'SET_ACTIVE_GOAL', payload: { id: goal.id } });
                  }}
                  className="focus-ring group grid grid-cols-[140px_1fr_70px] items-center gap-3 text-left rounded-lg px-1 py-1 hover:bg-slate-50 dark:hover:bg-neutral-800/60 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700 dark:text-neutral-200 truncate">{goal.title}</p>
                    <p className="text-[10px] text-slate-400 dark:text-neutral-600">{formatDate(goal.targetDate)}</p>
                  </div>

                  <div className="relative h-6">
                    {/* Today marker */}
                    <span
                      className="absolute top-0 bottom-0 w-px bg-red-400/70"
                      style={{ left: `${todayFrac}%` }}
                      aria-hidden
                    />
                    {/* Track */}
                    <div
                      className="absolute inset-y-2 rounded-full bg-slate-100 dark:bg-neutral-800"
                      style={{ left: `${frac(start)}%`, right: `${100 - frac(end)}%` }}
                    >
                      {/* Progress fill */}
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full ${isOverdue ? 'bg-red-400' : 'bg-blue-500'}`}
                        style={{ width: `${percent}%` }}
                      />
                      {/* Milestone dots */}
                      {milestones.map((m, i) => (
                        <span
                          key={i}
                          className="absolute -top-0.5 w-2 h-2 rounded-full bg-violet-500 border border-white dark:border-neutral-900"
                          style={{ left: `calc(${frac(m)}% - 4px)` }}
                          title={`Milestone: ${goal.milestones[i]?.label ?? ''}`}
                        />
                      ))}
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 text-right">
                    {percent}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-neutral-800">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-neutral-600">
              <span className="w-3 h-1.5 rounded-full bg-blue-500" /> Progress
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-neutral-600">
              <Flag size={10} className="text-violet-500" /> Milestone
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-neutral-600">
              <span className="w-px h-3 bg-red-400" /> Today
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
