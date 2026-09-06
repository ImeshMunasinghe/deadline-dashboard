import React, { useMemo } from 'react';
import { ListChecks, ArrowUp, ArrowDown, X } from 'lucide-react';
import type { AppState, AppAction, Task } from '../types';
import { isOverdue, todayISO, computeDailyPlan } from '../utils';
import type { PlanCandidate } from '../utils';
import { TaskItem } from './TaskItem';

interface TodayViewProps {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const CAPACITY_MINUTES = 360;

interface TodayTask {
  task: Task;
  goalId: string;
  goalTitle: string;
}

export function TodayView({ state, dispatch }: TodayViewProps) {
  const today = todayISO();

  // Aggregate all incomplete tasks with their goal context
  const allTasks: TodayTask[] = useMemo(() => {
    const list: TodayTask[] = [];
    state.goals.forEach((goal) => {
      goal.tasks.forEach((task) => {
        if (!task.completed) list.push({ task, goalId: goal.id, goalTitle: goal.title });
      });
    });
    return list;
  }, [state.goals]);

  const taskMap = useMemo(() => {
    const m = new Map<string, TodayTask>();
    allTasks.forEach((item) => m.set(item.task.id, item));
    return m;
  }, [allTasks]);

  // Tasks that are due today or overdue (shown whether planned or not)
  const dueTodayTasks = useMemo(
    () => allTasks.filter(({ task }) => task.dueDate === today || isOverdue(task.dueDate)),
    [allTasks, today]
  );

  const plan = state.dailyPlan && state.dailyPlan.date === today ? state.dailyPlan.taskIds : null;

  function handlePlan() {
    const candidates: PlanCandidate[] = dueTodayTasks.map(({ task }) => ({
      taskId: task.id,
      goalId: '',
      dueDate: task.dueDate,
      priority: task.priority,
      estimatedMinutes: task.estimatedMinutes ?? 0,
    }));
    const blocked = new Set<string>();
    state.goals.forEach((g) =>
      g.tasks.forEach((t) => {
        if (t.blockedBy) {
          const blocker = g.tasks.find((x) => x.id === t.blockedBy);
          if (blocker && !blocker.completed) blocked.add(t.id);
        }
      })
    );
    dispatch({ type: 'SET_DAILY_PLAN', payload: { date: today, taskIds: computeDailyPlan(candidates, blocked, CAPACITY_MINUTES) } });
  }

  function moveInPlan(index: number, direction: -1 | 1) {
    if (!plan) return;
    const next = [...plan];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    dispatch({ type: 'REORDER_DAILY_PLAN', payload: { taskIds: next } });
  }

  // Resolve the current plan into renderable items (drop completed/missing)
  const plannedItems: TodayTask[] = useMemo(() => {
    if (!plan) return [];
    return plan
      .map((id) => taskMap.get(id))
      .filter((item): item is TodayTask => !!item && !item.task.completed);
  }, [plan, taskMap]);

  const plannedIds = new Set(plannedItems.map((i) => i.task.id));

  // Capacity: planned tasks first, then unplanned due-today tasks
  const totalMinutes = (plan ? plannedItems : dueTodayTasks).reduce(
    (sum, item) => sum + (item.task.estimatedMinutes || 0),
    0
  );
  const capacityPercent = Math.min(100, (totalMinutes / CAPACITY_MINUTES) * 100);
  const isOverCapacity = totalMinutes > CAPACITY_MINUTES;
  const unplanned = dueTodayTasks.filter(({ task }) => !plannedIds.has(task.id));

  return (
    <div className="p-6 max-w-5xl w-full mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-neutral-100">Today's Focus</h2>
        <button
          onClick={handlePlan}
          className="focus-ring flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm shrink-0"
        >
          <ListChecks size={16} />
          {plan ? 'Re-plan my day' : 'Plan my day'}
        </button>
      </div>
      
      {/* Daily Capacity Meter */}
      <div className="card p-4 mb-6">
        <div className="flex justify-between items-end mb-2">
          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-neutral-300">
              Daily Capacity {plan && <span className="text-slate-400 dark:text-neutral-500 font-normal">(planned)</span>}
            </h3>
            <p className="text-xs text-slate-400 dark:text-neutral-500">6 hours max recommended</p>
          </div>
          <div className={`text-sm font-semibold ${isOverCapacity ? 'text-red-400' : 'text-slate-700 dark:text-neutral-300'}`}>
            {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m / 6h
          </div>
        </div>
        <div className="h-2 w-full bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${isOverCapacity ? 'bg-red-500' : 'bg-blue-600'}`}
            style={{ width: `${capacityPercent}%` }}
          />
        </div>
        {isOverCapacity && (
          <p className="text-xs text-red-400 mt-2">
            You are over capacity. Consider deferring some tasks.
          </p>
        )}
      </div>

      {/* Plan / Task List */}
      <div className="card p-6">
        {plan && plannedItems.length === 0 && unplanned.length === 0 ? (
          <div className="text-center py-10 text-slate-400 dark:text-neutral-500">
            <p>Nothing planned. Click "Plan my day" to build a queue.</p>
          </div>
        ) : !plan && dueTodayTasks.length === 0 ? (
          <div className="text-center py-10 text-slate-400 dark:text-neutral-500">
            <p>No tasks due today. Enjoy your day!</p>
          </div>
        ) : (
          <>
            {plan && plannedItems.length > 0 && (
              <>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-neutral-500 mb-3">
                  Today's plan — work top to bottom
                </h3>
                <ol className="flex flex-col gap-3 mb-6">
                  {plannedItems.map((item, index) => (
                    <li key={item.task.id} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-neutral-500 uppercase tracking-wider truncate">
                          {item.goalTitle}
                        </span>
                        <div className="ml-auto flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={() => moveInPlan(index, -1)}
                            disabled={index === 0}
                            aria-label="Move task up in plan"
                            className="p-1 rounded text-slate-400 dark:text-neutral-600 hover:text-slate-700 dark:hover:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            onClick={() => moveInPlan(index, 1)}
                            disabled={index === plannedItems.length - 1}
                            aria-label="Move task down in plan"
                            className="p-1 rounded text-slate-400 dark:text-neutral-600 hover:text-slate-700 dark:hover:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ArrowDown size={13} />
                          </button>
                          <button
                            onClick={() => dispatch({ type: 'REMOVE_FROM_PLAN', payload: { taskId: item.task.id } })}
                            aria-label="Remove from plan"
                            className="p-1 rounded text-slate-400 dark:text-neutral-600 hover:text-red-400 transition-colors"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="ml-7">
                        <TaskItem
                          task={item.task}
                          goalId={item.goalId}
                          dispatch={dispatch}
                          availableTasks={state.goals.find((g) => g.id === item.goalId)?.tasks}
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            )}

            {/* Unplanned due-today tasks */}
            {unplanned.length > 0 && (
              <>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-neutral-500 mb-3">
                  {plan ? 'Not in plan (due today or overdue)' : 'Due today or overdue'}
                </h3>
                <ul className="flex flex-col gap-3">
                  {unplanned.map((item) => (
                    <li key={item.task.id} className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-400 dark:text-neutral-500 uppercase tracking-wider ml-1">
                        From: {item.goalTitle}
                      </span>
                      <TaskItem
                        task={item.task}
                        goalId={item.goalId}
                        dispatch={dispatch}
                        availableTasks={state.goals.find((g) => g.id === item.goalId)?.tasks}
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
