import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Flag, Target, Plus, X } from 'lucide-react';
import type { AppState, AppAction, Priority } from '../types';
import { buildMonthGrid, collectCalendarEvents, sortCalendarEvents, todayISO, generateId } from '../utils';
import type { CalendarEvent } from '../utils';

interface CalendarViewProps {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500',
};

const MAX_CHIPS = 3;

// ── Inline task creation form shown in the day detail panel ──────────────────
function AddTaskForm({
  date,
  state,
  dispatch,
  onClose,
}: {
  date: string;
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const [goalId, setGoalId] = useState(
    state.activeGoalId ?? state.goals[0]?.id ?? ''
  );
  const [priority, setPriority] = useState<Priority>('medium');

  function handleSubmit() {
    if (!text.trim() || !goalId) return;
    dispatch({
      type: 'ADD_TASK',
      payload: {
        goalId,
        task: {
          id: generateId(),
          text: text.trim(),
          completed: false,
          priority,
          dueDate: date,
          subtasks: [],
          createdAt: new Date().toISOString(),
          completedAt: null,
          estimatedMinutes: null,
          actualMinutes: 0,
          recurrence: null,
          blockedBy: null,
        },
      },
    });
    setText('');
    onClose();
  }

  if (state.goals.length === 0) {
    return (
      <p className="text-xs text-slate-400 dark:text-neutral-500 text-center py-3">
        Add a goal first to create tasks.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 pt-3 pb-1">
      <input
        autoFocus
        type="text"
        placeholder="Task name…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
          if (e.key === 'Escape') onClose();
        }}
        className="w-full text-xs bg-slate-50 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200
          placeholder-slate-400 dark:placeholder-neutral-500 rounded-lg px-3 py-2 outline-none
          border border-slate-200 dark:border-neutral-700 focus:border-blue-500 transition-colors"
      />
      <div className="flex gap-2">
        <select
          value={goalId}
          onChange={(e) => setGoalId(e.target.value)}
          className="flex-1 min-w-0 text-xs bg-slate-50 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300
            rounded-lg px-2 py-1.5 outline-none border border-slate-200 dark:border-neutral-700
            focus:border-blue-500 cursor-pointer truncate"
        >
          {state.goals.map((g) => (
            <option key={g.id} value={g.id}>{g.title}</option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className="text-xs bg-slate-50 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300
            rounded-lg px-2 py-1.5 outline-none border border-slate-200 dark:border-neutral-700
            focus:border-blue-500 cursor-pointer"
        >
          <option value="high">🔴 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-40
            disabled:cursor-not-allowed text-white rounded-lg py-1.5 font-medium transition-colors"
        >
          Add task
        </button>
        <button
          onClick={onClose}
          className="text-xs bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200
            dark:hover:bg-neutral-700 text-slate-500 dark:text-neutral-400 rounded-lg px-3 py-1.5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Compact event chip shown inside grid cells ────────────────────────────────
function EventChip({
  event,
  onNavigate,
  onToggle,
}: {
  event: CalendarEvent;
  onNavigate: (e: React.MouseEvent) => void;
  onToggle?: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className={`flex items-center gap-1 px-1 py-px rounded text-[11px] leading-snug transition-colors group/chip ${
        event.kind === 'goal'
          ? 'bg-blue-600/10 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300'
          : event.kind === 'milestone'
          ? 'bg-violet-500/10 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300'
          : event.completed
          ? 'bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-600'
          : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300'
      }`}
    >
      {/* Completion checkbox on task chips */}
      {event.kind === 'task' && onToggle && (
        <button
          onClick={onToggle}
          aria-label={event.completed ? 'Mark incomplete' : 'Mark complete'}
          className={`shrink-0 w-3 h-3 rounded border flex items-center justify-center transition-all ${
            event.completed
              ? 'bg-blue-600 border-blue-600'
              : 'border-slate-400 dark:border-neutral-500 hover:border-blue-500'
          }`}
        >
          {event.completed && (
            <svg width="6" height="6" viewBox="0 0 8 8" fill="none">
              <path d="M1 4L3 6L7 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </button>
      )}
      {event.kind === 'task' && !event.completed && !onToggle && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[event.priority ?? 'low']}`} />
      )}
      {event.kind === 'goal' && <Target size={9} className="shrink-0" aria-hidden />}
      {event.kind === 'milestone' && <Flag size={9} className="shrink-0" aria-hidden />}
      <button
        onClick={onNavigate}
        title={`${event.goalTitle}: ${event.title}`}
        className={`truncate text-left flex-1 min-w-0 focus:outline-none hover:underline ${
          event.completed ? 'line-through' : ''
        }`}
      >
        {event.title}
      </button>
    </div>
  );
}

// ── Main calendar view ────────────────────────────────────────────────────────
export function CalendarView({ state, dispatch }: CalendarViewProps) {
  // todayISO() uses local date — safe from UTC mismatch
  const todayStr = todayISO();

  // useMemo keyed on todayStr so it refreshes if the date rolls over midnight
  const today = useMemo(() => new Date(), [todayStr]); // eslint-disable-line react-hooks/exhaustive-deps

  const [cursor, setCursor] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);

  // Recompute grid when month changes OR when today's date changes
  const grid = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month, today),
    [cursor.year, cursor.month, todayStr] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Recompute events when state changes OR when today rolls over
  const eventsByDate = useMemo(
    () => collectCalendarEvents(state, today),
    [state, todayStr] // eslint-disable-line react-hooks/exhaustive-deps
  );

  function navigate(dir: -1 | 1) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + dir, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
    setSelectedDate(null);
    setShowAddTask(false);
  }

  function selectDay(date: string) {
    setSelectedDate((prev) => (prev === date ? null : date));
    setShowAddTask(false);
  }

  function navigateToGoal(event: CalendarEvent) {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: { view: 'goal' } });
    dispatch({ type: 'SET_ACTIVE_GOAL', payload: { id: event.goalId } });
  }

  function toggleTask(event: CalendarEvent, e: React.MouseEvent) {
    e.stopPropagation();
    dispatch({ type: 'TOGGLE_TASK', payload: { goalId: event.goalId, taskId: event.id } });
  }

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const selectedEvents =
    selectedDate && eventsByDate.has(selectedDate)
      ? sortCalendarEvents(eventsByDate.get(selectedDate)!)
      : [];

  const selectedDateLabel = selectedDate
    ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const empty = state.goals.length === 0;

  return (
    <div className="p-4 md:p-6 max-w-6xl w-full mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5 gap-2">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
          <CalendarDays size={22} className="text-blue-600 shrink-0" aria-hidden />
          <span className="truncate">{monthLabel}</span>
        </h2>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => navigate(-1)}
            aria-label="Previous month"
            className="icon-btn w-8 h-8"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => {
              setCursor({ year: today.getFullYear(), month: today.getMonth() });
              setSelectedDate(null);
              setShowAddTask(false);
            }}
            className="focus-ring text-xs font-medium px-3 py-1.5 rounded-lg
              bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300
              hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => navigate(1)}
            aria-label="Next month"
            className="icon-btn w-8 h-8"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {empty ? (
        <div className="card p-10 text-center text-slate-400 dark:text-neutral-500">
          <CalendarDays size={32} className="mx-auto mb-3 opacity-40" aria-hidden />
          <p className="text-sm font-medium">Your calendar is empty.</p>
          <p className="text-xs mt-1">Add a goal in the sidebar — its deadline will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* ── Month grid ── */}
          <div className="flex-1 min-w-0">
            {/* Weekday row */}
            <div className="grid grid-cols-7 mb-1 px-px">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="text-center text-[10px] md:text-[11px] font-semibold
                    uppercase tracking-widest text-slate-400 dark:text-neutral-600 py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day cell grid — mosaic style like Google Calendar */}
            <div
              className="grid grid-cols-7 gap-px
                bg-slate-200 dark:bg-neutral-800
                border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden"
            >
              {grid.map((day) => {
                const dayEvents = eventsByDate.get(day.date);
                const all = dayEvents ? sortCalendarEvents(dayEvents) : [];
                const visible = all.slice(0, MAX_CHIPS);
                const extra = all.length - visible.length;
                const hasOverdue = dayEvents && dayEvents.overdue.length > 0;
                const isSelected = selectedDate === day.date;
                const isToday = day.isToday;
                const isCurrentMonth = day.inMonth;

                return (
                  <button
                    key={day.date}
                    onClick={() => selectDay(day.date)}
                    aria-label={`${day.date}${all.length > 0 ? `, ${all.length} events` : ''}`}
                    aria-pressed={isSelected}
                    className={`focus-ring relative flex flex-col items-stretch gap-px
                      min-h-[72px] md:min-h-[96px] p-1 md:p-1.5 text-left transition-colors
                      ${isCurrentMonth
                        ? 'bg-white dark:bg-neutral-900'
                        : 'bg-slate-50 dark:bg-neutral-950'
                      }
                      ${isSelected
                        ? 'ring-inset ring-2 ring-blue-500 dark:ring-blue-400 bg-blue-50 dark:bg-blue-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-neutral-800'
                      }`}
                  >
                    {/* Day number */}
                    <span
                      className={`text-[11px] md:text-xs font-bold self-start mb-0.5
                        w-6 h-6 flex items-center justify-center rounded-full transition-colors
                        ${isToday
                          ? 'bg-blue-600 text-white'
                          : hasOverdue && isCurrentMonth
                          ? 'text-red-400'
                          : isCurrentMonth
                          ? 'text-slate-700 dark:text-neutral-300'
                          : 'text-slate-300 dark:text-neutral-700'
                        }`}
                    >
                      {day.dayOfMonth}
                    </span>

                    {/* Event chips */}
                    <span className="flex flex-col gap-px overflow-hidden">
                      {visible.map((event) => (
                        <EventChip
                          key={`${event.kind}-${event.id}`}
                          event={event}
                          onNavigate={(e) => { e.stopPropagation(); navigateToGoal(event); }}
                          onToggle={
                            event.kind === 'task'
                              ? (e) => toggleTask(event, e)
                              : undefined
                          }
                        />
                      ))}
                      {extra > 0 && (
                        <span className="text-[10px] text-slate-400 dark:text-neutral-600 px-1 font-medium">
                          +{extra} more
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 px-1">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-neutral-600">
                <Target size={10} className="text-blue-600" /> Goal deadline
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-neutral-600">
                <Flag size={10} className="text-violet-500" /> Milestone
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-neutral-600">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Overdue
              </span>
            </div>
          </div>

          {/* ── Day detail panel ── */}
          {selectedDate !== null && (
            <div className="card p-4 lg:w-80 xl:w-96 shrink-0 self-start sticky top-4">
              {/* Panel header */}
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-neutral-200">
                    {selectedDateLabel}
                  </h3>
                  {selectedDate === todayStr && (
                    <span className="inline-block text-[10px] font-semibold text-blue-500 uppercase tracking-widest mt-0.5">
                      Today
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setShowAddTask((v) => !v)}
                    aria-label="Add task to this date"
                    className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                      showAddTask
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 hover:bg-blue-600 hover:text-white'
                    }`}
                  >
                    <Plus size={12} />
                    Add
                  </button>
                  <button
                    onClick={() => { setSelectedDate(null); setShowAddTask(false); }}
                    aria-label="Close panel"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200
                      hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Add-task form */}
              {showAddTask && (
                <>
                  <div className="h-px bg-slate-100 dark:bg-neutral-800 my-2" />
                  <AddTaskForm
                    date={selectedDate}
                    state={state}
                    dispatch={dispatch}
                    onClose={() => setShowAddTask(false)}
                  />
                </>
              )}

              <div className="h-px bg-slate-100 dark:bg-neutral-800 my-3" />

              {/* Event list */}
              {selectedEvents.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-xs text-slate-400 dark:text-neutral-500">Nothing scheduled.</p>
                  {!showAddTask && (
                    <button
                      onClick={() => setShowAddTask(true)}
                      className="mt-2 text-xs text-blue-500 hover:text-blue-400 transition-colors"
                    >
                      + Create a task for this day
                    </button>
                  )}
                </div>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {selectedEvents.map((event) => (
                    <li key={`${event.kind}-${event.id}`}>
                      <div className="flex items-start gap-2 p-2 rounded-lg
                        bg-slate-50 dark:bg-neutral-800/60
                        hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors">
                        {/* Left icon / completion toggle */}
                        {event.kind === 'task' ? (
                          <button
                            onClick={() =>
                              dispatch({
                                type: 'TOGGLE_TASK',
                                payload: { goalId: event.goalId, taskId: event.id },
                              })
                            }
                            aria-label={event.completed ? 'Mark incomplete' : 'Mark complete'}
                            className={`shrink-0 mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                              event.completed
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-slate-400 dark:border-neutral-500 hover:border-blue-500'
                            }`}
                          >
                            {event.completed && (
                              <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
                                <path d="M1 4L3 6L7 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                            )}
                          </button>
                        ) : event.kind === 'goal' ? (
                          <Target size={14} className="mt-0.5 text-blue-600 shrink-0" aria-hidden />
                        ) : (
                          <Flag size={14} className="mt-0.5 text-violet-500 shrink-0" aria-hidden />
                        )}

                        {/* Title + meta — click to navigate to goal */}
                        <button
                          onClick={() => navigateToGoal(event)}
                          className="flex-1 min-w-0 text-left group/item"
                        >
                          <span
                            className={`block text-xs font-medium truncate group-hover/item:underline ${
                              event.completed
                                ? 'line-through text-slate-400 dark:text-neutral-600'
                                : 'text-slate-700 dark:text-neutral-200'
                            }`}
                          >
                            {event.title}
                          </span>
                          <span className="block text-[10px] text-slate-400 dark:text-neutral-500 truncate mt-px">
                            {event.kind === 'goal'
                              ? 'Goal deadline'
                              : event.kind === 'milestone'
                              ? 'Milestone'
                              : 'Task'}{' '}
                            · {event.goalTitle}
                          </span>
                        </button>

                        {/* Priority dot for tasks */}
                        {event.kind === 'task' && event.priority && (
                          <span
                            className={`shrink-0 mt-1.5 w-2 h-2 rounded-full ${PRIORITY_DOT[event.priority]}`}
                            aria-label={event.priority}
                          />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
