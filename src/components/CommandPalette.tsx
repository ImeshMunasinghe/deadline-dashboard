import React, { useEffect, useMemo, useState } from 'react';
import { Search, CalendarDays, Target, ListTodo, SunMedium, BarChart2, GanttChartSquare, Flame } from 'lucide-react';
import type { AppState, AppAction, ViewType } from '../types';

interface CommandPaletteProps {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  onClose: () => void;
  onFocusMode: () => void;
}

const ACTIONS: { id: string; label: string; icon: typeof CalendarDays; view?: ViewType }[] = [
  { id: 'calendar', label: 'Go to Calendar', icon: CalendarDays, view: 'calendar' },
  { id: 'today', label: 'Go to Today', icon: SunMedium, view: 'today' },
  { id: 'planner', label: 'Go to Weekly Planner', icon: GanttChartSquare, view: 'planner' },
  { id: 'timeline', label: 'Go to Timeline', icon: CalendarDays, view: 'timeline' },
  { id: 'analytics', label: 'Go to Analytics', icon: BarChart2, view: 'analytics' },
  { id: 'inbox', label: 'Go to Inbox', icon: ListTodo, view: 'inbox' },
];

// ── Ctrl+K command palette: quick navigation + actions ────────────────────
export function CommandPalette({ state, dispatch, onClose, onFocusMode }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = React.createRef<HTMLInputElement>();
  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const q = query.toLowerCase().trim();
  const actionResults = ACTIONS.filter(
    (a) => !q || a.label.toLowerCase().includes(q)
  ).slice(0, 8);

  const goalResults = useMemo(
    () => state.goals.filter((g) => !q || g.title.toLowerCase().includes(q)).slice(0, 8),
    [state.goals, q]
  );

  const total = actionResults.length + goalResults.length;

  function runView(view: ViewType) {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: { view } });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[95] flex items-start justify-center pt-[10%]">
      <div className="card w-full max-w-lg p-0 overflow-hidden shadow-2xl">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200 dark:border-neutral-700">
          <Search size={15} className="text-slate-400 shrink-0" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or goal..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-neutral-200 outline-none placeholder-slate-400 dark:placeholder-neutral-500"
          />
          <span className="text-[10px] text-slate-400 dark:text-neutral-600 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-800">Esc</span>
        </div>

        {total === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400 dark:text-neutral-500">No matches.</p>
        ) : (
          <div className="max-h-72 overflow-y-auto py-1">
            {actionResults.length > 0 && (
              <>
                <div className="px-3 pt-1.5 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-neutral-500">Navigate</div>
                {actionResults.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => runView(a.view!)}
                    className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-lg
                      text-sm text-slate-700 dark:text-neutral-200 transition-colors"
                  >
                    <a.icon size={15} className="shrink-0 text-slate-400" aria-hidden />
                    <span className="flex-1">{a.label}</span>
                  </button>
                ))}
              </>
            )}

            {goalResults.length > 0 && (
              <>
                <div className="px-3 pt-1.5 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-neutral-500">Goals</div>
                {goalResults.map((g) => {
                  const completed = g.tasks.filter((t) => t.completed).length;
                  const total = g.tasks.length;
                  return (
                    <button
                      key={g.id}
                      onClick={() => {
                        dispatch({ type: 'SET_ACTIVE_VIEW', payload: { view: 'goal' } });
                        dispatch({ type: 'SET_ACTIVE_GOAL', payload: { id: g.id } });
                        onClose();
                      }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-lg
                        text-sm text-slate-700 dark:text-neutral-200 transition-colors"
                    >
                      <Target size={15} className="shrink-0 text-slate-400" aria-hidden />
                      <span className="flex-1 truncate">{g.title}</span>
                      {total > 0 && <span className="text-[10px] text-slate-400 dark:text-neutral-500">{completed}/{total}</span>}
                    </button>
                  );
                })}
              </>
            )}

            {!q && (
              <>
                <div className="px-3 pt-1.5 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-neutral-500">Tools</div>
                <button
                  onClick={() => { onFocusMode(); onClose(); }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-lg text-sm text-slate-700 dark:text-neutral-200"
                >
                  <Flame size={15} className="shrink-0 text-slate-400" aria-hidden />
                  <span className="flex-1">Start Focus Mode</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}