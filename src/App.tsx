import { useEffect, useRef, useState } from 'react';
import { Sidebar, BottomToolbar } from './components/Sidebar';
import { CountdownCard } from './components/CountdownCard';
import { TaskList } from './components/TaskList';
import { ProgressChart } from './components/ProgressChart';
import { PomodoroTimer } from './components/PomodoroTimer';
import { NotesMilestones } from './components/NotesMilestones';
import { EmptyState } from './components/EmptyState';
import { TodayView } from './components/TodayView';
import { AnalyticsView } from './components/AnalyticsView';
import { CalendarView } from './components/CalendarView';
import { PlannerView } from './components/PlannerView';
import { TimelineView } from './components/TimelineView';
import { ImportExportTab } from './components/ImportExportTab';
import { CommandPalette } from './components/CommandPalette';
import { FocusMode } from './components/FocusMode';
import { QuickCapture } from './components/QuickCapture';
import { DailyReflection } from './components/DailyReflection';
import { ShareView } from './components/ShareView';
import { ReportView } from './components/ReportView';
import { ToastList } from './components/ToastList';
import { useAppState, useDeadlineReminders } from './hooks';
import { decodeGoalShare, generateId, getTaskStats, parseSmartInput } from './utils';
import type { Goal, AppAction } from './types';

function GoalView({ activeGoal, dispatch, onReport }: { activeGoal: Goal | null, dispatch: React.Dispatch<AppAction>, onReport?: (goal: Goal) => void }) {
  if (!activeGoal) return <EmptyState />;
  
  return (
    <div className="flex flex-col gap-4 p-6 max-w-5xl w-full mx-auto">
      {/* Row 1: Countdown (wide) + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CountdownCard goal={activeGoal} dispatch={dispatch} onReport={onReport} />
        </div>
        <div>
          <ProgressChart goal={activeGoal} />
        </div>
      </div>

      {/* Row 2: Task list (wide) + Right column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <TaskList goal={activeGoal} dispatch={dispatch} />
        </div>
        <div className="flex flex-col gap-4">
          <NotesMilestones goal={activeGoal} dispatch={dispatch} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { state, dispatch } = useAppState();

  // Periodic deadline reminders (native notifications + in-app toast fallback).
  useDeadlineReminders(state);

  // Read-only share view: when a ?share= param is present, we show the public
  // ShareView instead of importing the goal into the app.
  const [sharedGoal, setSharedGoal] = useState<Goal | null>(null);

  // Report view: when set, shows a printable report for the given goal
  const [reportGoal, setReportGoal] = useState<Goal | null>(null);

  // ── Reflection open state (lifted here to avoid DOM custom events) ──────
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);

  // Global shortcuts: Ctrl+P palette, Ctrl+G focus mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (mod && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setFocusOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Auto-open reflection after 5 PM once per day
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const hasReflectedToday = state.reflections.some(
      (r) => r.date === todayStr && r.date !== '__trigger__'
    );
    const hour = new Date().getHours();
    if (hour >= 17 && !hasReflectedToday) {
      setReflectionOpen(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle read-only share param on load — show public ShareView
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareParam = params.get('share');
    if (!shareParam) return;

    const decoded = decodeGoalShare(shareParam);
    if (!decoded) return;

    setSharedGoal(decoded);

    // Clean the URL without reloading
    const clean = new URL(window.location.href);
    clean.searchParams.delete('share');
    window.history.replaceState({}, '', clean.toString());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle PWA share-target: when the app is opened via the OS share sheet,
  // shared text is captured as a new inbox task.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('share-target')) return;

    const title = params.get('title') ?? '';
    const text = params.get('text') ?? '';
    const url = params.get('url') ?? '';
    const combined = [title, text, url].filter(Boolean).join(' ');
    if (!combined.trim()) return;

    const parsed = parseSmartInput(combined.trim());
    const task = {
      id: generateId(),
      text: parsed.text || combined.trim(),
      completed: false,
      priority: parsed.priority,
      dueDate: parsed.dueDate,
      subtasks: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
      estimatedMinutes: parsed.estimatedMinutes,
      actualMinutes: 0,
      recurrence: parsed.recurrence,
      blockedBy: parsed.blockedBy,
    };
    dispatch({ type: 'ADD_TO_INBOX', payload: { task } });

    // Clean the URL without reloading
    const clean = new URL(window.location.href);
    clean.searchParams.delete('share-target');
    clean.searchParams.delete('title');
    clean.searchParams.delete('text');
    clean.searchParams.delete('url');
    window.history.replaceState({}, '', clean.toString());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeGoal = state.goals.find((g) => g.id === state.activeGoalId) ?? null;

  // Track task progress to trigger confetti on 100% completion
  const prevPercent = useRef<number>(0);
  const prevActiveGoalId = useRef<string | null>(null);

  useEffect(() => {
    if (!activeGoal) {
      prevPercent.current = 0;
      prevActiveGoalId.current = null;
      return;
    }

    const { total, percent } = getTaskStats(activeGoal);

    // If active goal switched, just update tracking refs without triggering confetti
    if (activeGoal.id !== prevActiveGoalId.current) {
      prevActiveGoalId.current = activeGoal.id;
      prevPercent.current = percent;
      return;
    }

    // Trigger confetti only when transitioning to 100% completed
    if (percent === 100 && prevPercent.current < 100 && total > 0) {
      import('canvas-confetti').then((confetti) => {
        confetti.default({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      });
    }

    prevPercent.current = percent;
  }, [activeGoal]);

  // Read-only share view takes over the entire UI
  if (sharedGoal) {
    return <ShareView goal={sharedGoal} />;
  }

  // Report view takes over the entire UI (print-friendly)
  if (reportGoal) {
    return <ReportView goal={reportGoal} onClose={() => setReportGoal(null)} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-neutral-950 text-slate-800 dark:text-neutral-200 font-sans">
      {/* ── Sidebar */}
      <Sidebar state={state} dispatch={dispatch} onOpenReflection={() => setReflectionOpen(true)} />

      {/* ── Main area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {state.activeView === 'calendar' && <CalendarView state={state} dispatch={dispatch} />}
        {state.activeView === 'today' && <TodayView state={state} dispatch={dispatch} />}
        {state.activeView === 'analytics' && <AnalyticsView state={state} onOpenReflection={() => setReflectionOpen(true)} />}
        {state.activeView === 'planner' && <PlannerView state={state} dispatch={dispatch} />}
        {state.activeView === 'timeline' && <TimelineView state={state} dispatch={dispatch} />}
        {state.activeView === 'importexport' && <ImportExportTab state={state} dispatch={dispatch} />}
        {(state.activeView === 'goal' || state.activeView === 'inbox') && (
          <GoalView activeGoal={activeGoal} dispatch={dispatch} onReport={setReportGoal} />
        )}
      </main>

      {/* ── Floating Pomodoro Timer — always visible in the bottom-right corner */}
      <PomodoroTimer state={state} dispatch={dispatch} />
      <QuickCapture dispatch={dispatch} />
      <ToastList />
      <DailyReflection
        state={state}
        dispatch={dispatch}
        isOpen={reflectionOpen}
        onClose={() => setReflectionOpen(false)}
      />
      <BottomToolbar
        state={state}
        dispatch={dispatch}
      />
      {paletteOpen && (
        <CommandPalette
          state={state}
          dispatch={dispatch}
          onClose={() => setPaletteOpen(false)}
          onFocusMode={() => setFocusOpen(true)}
        />
      )}
      {focusOpen && (
        <FocusMode state={state} dispatch={dispatch} onClose={() => setFocusOpen(false)} />
      )}
    </div>
  );
}
