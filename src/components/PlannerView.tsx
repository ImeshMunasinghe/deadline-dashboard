import React, { useMemo, useState } from 'react';
import { CalendarRange, Zap, Clock, Repeat, Trash2, Plus, X, CalendarClock } from 'lucide-react';
import type { AppState, AppAction, Task, Routine } from '../types';
import { computeCatchUp, generateId, todayISO, computeDailyPlan } from '../utils';
import type { PlanCandidate } from '../utils';

interface PlannerViewProps {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const CAPACITY_MINUTES = 360;
const DAYS = 7;

function fmtDay(date: string, opts: Intl.DateTimeFormatOptions): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', opts);
}

function makeTask(text: string, dueDate: string): Task {
  return {
    id: generateId(),
    text,
    completed: false,
    priority: 'medium',
    dueDate,
    subtasks: [],
    createdAt: new Date().toISOString(),
    completedAt: null,
    estimatedMinutes: null,
    actualMinutes: 0,
    recurrence: null,
    blockedBy: null,
  };
}

// ── Weekly planner: multi-day plans, time blocks, catch-up, routines ───────
export function PlannerView({ state, dispatch }: PlannerViewProps) {
  const today = todayISO();

  // Week starting today
  const days = useMemo(() => {
    const list: string[] = [];
    const base = new Date();
    for (let i = 0; i < DAYS; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      list.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    return list;
  }, []);

  const overdueCount = useMemo(
    () => state.goals.flatMap((g) => g.tasks).filter((t) => !t.completed && t.dueDate && t.dueDate.split('T')[0] < today).length,
    [state.goals, today]
  );

  function handleCatchUp() {
    const updates = computeCatchUp(state, new Date());
    updates.forEach((u) => dispatch({ type: 'UPDATE_TASK', payload: { goalId: u.goalId, taskId: u.taskId, updates: { dueDate: u.to } } }));
  }

  // All incomplete tasks for the add-task picker per day
  const availableTasks = useMemo(() => {
    const list: { goalId: string; goalTitle: string; task: Task }[] = [];
    for (const g of state.goals) {
      for (const t of g.tasks) if (!t.completed) list.push({ goalId: g.id, goalTitle: g.title, task: t });
    }
    return list;
  }, [state.goals]);

  // ── Add task to a day ──
  const [pickerDay, setPickerDay] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  function addToPlan(date: string, taskId: string, goalId: string) {
    // Task must be due that day to appear in the plan queue
    dispatch({ type: 'UPDATE_TASK', payload: { goalId, taskId, updates: { dueDate: date } } });
    const existing = state.plans[date]?.taskIds ?? [];
    if (!existing.includes(taskId)) {
      dispatch({ type: 'SET_DAILY_PLAN', payload: { date, taskIds: [...existing, taskId] } });
    }
  }

  function autoPlanDay(date: string) {
    const candidates: PlanCandidate[] = availableTasks.map(({ task }) => ({
      taskId: task.id,
      goalId: '',
      dueDate: date,
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
    const ids = computeDailyPlan(candidates, blocked, CAPACITY_MINUTES).filter((id) =>
      availableTasks.some((a) => a.task.id === id)
    );
    // Ensure each planned task is due that day
    ids.forEach((id) => {
      const item = availableTasks.find((a) => a.task.id === id);
      if (item && item.task.dueDate !== date) {
        dispatch({ type: 'UPDATE_TASK', payload: { goalId: item.goalId, taskId: id, updates: { dueDate: date } } });
      }
    });
    dispatch({ type: 'SET_DAILY_PLAN', payload: { date, taskIds: ids } });
  }

  function removeFromPlan(date: string, taskId: string) {
    const plan = state.plans[date];
    if (!plan) return;
    dispatch({ type: 'SET_DAILY_PLAN', payload: { date, taskIds: plan.taskIds.filter((id) => id !== taskId) } });
  }

  function setStart(date: string, taskId: string, start: string) {
    dispatch({ type: 'SET_PLAN_START', payload: { date, taskId, start } });
  }

  // ── Routines ──
  const [showRoutineForm, setShowRoutineForm] = useState(false);
  const [routineTitle, setRoutineTitle] = useState('');
  const [routineGoalId, setRoutineGoalId] = useState(state.goals[0]?.id ?? '');
  const [routineTexts, setRoutineTexts] = useState('');
  const [routineFrequency, setRoutineFrequency] = useState<Routine['frequency']>('daily');

  function saveRoutine() {
    const texts = routineTexts.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!routineTitle.trim() || !routineGoalId || texts.length === 0) return;
    dispatch({
      type: 'ADD_ROUTINE',
      payload: { routine: { id: generateId(), title: routineTitle.trim(), goalId: routineGoalId, taskTexts: texts, frequency: routineFrequency } },
    });
    setRoutineTitle('');
    setRoutineTexts('');
    setShowRoutineForm(false);
  }

  function isRoutineDue(r: Routine, date: string): boolean {
    if (date < today) return false;
    const day = new Date(date + 'T12:00:00').getDay();
    if (r.frequency === 'daily') return true;
    if (r.frequency === 'weekdays') return day >= 1 && day <= 5;
    return day === 1; // weekly → Monday
  }

  function runRoutine(r: Routine, date: string) {
    const goal = state.goals.find((g) => g.id === r.goalId);
    if (!goal) return;
    const existingTexts = new Set(goal.tasks.filter((t) => t.dueDate === date).map((t) => t.text));
    const newIds: string[] = [];
    r.taskTexts.forEach((text) => {
      if (existingTexts.has(text)) return;
      const task = makeTask(text, date);
      dispatch({ type: 'ADD_TASK', payload: { goalId: r.goalId, task } });
      newIds.push(task.id);
    });
    const plan = state.plans[date];
    dispatch({
      type: 'SET_DAILY_PLAN',
      payload: { date, taskIds: [...(plan?.taskIds ?? []), ...newIds] },
    });
  }

  return (
    <div className="p-6 max-w-6xl w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-2 flex-wrap">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
          <CalendarRange size={22} className="text-blue-600 shrink-0" aria-hidden />
          Weekly Planner
        </h2>
        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <button
              onClick={handleCatchUp}
              className="focus-ring flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg
                bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-sm"
            >
              <Zap size={13} />
              Catch up {overdueCount} overdue
            </button>
          )}
          <button
            onClick={() => setShowRoutineForm((v) => !v)}
            className="focus-ring flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg
              bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700
              text-slate-700 dark:text-neutral-200 transition-colors shadow-sm"
          >
            <Repeat size={13} />
            Routines
          </button>
        </div>
      </div>

      {/* Routine manager */}
      {showRoutineForm && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-neutral-200">Routines</h3>
            <button onClick={() => setShowRoutineForm(false)} aria-label="Close routines" className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200">
              <X size={14} />
            </button>
          </div>

          {state.routines.length > 0 && (
            <ul className="flex flex-col gap-1.5 mb-4">
              {state.routines.map((r) => {
                const goal = state.goals.find((g) => g.id === r.goalId);
                const dueToday = isRoutineDue(r, today);
                return (
                  <li key={r.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-neutral-800/60">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-slate-700 dark:text-neutral-200">{r.title}</span>
                      <span className="text-slate-400 dark:text-neutral-500 ml-2">
                        {r.taskTexts.length} tasks · {r.frequency} · {goal?.title ?? 'goal missing'}
                      </span>
                    </div>
                    <button
                      onClick={() => runRoutine(r, today)}
                      disabled={!dueToday || !goal}
                      className="shrink-0 text-blue-500 hover:text-blue-400 font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Run today
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'DELETE_ROUTINE', payload: { routineId: r.id } })}
                      aria-label={`Delete routine ${r.title}`}
                      className="shrink-0 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Routine name (e.g. Morning setup)"
                value={routineTitle}
                onChange={(e) => setRoutineTitle(e.target.value)}
                className="flex-1 text-xs bg-slate-50 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200
                  rounded-lg px-3 py-2 outline-none border border-slate-200 dark:border-neutral-700 focus:border-blue-500"
              />
              <select
                value={routineFrequency}
                onChange={(e) => setRoutineFrequency(e.target.value as Routine['frequency'])}
                aria-label="Routine frequency"
                className="text-xs bg-slate-50 dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 rounded-lg px-2 outline-none border border-slate-200 dark:border-neutral-700"
              >
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays</option>
                <option value="weekly">Weekly</option>
              </select>
              <select
                value={routineGoalId}
                onChange={(e) => setRoutineGoalId(e.target.value)}
                aria-label="Routine goal"
                className="flex-1 min-w-0 text-xs bg-slate-50 dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 rounded-lg px-2 outline-none border border-slate-200 dark:border-neutral-700"
              >
                {state.goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </div>
            <textarea
              placeholder="One task per line..."
              value={routineTexts}
              onChange={(e) => setRoutineTexts(e.target.value)}
              rows={3}
              className="text-xs bg-slate-50 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200
                rounded-lg px-3 py-2 outline-none border border-slate-200 dark:border-neutral-700 focus:border-blue-500 resize-y"
            />
            <button
              onClick={saveRoutine}
              disabled={!routineTitle.trim() || !routineTexts.trim() || !routineGoalId}
              className="self-start text-xs font-medium px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700
                text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={12} className="inline mr-1 -mt-0.5" />
              Save routine
            </button>
          </div>
        </div>
      )}

      {/* Week columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {days.map((date) => {
          const plan = state.plans[date];
          const taskMap = new Map<string, { task: Task; goalId: string; goalTitle: string }>();
          availableTasks.forEach((a) => taskMap.set(a.task.id, a));
          const items = (plan?.taskIds ?? [])
            .map((id) => taskMap.get(id))
            .filter((x): x is { task: Task; goalId: string; goalTitle: string } => !!x);
          const totalMinutes = items.reduce((s, i) => s + (i.task.estimatedMinutes ?? 0), 0);

          return (
            <div
              key={date}
              className={`card p-3 flex flex-col gap-2 ${date === today ? 'ring-1 ring-blue-400' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-bold ${date === today ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-neutral-200'}`}>
                    {date === today ? 'Today' : fmtDay(date, { weekday: 'short' })}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-neutral-500">{fmtDay(date, { month: 'short', day: 'numeric' })}</p>
                </div>
                <button
                  onClick={() => autoPlanDay(date)}
                  title="Auto-plan this day"
                  aria-label={`Auto-plan ${date}`}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <Zap size={13} />
                </button>
              </div>

              <ul className="flex flex-col gap-1.5 min-h-[40px]">
                {items.length === 0 && (
                  <li className="text-[11px] text-slate-300 dark:text-neutral-700 italic px-1">Nothing planned</li>
                )}
                {items.map(({ task, goalTitle }) => (
                  <li key={task.id} className="flex flex-col gap-1 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-neutral-800/60">
                    <div className="flex items-center gap-1.5">
                      <Clock size={10} className="text-slate-400 shrink-0" aria-hidden />
                      <input
                        type="time"
                        value={plan?.starts?.[task.id] ?? ''}
                        onChange={(e) => setStart(date, task.id, e.target.value)}
                        aria-label={`Start time for ${task.text}`}
                        className="text-[10px] bg-transparent text-slate-500 dark:text-neutral-400 outline-none w-[72px]"
                      />
                      <span className="flex-1 min-w-0 text-[11px] font-medium text-slate-700 dark:text-neutral-200 truncate">
                        {task.text}
                      </span>
                      <button
                        onClick={() => removeFromPlan(date, task.id)}
                        aria-label={`Remove ${task.text} from plan`}
                        className="text-slate-300 dark:text-neutral-600 hover:text-red-400 shrink-0"
                      >
                        <X size={11} />
                      </button>
                    </div>
                    <p className="text-[9px] text-slate-400 dark:text-neutral-600 pl-4">{goalTitle}</p>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between mt-auto pt-1">
                <span className={`text-[10px] font-medium ${totalMinutes > CAPACITY_MINUTES ? 'text-red-400' : 'text-slate-400 dark:text-neutral-600'}`}>
                  {totalMinutes > 0 ? `${Math.round(totalMinutes / 60)}h planned` : ''}
                </span>
                <button
                  onClick={() => { setPickerDay(pickerDay === date ? null : date); setPickerSearch(''); }}
                  className="text-[10px] font-medium text-blue-500 hover:text-blue-400 flex items-center gap-1"
                >
                  <Plus size={10} /> Add
                </button>
              </div>

              {/* Inline task picker */}
              {pickerDay === date && (
                <div className="border-t border-slate-100 dark:border-neutral-800 pt-2">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search tasks..."
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    className="w-full text-[11px] bg-slate-50 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200
                      rounded-lg px-2 py-1.5 mb-1.5 outline-none border border-slate-200 dark:border-neutral-700 focus:border-blue-500"
                  />
                  <ul className="max-h-40 overflow-y-auto flex flex-col gap-0.5">
                    {availableTasks
                      .filter((a) => a.task.text.toLowerCase().includes(pickerSearch.toLowerCase()))
                      .slice(0, 12)
                      .map((a) => (
                        <li key={a.task.id}>
                          <button
                            onClick={() => { addToPlan(date, a.task.id, a.goalId); setPickerDay(null); }}
                            className="w-full text-left text-[11px] px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/30
                              text-slate-600 dark:text-neutral-300 truncate"
                          >
                            {a.task.text}
                            <span className="text-slate-400 dark:text-neutral-600 ml-1">· {a.goalTitle}</span>
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-neutral-600">
        <CalendarClock size={11} />
        Set a start time on any task to time-block your day. Times are exported in the ICS feed.
      </p>
    </div>
  );
}
