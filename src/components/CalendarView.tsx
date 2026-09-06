import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Flag, Target, CircleCheck } from 'lucide-react';
import type { AppState, AppAction } from '../types';
import { buildMonthGrid, collectCalendarEvents, sortCalendarEvents } from '../utils';
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

// Max chips shown per day cell before collapsing into "+N more"
const MAX_CHIPS = 3;

function EventChip({ event, onClick }: { event: CalendarEvent; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      title={`${event.goalTitle}: ${event.title}`}
      className={`focus-ring w-full flex items-center gap-1 text-left px-1.5 py-0.5 rounded-md text-[11px] leading-tight transition-colors truncate ${
        event.kind === 'goal'
          ? 'bg-blue-600/10 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-600/20 dark:hover:bg-blue-500/25 font-medium'
          : event.kind === 'milestone'
          ? 'bg-violet-500/10 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-500/20'
          : event.completed
          ? 'bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-600 line-through hover:bg-slate-200 dark:hover:bg-neutral-700'
          : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700'
      }`}
    >
      {event.kind === 'task' && !event.completed && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[event.priority ?? 'low']}`} aria-hidden />
      )}
      {event.kind === 'goal' && <Target size={10} className="shrink-0" aria-hidden />}
      {event.kind === 'milestone' && <Flag size={10} className="shrink-0" aria-hidden />}
      <span className="truncate">{event.title}</span>
    </button>
  );
}

export function CalendarView({ state, dispatch }: CalendarViewProps) {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month, today), [cursor.year, cursor.month]); // eslint-disable-line react-hooks/exhaustive-deps

  const eventsByDate = useMemo(() => collectCalendarEvents(state, today), [state]); // eslint-disable-line react-hooks/exhaustive-deps

  function navigate(direction: -1 | 1) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + direction, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
    setSelectedDate(null);
  }

  function openEvent(event: CalendarEvent) {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: { view: 'goal' } });
    dispatch({ type: 'SET_ACTIVE_GOAL', payload: { id: event.goalId } });
  }

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const selectedEvents = selectedDate && eventsByDate.has(selectedDate)
    ? sortCalendarEvents(eventsByDate.get(selectedDate)!)
    : [];

  const empty = state.goals.length === 0;

  return (
    <div className="p-4 md:p-6 max-w-6xl w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
          <CalendarDays size={22} className="text-blue-600 shrink-0" aria-hidden />
          <span className="truncate">{monthLabel}</span>
        </h2>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => navigate(-1)} aria-label="Previous month" className="icon-btn w-8 h-8">
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCursor({ year: today.getFullYear(), month: today.getMonth() })}
            className="focus-ring text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors"
          >
            Today
          </button>
          <button onClick={() => navigate(1)} aria-label="Next month" className="icon-btn w-8 h-8">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {empty ? (
        <div className="card p-10 text-center text-slate-400 dark:text-neutral-500">
          <CalendarDays size={32} className="mx-auto mb-3 opacity-50" aria-hidden />
          <p className="text-sm">Your calendar is empty.</p>
          <p className="text-xs mt-1">Add a goal in the sidebar to see its deadline here.</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Month grid */}
          <div className="card p-2 md:p-3 flex-1 min-w-0">
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-[10px] md:text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-neutral-600 py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {grid.map((day) => {
                const dayEvents = eventsByDate.get(day.date);
                const all = dayEvents ? sortCalendarEvents(dayEvents) : [];
                const visible = all.slice(0, MAX_CHIPS);
                const extra = all.length - visible.length;
                const hasOverdue = dayEvents && dayEvents.overdue.length > 0;
                const isSelected = selectedDate === day.date;

                return (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDate(day.date)}
                    aria-label={`${day.date}, ${all.length} items`}
                    className={`focus-ring flex flex-col items-stretch gap-0.5 min-h-[64px] md:min-h-[84px] p-1 md:p-1.5 rounded-lg text-left transition-colors ${
                      !day.inMonth
                        ? 'opacity-40'
                        : isSelected
                        ? 'bg-blue-600/10 dark:bg-blue-500/15 ring-1 ring-blue-500'
                        : 'hover:bg-slate-100 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    <span
                      className={`text-[11px] md:text-xs font-semibold self-start w-5 h-5 flex items-center justify-center rounded-full ${
                        day.isToday
                          ? 'bg-blue-600 text-white'
                          : hasOverdue
                          ? 'text-red-400'
                          : 'text-slate-500 dark:text-neutral-400'
                      }`}
                    >
                      {day.dayOfMonth}
                    </span>
                    <span className="flex flex-col gap-0.5 overflow-hidden">
                      {visible.map((event) => (
                        <EventChip
                          key={`${event.kind}-${event.id}`}
                          event={event}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEvent(event);
                          }}
                        />
                      ))}
                      {extra > 0 && (
                        <span className="text-[10px] text-slate-400 dark:text-neutral-600 px-1">
                          +{extra} more
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day detail panel */}
          {selectedDate !== null && (
            <div className="card p-4 lg:w-72 shrink-0 self-start">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-neutral-200 mb-3">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
              {selectedEvents.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-neutral-500 py-4 text-center">
                  Nothing scheduled for this day.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {selectedEvents.map((event) => (
                    <li key={`${event.kind}-${event.id}`}>
                      <button
                        onClick={() => openEvent(event)}
                        className="focus-ring w-full flex items-start gap-2 text-left p-2 rounded-lg bg-slate-50 dark:bg-neutral-800/60 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        {event.kind === 'goal' ? (
                          <Target size={14} className="mt-0.5 text-blue-600 shrink-0" aria-hidden />
                        ) : event.kind === 'milestone' ? (
                          <Flag size={14} className="mt-0.5 text-violet-500 shrink-0" aria-hidden />
                        ) : event.completed ? (
                          <CircleCheck size={14} className="mt-0.5 text-slate-400 shrink-0" aria-hidden />
                        ) : (
                          <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[event.priority ?? 'low']}`} aria-hidden />
                        )}
                        <span className="min-w-0">
                          <span className={`block text-xs font-medium truncate ${event.completed ? 'line-through text-slate-400 dark:text-neutral-600' : 'text-slate-700 dark:text-neutral-200'}`}>
                            {event.title}
                          </span>
                          <span className="block text-[10px] text-slate-400 dark:text-neutral-500 truncate">
                            {event.kind === 'goal' ? 'Goal deadline' : event.kind === 'milestone' ? 'Milestone' : 'Task'} · {event.goalTitle}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[10px] text-slate-400 dark:text-neutral-600 mt-3">
                Click an item to open its goal.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
