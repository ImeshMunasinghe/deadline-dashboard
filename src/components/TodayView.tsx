import React, { useMemo, useState } from 'react';
import { ListChecks, ArrowUp, ArrowDown, X, Search, Plus, CheckCircle2 } from 'lucide-react';
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

// ── Task picker modal — lets users manually add any task to today's plan ──────
function TaskPickerModal({
  state,
  currentPlanIds,
  onAdd,
  onClose,
}: {
  state: AppState;
  currentPlanIds: Set<string>;
  onAdd: (taskId: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');

  const grouped = useMemo(() => {
    const q = search.toLowerCase().trim();
    return state.goals
      .map((goal) => ({
        goal,
        tasks: goal.tasks.filter(
          (t) =>
            !t.completed &&
            (q === '' || t.text.toLowerCase().includes(q))
        ),
      }))
      .filter((g) => g.tasks.length > 0);
  }, [state.goals, search]);

  const totalIncomplete = state.goals.reduce(
    (sum, g) => sum + g.tasks.filter((t) => !t.completed).length,
    0
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800
          rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-neutral-100">
              Add task to today's plan
            </h2>
            <p className="text-xs text-slate-400 dark:text-neutral-500 mt-0.5">
              {totalIncomplete} incomplete task{totalIncomplete !== 1 ? 's' : ''} across {state.goals.length} goal{state.goals.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close picker"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200
              hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-3 shrink-0">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
            />
            <input
              autoFocus
              type="text"
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm bg-slate-50 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200
                placeholder-slate-400 dark:placeholder-neutral-500 rounded-lg pl-8 pr-3 py-2 outline-none
                border border-slate-200 dark:border-neutral-700 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Task list */}
        <div className="overflow-y-auto flex-1 px-3 pb-4">
          {grouped.length === 0 ? (
            <div className="py-10 text-center text-slate-400 dark:text-neutral-500">
              <p className="text-sm">No tasks found.</p>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="mt-2 text-xs text-blue-500 hover:text-blue-400"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            grouped.map(({ goal, tasks }) => (
              <div key={goal.id} className="mb-4">
                {/* Goal header */}
                <div className="flex items-center gap-2 px-2 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-neutral-500 truncate">
                    {goal.title}
                  </span>
                  <span className="text-[10px] text-slate-300 dark:text-neutral-700">
                    {tasks.filter((t) => !currentPlanIds.has(t.id)).length} available
                  </span>
                </div>
                <ul className="flex flex-col gap-1">
                  {tasks.map((task) => {
                    const inPlan = currentPlanIds.has(task.id);
                    const overdue = isOverdue(task.dueDate);
                    const dueToday = task.dueDate === todayISO();
                    return (
                      <li key={task.id}>
                        <button
                          onClick={() => !inPlan && onAdd(task.id)}
                          disabled={inPlan}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                            transition-all ${
                              inPlan
                                ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-neutral-800/40'
                                : 'hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:ring-1 hover:ring-blue-400/40 active:scale-[0.99] cursor-pointer'
                            }`}
                        >
                          {/* Completion indicator */}
                          <span
                            className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              inPlan
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-slate-300 dark:border-neutral-600'
                            }`}
                          >
                            {inPlan && <CheckCircle2 size={12} className="text-white" />}
                          </span>

                          {/* Task text + meta */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-700 dark:text-neutral-200 truncate font-medium">
                              {task.text}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {overdue && (
                                <span className="text-[10px] font-medium text-red-400">Overdue</span>
                              )}
                              {dueToday && !overdue && (
                                <span className="text-[10px] font-medium text-amber-400">Due today</span>
                              )}
                              {task.dueDate && !dueToday && !overdue && (
                                <span className="text-[10px] text-slate-400 dark:text-neutral-500">
                                  Due {task.dueDate}
                                </span>
                              )}
                              {task.estimatedMinutes && (
                                <span className="text-[10px] text-slate-400 dark:text-neutral-500">
                                  ~{task.estimatedMinutes}m
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Priority dot */}
                          <span
                            className={`shrink-0 w-2 h-2 rounded-full ${
                              task.priority === 'high'
                                ? 'bg-red-500'
                                : task.priority === 'medium'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />

                          {!inPlan && (
                            <Plus size={14} className="shrink-0 text-blue-500 opacity-0 group-hover:opacity-100" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Today view ───────────────────────────────────────────────────────────
export function TodayView({ state, dispatch }: TodayViewProps) {
  const today = todayISO();
  const [showPicker, setShowPicker] = useState(false);

  // All incomplete tasks with goal context
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

  // Tasks due today or overdue (shown whether planned or not)
  const dueTodayTasks = useMemo(
    () => allTasks.filter(({ task }) => task.dueDate === today || isOverdue(task.dueDate)),
    [allTasks, today]
  );

  const plan = state.dailyPlan && state.dailyPlan.date === today ? state.dailyPlan.taskIds : null;

  const currentPlanIds = useMemo(() => new Set(plan ?? []), [plan]);

  // Smart auto-plan
  function handleAutoPlan() {
    const candidates: PlanCandidate[] = allTasks.map(({ task }) => ({
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
    dispatch({
      type: 'SET_DAILY_PLAN',
      payload: { date: today, taskIds: computeDailyPlan(candidates, blocked, CAPACITY_MINUTES) },
    });
  }

  // Manual add from picker
  function handleAddToPlan(taskId: string) {
    const newIds = [...(plan ?? [])];
    if (!newIds.includes(taskId)) newIds.push(taskId);
    dispatch({ type: 'SET_DAILY_PLAN', payload: { date: today, taskIds: newIds } });
  }

  function moveInPlan(index: number, direction: -1 | 1) {
    if (!plan) return;
    const next = [...plan];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    dispatch({ type: 'REORDER_DAILY_PLAN', payload: { taskIds: next } });
  }

  // Resolve the plan into renderable items (drop completed / missing)
  const plannedItems: TodayTask[] = useMemo(() => {
    if (!plan) return [];
    return plan
      .map((id) => taskMap.get(id))
      .filter((item): item is TodayTask => !!item && !item.task.completed);
  }, [plan, taskMap]);

  const plannedIds = new Set(plannedItems.map((i) => i.task.id));

  const totalMinutes = (plan ? plannedItems : dueTodayTasks).reduce(
    (sum, item) => sum + (item.task.estimatedMinutes || 0),
    0
  );
  const capacityPercent = Math.min(100, (totalMinutes / CAPACITY_MINUTES) * 100);
  const isOverCapacity = totalMinutes > CAPACITY_MINUTES;
  const unplanned = dueTodayTasks.filter(({ task }) => !plannedIds.has(task.id));

  return (
    <>
      {showPicker && (
        <TaskPickerModal
          state={state}
          currentPlanIds={currentPlanIds}
          onAdd={handleAddToPlan}
          onClose={() => setShowPicker(false)}
        />
      )}

      <div className="p-6 max-w-5xl w-full mx-auto">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-neutral-100">
            Today's Focus
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            {/* Manual add button */}
            <button
              onClick={() => setShowPicker(true)}
              className="focus-ring flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg
                bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700
                text-slate-700 dark:text-neutral-200 transition-colors shadow-sm"
            >
              <Plus size={16} />
              Add task
            </button>
            {/* Auto-plan button */}
            <button
              onClick={handleAutoPlan}
              className="focus-ring flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg
                bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
            >
              <ListChecks size={16} />
              {plan ? 'Re-plan my day' : 'Plan my day'}
            </button>
          </div>
        </div>

        {/* ── Daily capacity meter ── */}
        <div className="card p-4 mb-6">
          <div className="flex justify-between items-end mb-2">
            <div>
              <h3 className="text-sm font-medium text-slate-700 dark:text-neutral-300">
                Daily Capacity{' '}
                {plan && (
                  <span className="text-slate-400 dark:text-neutral-500 font-normal">(planned)</span>
                )}
              </h3>
              <p className="text-xs text-slate-400 dark:text-neutral-500">6 hours max recommended</p>
            </div>
            <div
              className={`text-sm font-semibold tabular-nums ${
                isOverCapacity ? 'text-red-400' : 'text-slate-700 dark:text-neutral-300'
              }`}
            >
              {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m / 6h
            </div>
          </div>
          <div className="h-2 w-full bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isOverCapacity ? 'bg-red-500' : 'bg-blue-600'}`}
              style={{ width: `${capacityPercent}%` }}
            />
          </div>
          {isOverCapacity && (
            <p className="text-xs text-red-400 mt-2">
              Over capacity — consider deferring some tasks.
            </p>
          )}
        </div>

        {/* ── Task list ── */}
        <div className="card p-6">
          {plan && plannedItems.length === 0 && unplanned.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-neutral-500">
              <ListChecks size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nothing planned.</p>
              <p className="text-xs mt-1">Click "Plan my day" or "+ Add task" to build your queue.</p>
            </div>
          ) : !plan && dueTodayTasks.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-neutral-500">
              <ListChecks size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No tasks due today.</p>
              <p className="text-xs mt-1">Use "+ Add task" to manually queue any task.</p>
            </div>
          ) : (
            <>
              {/* Planned items */}
              {plan && plannedItems.length > 0 && (
                <>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-neutral-500 mb-3">
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
                              className="p-1 rounded text-slate-400 dark:text-neutral-600
                                hover:text-slate-700 dark:hover:text-neutral-300
                                disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              onClick={() => moveInPlan(index, 1)}
                              disabled={index === plannedItems.length - 1}
                              aria-label="Move task down in plan"
                              className="p-1 rounded text-slate-400 dark:text-neutral-600
                                hover:text-slate-700 dark:hover:text-neutral-300
                                disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <ArrowDown size={13} />
                            </button>
                            <button
                              onClick={() =>
                                dispatch({ type: 'REMOVE_FROM_PLAN', payload: { taskId: item.task.id } })
                              }
                              aria-label="Remove from plan"
                              className="p-1 rounded text-slate-400 dark:text-neutral-600
                                hover:text-red-400 transition-colors"
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
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-neutral-500 mb-3">
                    {plan ? 'Not in plan (due today or overdue)' : 'Due today or overdue'}
                  </h3>
                  <ul className="flex flex-col gap-3">
                    {unplanned.map((item) => (
                      <li key={item.task.id} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 dark:text-neutral-500 uppercase tracking-wider ml-1">
                            From: {item.goalTitle}
                          </span>
                          <button
                            onClick={() => handleAddToPlan(item.task.id)}
                            className="text-[10px] font-medium text-blue-500 hover:text-blue-400
                              flex items-center gap-1 transition-colors shrink-0"
                          >
                            <Plus size={10} /> Add to plan
                          </button>
                        </div>
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
    </>
  );
}
