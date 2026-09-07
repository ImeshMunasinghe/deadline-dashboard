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
import { QuickCapture } from './components/QuickCapture';
import { DailyReflection } from './components/DailyReflection';
import { useAppState } from './hooks';
import { decodeGoalShare, generateId, getTaskStats, computeDeadlineNotifications, filterUnnotified } from './utils';
import type { Goal, AppAction } from './types';

function GoalView({ activeGoal, dispatch }: { activeGoal: Goal | null, dispatch: React.Dispatch<AppAction> }) {
  if (!activeGoal) return <EmptyState />;
  
  return (
    <div className="flex flex-col gap-4 p-6 max-w-5xl w-full mx-auto">
      {/* Row 1: Countdown (wide) + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CountdownCard goal={activeGoal} dispatch={dispatch} />
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

  // ── Reflection open state (lifted here to avoid DOM custom events) ──────
  const [reflectionOpen, setReflectionOpen] = useState(false);

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

  // Handle read-only share param on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareParam = params.get('share');
    if (!shareParam) return;

    const sharedGoal = decodeGoalShare(shareParam);
    if (!sharedGoal) return;

    // Import as a new goal (give it a fresh ID to avoid collision)
    const imported: Goal = {
      ...sharedGoal,
      id: generateId(),
      title: `${sharedGoal.title} (shared)`,
    };

    dispatch({ type: 'ADD_GOAL', payload: imported });

    // Clean the URL without reloading
    const clean = new URL(window.location.href);
    clean.searchParams.delete('share');
    window.history.replaceState({}, '', clean.toString());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fire deadline notifications once per day on load (if permitted and enabled)
  useEffect(() => {
    if (!state.remindersEnabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const pending = filterUnnotified(computeDeadlineNotifications(state));
    pending.forEach((n) => {
      new Notification(n.title, { body: n.body });
    });
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

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-neutral-950 text-slate-800 dark:text-neutral-200 font-sans">
      {/* ── Sidebar */}
      <Sidebar state={state} dispatch={dispatch} onOpenReflection={() => setReflectionOpen(true)} />

      {/* ── Main area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {state.activeView === 'calendar' && <CalendarView state={state} dispatch={dispatch} />}
        {state.activeView === 'today' && <TodayView state={state} dispatch={dispatch} />}
        {state.activeView === 'analytics' && <AnalyticsView state={state} dispatch={dispatch} />}
        {(state.activeView === 'goal' || state.activeView === 'inbox') && (
          <GoalView activeGoal={activeGoal} dispatch={dispatch} />
        )}
      </main>

      {/* ── Floating Pomodoro Timer — always visible in the bottom-right corner */}
      <PomodoroTimer state={state} dispatch={dispatch} />
      <QuickCapture dispatch={dispatch} />
      <DailyReflection
        state={state}
        dispatch={dispatch}
        isOpen={reflectionOpen}
        onClose={() => setReflectionOpen(false)}
      />
      <BottomToolbar state={state} dispatch={dispatch} />
    </div>
  );
}