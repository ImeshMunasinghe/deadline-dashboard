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
  Inbox,
  BarChart2,
  BookOpen
} from 'lucide-react';
import type { Goal, AppState } from '../types';
import type { AppAction } from '../types';
import { generateId, exportStateAsJSON, parseImportedState, formatDate } from '../utils';

interface SidebarProps {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

// ── Fixed bottom-left toolbar ──────────────────────────────────────────────
export function BottomToolbar({ state, dispatch }: { state: AppState; dispatch: React.Dispatch<AppAction> }) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

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

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-row gap-2">
      <button
        onClick={() => setIsDark((d) => !d)}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className="w-9 h-9 flex items-center justify-center rounded-xl
          bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700
          text-gray-500 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400
          shadow-md hover:shadow-lg transition-all"
      >
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </button>
      <button
        onClick={() => exportStateAsJSON(state)}
        title="Export data"
        className="w-9 h-9 flex items-center justify-center rounded-xl
          bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700
          text-gray-500 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400
          shadow-md hover:shadow-lg transition-all"
      >
        <Download size={15} />
      </button>
      <button
        onClick={handleImport}
        title="Import data"
        className="w-9 h-9 flex items-center justify-center rounded-xl
          bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700
          text-gray-500 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400
          shadow-md hover:shadow-lg transition-all"
      >
        <Upload size={15} />
      </button>
    </div>
  );
}

// ── Main sidebar ───────────────────────────────────────────────────────────
export function Sidebar({ state, dispatch }: SidebarProps) {
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
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
      category: 'Work',
      color: 'bg-blue-600',
    };
    dispatch({ type: 'ADD_GOAL', payload: goal });
    setNewTitle('');
    setNewDate('');
    setNewTime('');
    setShowNewGoal(false);
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 text-gray-700 dark:text-neutral-200 shadow"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`
        fixed md:static inset-y-0 left-0 z-40
        flex flex-col w-64 bg-gray-50 dark:bg-neutral-950
        border-r border-gray-200 dark:border-neutral-800
        p-4 gap-3
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        overflow-y-auto
      `}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-1 py-2 mb-2 md:mt-0 mt-10">
          <Target size={20} className="text-blue-600" />
          <span className="text-sm font-semibold tracking-widest text-gray-800 dark:text-neutral-200 uppercase">
            Deadline
          </span>
        </div>

        {/* Primary Navigation */}
        <nav className="flex flex-col gap-1">
          {[
            { view: 'today' as const, icon: <Calendar size={15} />, label: 'Today' },
            { view: 'inbox' as const, icon: <Inbox size={15} />, label: 'Inbox', badge: state.inbox?.length },
            { view: 'analytics' as const, icon: <BarChart2 size={15} />, label: 'Analytics' },
          ].map(({ view, icon, label, badge }) => (
            <button
              key={view}
              onClick={() => { dispatch({ type: 'SET_ACTIVE_VIEW', payload: { view } }); setIsOpen(false); }}
              className={`flex items-center gap-2 px-2 py-2 rounded-lg text-left text-xs font-medium transition-all ${
                state.activeView === view
                  ? 'bg-blue-600/10 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700/50 text-blue-700 dark:text-blue-300'
                  : 'text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-900 hover:text-gray-800 dark:hover:text-neutral-200'
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
              setTimeout(() => window.dispatchEvent(new CustomEvent('open-reflection')), 100);
            }}
            className="flex items-center gap-2 px-2 py-2 rounded-lg text-left text-xs font-medium transition-all text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-900 hover:text-gray-800 dark:hover:text-neutral-200"
          >
            <BookOpen size={15} />
            <span>Reflect</span>
            {state.reflections.filter(r => r.content && r.date !== '__trigger__').length > 0 && (
              <span className="ml-auto bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 text-[10px] px-1.5 py-0.5 rounded-full">
                {state.reflections.filter(r => r.content && r.date !== '__trigger__').length}
              </span>
            )}
          </button>
        </nav>

        {/* Divider */}
        <div className="h-px bg-gray-200 dark:bg-neutral-800 mx-1" />

        {/* Goals Section Header */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-neutral-500 uppercase">
            Goals
          </span>
          <button
            onClick={() => setShowNewGoal((v) => !v)}
            aria-label="Add new goal"
            className="text-gray-400 dark:text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* New Goal Form */}
        {showNewGoal && (
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800">
            <input
              autoFocus
              type="text"
              placeholder="Goal title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddGoal(); }}
              className="w-full text-xs bg-gray-50 dark:bg-neutral-800 text-gray-800 dark:text-neutral-200 rounded-lg px-2 py-1.5 outline-none border border-gray-200 dark:border-neutral-700 focus:border-blue-500 dark:focus:border-blue-500"
            />
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full text-xs bg-gray-50 dark:bg-neutral-800 text-gray-800 dark:text-neutral-200 rounded-lg px-2 py-1.5 outline-none border border-gray-200 dark:border-neutral-700 focus:border-blue-500 cursor-pointer"
            />
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              aria-label="Goal target time (optional)"
              className="w-full text-xs bg-gray-50 dark:bg-neutral-800 text-gray-800 dark:text-neutral-200 rounded-lg px-2 py-1.5 outline-none border border-gray-200 dark:border-neutral-700 focus:border-blue-500 cursor-pointer"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddGoal}
                className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-1.5 transition-colors font-medium"
              >
                Add
              </button>
              <button
                onClick={() => { setShowNewGoal(false); setNewTitle(''); setNewDate(''); setNewTime(''); }}
                className="flex-1 text-xs bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-500 dark:text-neutral-400 rounded-lg py-1.5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Goals List */}
        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto min-h-0">
          {state.goals.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-neutral-600 px-2 mt-2">
              No goals yet. Add one above.
            </p>
          )}
          {state.goals.map((goal) => {
            const isActive = goal.id === state.activeGoalId && state.activeView === 'goal';
            const completed = goal.tasks.filter((t) => t.completed).length;
            const total = goal.tasks.length;
            return (
              <button
                key={goal.id}
                onClick={() => {
                  dispatch({ type: 'SET_ACTIVE_VIEW', payload: { view: 'goal' } });
                  dispatch({ type: 'SET_ACTIVE_GOAL', payload: { id: goal.id } });
                  setIsOpen(false);
                }}
                className={`group flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-all ${
                  isActive
                    ? 'bg-blue-600/10 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700/50 text-blue-700 dark:text-blue-300'
                    : 'text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-900 hover:text-gray-800 dark:hover:text-neutral-200'
                }`}
              >
                <ChevronRight
                  size={12}
                  className={`shrink-0 transition-transform ${isActive ? 'rotate-90 text-blue-600' : ''}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{goal.title}</p>
                  <p className="text-[10px] text-gray-400 dark:text-neutral-600 truncate">
                    {formatDate(goal.targetDate)}
                  </p>
                  {total > 0 && (
                    <div className="mt-1 h-0.5 rounded-full bg-gray-200 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all"
                        style={{ width: `${(completed / total) * 100}%` }}
                      />
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
                  className="opacity-0 group-hover:opacity-100 text-gray-400 dark:text-neutral-600 hover:text-red-400 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </button>
            );
          })}
        </nav>
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