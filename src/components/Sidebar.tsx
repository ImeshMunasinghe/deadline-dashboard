import React, { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  Trash2,
  ChevronRight,
  Download,
  Upload,
  Menu,
  X,
  Sun,
  Moon,
  Calendar,
  CalendarDays,
  Inbox,
  CalendarRange,
  GanttChartSquare,
  BarChart2,
  BookOpen,
  Bell
} from 'lucide-react';
import type { Goal, AppState, GoalCategory } from '../types';
import type { AppAction } from '../types';
import { generateId, exportStateAsJSON, parseImportedState, formatDate, GOAL_COLOR_PALETTE } from '../utils';
import { PaceBadge } from './CountdownCard';

interface SidebarProps {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  onOpenReflection: () => void;
}

// ── Fixed bottom-left toolbar ──────────────────────────────────────────────
function reminderTooltip(state: AppState): string {
  if (!('Notification' in window)) {
    return 'Notifications not supported in this browser';
  }
  const perm = Notification.permission;
  const lead = state.reminderLeadHours;
  const leadLabel = lead === 1 ? '1 hour' : `${lead} hours`;
  if (state.remindersEnabled) {
    if (perm === 'granted') {
      return `Reminders on (alerts ${leadLabel} before deadlines) — click to disable`;
    }
    if (perm === 'denied') {
      return `Reminders on but browser notifications blocked — using in-app toasts (${leadLabel} before)`;
    }
    return `Reminders on — click to disable (grant permission for native alerts)`;
  }
  return 'Reminders off — click to enable';
}

function LeadHoursControl({ state, dispatch }: { state: AppState; dispatch: React.Dispatch<AppAction> }) {
  return (
    <label
      className="icon-btn w-9 h-9 flex-col gap-0 cursor-pointer"
      title={`Remind me this many hours before a deadline (currently ${state.reminderLeadHours})`}
      aria-label="Set reminder lead time in hours"
    >
      <input
        type="number"
        min={1}
        max={168}
        value={state.reminderLeadHours}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v) && v > 0) {
            dispatch({ type: 'SET_REMINDER_LEAD', payload: { hours: v } });
          }
        }}
        className="w-7 text-center text-[10px] bg-transparent outline-none text-slate-600 dark:text-neutral-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="text-[8px] leading-none text-slate-400 dark:text-neutral-500 -mt-0.5">hrs</span>
    </label>
  );
}

// Chromium fires beforeinstallprompt when the app meets installability criteria.
// iOS Safari never fires it — there the user must use Share > Add to Home Screen.
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

const IS_IOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function BottomToolbar({ state, dispatch }: {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}) {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [installEvt, setInstallEvt] = useState<InstallPromptEvent | null>(null);
  const [installHelp, setInstallHelp] = useState(false);
  const [isStandalone] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches
    || 'standalone' in window.navigator
  );

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as InstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const parsed = parseImportedState(text);
        if (parsed) dispatch({ type: 'LOAD_STATE', payload: parsed });
        else alert('Invalid backup file.');
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function handleInstall() {
    if (installEvt) {
      void installEvt.prompt();
      installEvt.userChoice.finally(() => setInstallEvt(null));
    } else {
      // No native prompt (e.g. iOS Safari, or Chrome not ready yet) — show manual steps
      setInstallHelp(true);
    }
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex max-w-[calc(100vw-2rem)] flex-row flex-wrap gap-2">
      <button
        onClick={() => setIsDark((d) => !d)}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className="icon-btn w-9 h-9"
      >
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </button>
      <button
        onClick={() => exportStateAsJSON(state)}
        title="Export data"
        className="icon-btn w-9 h-9"
      >
        <Download size={15} />
      </button>
      <button
        onClick={handleImport}
        title="Import data"
        className="icon-btn w-9 h-9"
      >
        <Upload size={15} />
      </button>
      <button
        onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: { view: 'timeline' } })}
        title="Goal timeline"
        aria-label="Open goal timeline"
        className="icon-btn w-9 h-9"
      >
        <GanttChartSquare size={15} />
      </button>
      <button
        onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: { view: 'planner' } })}
        title="Weekly planner"
        aria-label="Open weekly planner"
        className="icon-btn w-9 h-9"
      >
        <CalendarRange size={15} />
      </button>
      {!isStandalone && (
        <button
          onClick={handleInstall}
          title={installEvt ? 'Install as an app' : 'How to install this app'}
          aria-label="Install as an app"
          className="icon-btn w-9 h-9"
        >
          <Download size={15} />
        </button>
      )}
      <button
        onClick={() => {
          if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
          }
          dispatch({ type: 'TOGGLE_REMINDERS' });
        }}
        title={reminderTooltip(state)}
        aria-label="Toggle deadline reminders"
        className={`icon-btn w-9 h-9 ${state.remindersEnabled ? 'text-blue-600 dark:text-blue-400' : ''}`}
      >
        <Bell size={15} />
      </button>
      <LeadHoursControl state={state} dispatch={dispatch} />

      {installHelp && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setInstallHelp(false)}
        >
          <div
            className="floating-surface w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-slate-800 dark:text-neutral-100">
              Install Deadline Dashboard
            </h3>
            {IS_IOS ? (
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-neutral-300">
                <li>Open this page in Safari</li>
                <li>Tap the Share button</li>
                <li>Choose Add to Home Screen</li>
              </ol>
            ) : (
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-neutral-300">
                <li>Open the browser menu (three dots)</li>
                <li>Tap Install app or Add to Home Screen</li>
              </ol>
            )}
            <button
              onClick={() => setInstallHelp(false)}
              className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main sidebar ───────────────────────────────────────────────────────────
export function Sidebar({ state, dispatch, onOpenReflection }: SidebarProps) {
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newCategory, setNewCategory] = useState<GoalCategory>('Work');
  const [newColor, setNewColor] = useState<string>(
    GOAL_COLOR_PALETTE[state.goals.length % GOAL_COLOR_PALETTE.length]
  );
  const [isOpen, setIsOpen] = useState(false);

  function handleAddGoal() {
    if (!newTitle.trim() || !newDate) return;
    const timeString = newTime || '00:00';
    const localDateTimeStr = `${newDate}T${timeString}`;
    const dateObj = new Date(localDateTimeStr);
    const targetDateISO = isNaN(dateObj.getTime()) ? new Date(newDate).toISOString() : dateObj.toISOString();

    const goal: Goal = {
      id: generateId(),
      title: newTitle.trim(),
      targetDate: targetDateISO,
      tasks: [],
      notes: '',
      milestones: [],
      createdAt: new Date().toISOString(),
      category: newCategory,
      color: newColor,
    };
    dispatch({ type: 'ADD_GOAL', payload: goal });
    setNewTitle('');
    setNewDate('');
    setNewTime('');
    setNewCategory('Work');
    setNewColor(GOAL_COLOR_PALETTE[(state.goals.length + 1) % GOAL_COLOR_PALETTE.length]);
    setShowNewGoal(false);
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-neutral-900 rounded-lg border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-200 shadow"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`
        fixed md:static inset-y-0 left-0 z-40
        flex flex-col w-64 bg-slate-50 dark:bg-neutral-950
        border-r border-slate-200 dark:border-neutral-800
        p-4 gap-3
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        overflow-y-auto
      `}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-1 py-2 mb-2 md:mt-0 mt-10">
          <Target size={20} className="text-blue-600" />
          <span className="text-sm font-semibold tracking-widest text-slate-800 dark:text-neutral-200 uppercase">
            Deadline
          </span>
        </div>

        {/* Primary Navigation */}
        <nav className="flex flex-col gap-1">
          {[
            { view: 'calendar' as const, icon: <CalendarDays size={15} />, label: 'Calendar' },
            { view: 'today' as const, icon: <Calendar size={15} />, label: 'Today' },
            { view: 'planner' as const, icon: <CalendarRange size={15} />, label: 'Planner' },
            { view: 'timeline' as const, icon: <GanttChartSquare size={15} />, label: 'Timeline' },
            { view: 'analytics' as const, icon: <BarChart2 size={15} />, label: 'Analytics' },
            { view: 'importexport' as const, icon: <Download size={15} />, label: 'Import/Export' },
            { view: 'inbox' as const, icon: <Inbox size={15} />, label: 'Inbox', badge: state.inbox?.length },
          ].map(({ view, icon, label, badge }) => (
            <button
              key={view}
              onClick={() => { dispatch({ type: 'SET_ACTIVE_VIEW', payload: { view } }); setIsOpen(false); }}
              className={`flex items-center gap-2 px-2 py-2 rounded-lg text-left text-xs font-medium transition-all ${
                state.activeView === view
                  ? 'bg-blue-600/10 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700/50 text-blue-700 dark:text-blue-300'
                  : 'text-slate-500 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-900 hover:text-slate-800 dark:hover:text-neutral-200'
              }`}
            >
              {icon}
              <span>{label}</span>
              {badge != null && badge > 0 && (
                <span className="ml-auto bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] px-1.5 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
            </button>
          ))}

          {/* Reflect */}
          <button
            onClick={() => {
              dispatch({ type: 'SET_ACTIVE_VIEW', payload: { view: 'analytics' } });
              setIsOpen(false);
              onOpenReflection();
            }}
            className="flex items-center gap-2 px-2 py-2 rounded-lg text-left text-xs font-medium transition-all text-slate-500 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-900 hover:text-slate-800 dark:hover:text-neutral-200"
          >
            <BookOpen size={15} />
            <span>Reflect</span>
            {state.reflections.filter(r => r.content && r.date !== '__trigger__').length > 0 && (
              <span className="ml-auto bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 text-[10px] px-1.5 py-0.5 rounded-full">
                {state.reflections.filter(r => r.content && r.date !== '__trigger__').length}
              </span>
            )}
          </button>
        </nav>

        {/* Divider */}
        <div className="h-px bg-slate-200 dark:bg-neutral-800 mx-1" />

        {/* Goals Section Header */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-semibold tracking-widest text-slate-400 dark:text-neutral-500 uppercase">
            Goals
          </span>
          <button
            onClick={() => setShowNewGoal((v) => !v)}
            aria-label="Add new goal"
            className="text-slate-400 dark:text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* New Goal Form */}
        {showNewGoal && (
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
            <input
              autoFocus
              type="text"
              placeholder="Goal title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddGoal(); }}
              className="w-full text-xs bg-slate-50 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 rounded-lg px-2 py-1.5 outline-none border border-slate-200 dark:border-neutral-700 focus:border-blue-500 dark:focus:border-blue-500"
            />
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 rounded-lg px-2 py-1.5 outline-none border border-slate-200 dark:border-neutral-700 focus:border-blue-500 cursor-pointer"
            />
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              aria-label="Goal target time (optional)"
              className="w-full text-xs bg-slate-50 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 rounded-lg px-2 py-1.5 outline-none border border-slate-200 dark:border-neutral-700 focus:border-blue-500 cursor-pointer"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as GoalCategory)}
              aria-label="Goal category"
              className="w-full text-xs bg-slate-50 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 rounded-lg px-2 py-1.5 outline-none border border-slate-200 dark:border-neutral-700 focus:border-blue-500 cursor-pointer"
            >
              {(['Work', 'Personal', 'Health', 'Learning', 'Other'] as GoalCategory[]).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {/* Color swatches — pastel hint for calendar events */}
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Goal color">
              {GOAL_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={newColor === c}
                  aria-label={`Color ${c}`}
                  onClick={() => setNewColor(c)}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    newColor === c
                      ? 'border-blue-500 ring-2 ring-blue-500/30 scale-110'
                      : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <label
                className="relative w-5 h-5 rounded-full border-2 border-slate-300 dark:border-neutral-600 overflow-hidden cursor-pointer hover:scale-110 transition-all shrink-0"
                title="Custom color"
              >
                <span className="block w-full h-full bg-[conic-gradient(#f87171,#fbbf24,#34d399,#38bdf8,#a78bfa,#f472b6,#f87171)]" />
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label="Custom goal color"
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddGoal}
                className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-1.5 transition-colors font-medium"
              >
                Add
              </button>
              <button
                onClick={() => { setShowNewGoal(false); setNewTitle(''); setNewDate(''); setNewTime(''); setNewCategory('Work'); setNewColor(GOAL_COLOR_PALETTE[state.goals.length % GOAL_COLOR_PALETTE.length]); }}
                className="flex-1 text-xs bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-500 dark:text-neutral-400 rounded-lg py-1.5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Goals List */}
        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto min-h-0">
          {state.goals.length === 0 && (
            <p className="text-xs text-slate-400 dark:text-neutral-600 px-2 mt-2">
              No goals yet. Add one above.
            </p>
          )}
          {state.goals.map((goal) => {
            const isActive = goal.id === state.activeGoalId && state.activeView === 'goal';
            const completed = goal.tasks.filter((t) => t.completed).length;
            const total = goal.tasks.length;
            return (
              <div
                key={goal.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  dispatch({ type: 'SET_ACTIVE_VIEW', payload: { view: 'goal' } });
                  dispatch({ type: 'SET_ACTIVE_GOAL', payload: { id: goal.id } });
                  setIsOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    dispatch({ type: 'SET_ACTIVE_VIEW', payload: { view: 'goal' } });
                    dispatch({ type: 'SET_ACTIVE_GOAL', payload: { id: goal.id } });
                    setIsOpen(false);
                  }
                }}
                className={`focus-ring group flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-all cursor-pointer border ${
                  isActive
                    ? 'border-blue-200 dark:border-blue-700/50 text-blue-700 dark:text-blue-300'
                    : 'border-transparent text-slate-500 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-900 hover:text-slate-800 dark:hover:text-neutral-200'
                }`}
                style={isActive ? { backgroundColor: `${goal.color}1a`, borderColor: `${goal.color}55` } : undefined}
              >
                <ChevronRight
                  size={12}
                  className={`shrink-0 transition-transform ${isActive ? 'rotate-90 text-blue-600' : ''}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate flex items-center gap-1.5">
                    <span
                      className="shrink-0 w-2 h-2 rounded-full"
                      style={{ backgroundColor: goal.color }}
                      title={`Color ${goal.color}`}
                      aria-hidden
                    />
                    <span className="truncate">{goal.title}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-neutral-600 truncate">
                    {formatDate(goal.targetDate)}
                  </p>
                  {total > 0 && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <div className="h-0.5 flex-1 rounded-full bg-slate-200 dark:bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${(completed / total) * 100}%` }}
                        />
                      </div>
                      <PaceBadge goal={goal} />
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this goal and all its tasks?')) {
                      dispatch({ type: 'DELETE_GOAL', payload: { id: goal.id } });
                    }
                  }}
                  aria-label={`Delete goal: ${goal.title}`}
                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-slate-400 dark:text-neutral-600 hover:text-red-400 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </nav>

        {/* Quick-capture hint */}
        <div className="mt-auto pt-2">
          <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-neutral-900 text-[10px] text-slate-400 dark:text-neutral-500">
            <span>Quick capture</span>
            <kbd className="inline-flex items-center rounded border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-1 py-px font-mono text-[9px] font-semibold text-slate-500 dark:text-neutral-400">
              Ctrl K
            </kbd>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
