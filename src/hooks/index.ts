import { useEffect, useState, useCallback, useRef } from 'react';
import type { AppState, AppAction, CountdownState } from '../types';
import { appReducer, initialState } from './reducer';
import { computeCountdown, normalizeState, computePomodoroTick, POMODORO_FOCUS_SECONDS, POMODORO_BREAK_SECONDS } from '../utils';
import type { PomodoroPhase } from '../utils';
import { useDeadlineReminders } from './useDeadlineReminders';

export { useDeadlineReminders };

// ─── useGlobalTick ────────────────────────────────────────────────────────
// Module-level single interval that drives ALL useCountdown consumers.
// Instead of one setInterval per mounted CountdownCard, we share one.

type TickListener = () => void;
const tickListeners = new Set<TickListener>();
let globalIntervalId: ReturnType<typeof setInterval> | null = null;

function addTickListener(fn: TickListener) {
  tickListeners.add(fn);
  if (!globalIntervalId) {
    globalIntervalId = setInterval(() => {
      tickListeners.forEach((cb) => cb());
    }, 1000);
  }
}

function removeTickListener(fn: TickListener) {
  tickListeners.delete(fn);
  if (tickListeners.size === 0 && globalIntervalId !== null) {
    clearInterval(globalIntervalId);
    globalIntervalId = null;
  }
}

const STORAGE_KEY = 'deadline-dashboard-v2';

// ─── useAppState ──────────────────────────────────────────────────────────
// Wraps useReducer with localStorage hydration + persistence.
// On mount, loads from storage (handles invalid JSON gracefully).
// On every state change, serialises back to storage.

export function useAppState() {
  const [history, setHistory] = useState<{ past: AppState[]; present: AppState; future: AppState[] }>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        // Basic shape guard before loading
        if (Array.isArray(parsed.goals)) {
          return { past: [], present: normalizeState({ ...initialState, ...parsed }), future: [] };
        }
      }
    } catch {
      // Corrupted storage — start fresh silently
      localStorage.removeItem(STORAGE_KEY);
    }
    return { past: [], present: initialState, future: [] };
  });

  const dispatch = useCallback((action: AppAction) => {
    setHistory((curr) => {
      if (action.type === 'UNDO') {
        if (curr.past.length === 0) return curr;
        const previous = curr.past[curr.past.length - 1];
        const newPast = curr.past.slice(0, curr.past.length - 1);
        return {
          past: newPast,
          present: previous,
          future: [curr.present, ...curr.future]
        };
      }
      if (action.type === 'REDO') {
        if (curr.future.length === 0) return curr;
        const next = curr.future[0];
        const newFuture = curr.future.slice(1);
        return {
          past: [...curr.past, curr.present],
          present: next,
          future: newFuture
        };
      }
      
      const newPresent = appReducer(curr.present, action);
      if (newPresent === curr.present) return curr;

      // Keep only last 20 states
      const newPast = [...curr.past, curr.present].slice(-20);
      return {
        past: newPast,
        present: newPresent,
        future: []
      };
    });
  }, []);

  // Persist on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.present));
    } catch {
      // Storage quota exceeded — nothing we can do
    }
  }, [history.present]);

  // Global undo/redo shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return; // Don't intercept if typing
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          dispatch({ type: 'REDO' });
        } else {
          dispatch({ type: 'UNDO' });
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);

  return { state: history.present, dispatch };
}

// ─── useCountdown ──────────────────────────────────────────────────────────
// Subscribes to the shared global tick instead of creating its own interval.
// All mounted CountdownCards share a single setInterval.

export function useCountdown(
  targetDateISO: string,
  createdAtISO: string
): CountdownState {
  const compute = useCallback(
    () => computeCountdown(targetDateISO, createdAtISO),
    [targetDateISO, createdAtISO]
  );

  const [countdown, setCountdown] = useState<CountdownState>(compute);

  // Keep compute stable ref so the tick listener always uses the latest version
  const computeRef = useRef(compute);
  useEffect(() => { computeRef.current = compute; }, [compute]);

  useEffect(() => {
    // Sync immediately when inputs change
    const initial = compute();
    setCountdown(initial);
    if (initial.isExpired) return;

    const tick = () => {
      const next = computeRef.current();
      setCountdown(next);
      if (next.isExpired) removeTickListener(tick);
    };

    addTickListener(tick);
    return () => removeTickListener(tick);
  }, [compute]);

  return countdown;
}

// ─── usePomodoro ──────────────────────────────────────────────────────────
// Shared, background-safe Pomodoro timer.
//
// Time is stored as an absolute `endsAt` timestamp and derived from the wall
// clock on every tick. This means the countdown no longer stalls when the tab
// is in the background or throttled — when you come back, the elapsed time is
// accounted for and any completed focus session is caught up.
//
// State is kept at module level (a singleton) so the floating PomodoroTimer and
// FocusMode share one timer instead of each owning a separate one.

const POMO_STORAGE_KEY = 'deadline-dashboard-pomo';

interface PomoPersist {
  phase: PomodoroPhase;
  endsAt: number; // absolute epoch ms when the current phase ends
  running: boolean;
  sessions: number; // completed focus sessions so far
}

function loadPersistedPomo(): PomoPersist {
  try {
    const raw = sessionStorage.getItem(POMO_STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as PomoPersist;
      if (p && typeof p.endsAt === 'number' && (p.phase === 'focus' || p.phase === 'break')) {
        return { phase: p.phase, endsAt: p.endsAt, running: !!p.running, sessions: p.sessions || 0 };
      }
    }
  } catch {
    // ignore corrupted storage
  }
  return { phase: 'focus', endsAt: Date.now() + POMODORO_FOCUS_SECONDS * 1000, running: false, sessions: 0 };
}

let pomoState: PomoPersist = loadPersistedPomo();
const pomoSubscribers = new Set<() => void>();

function persistPomo() {
  try {
    const payload: PomoPersist = {
      phase: pomoState.phase,
      endsAt: pomoState.endsAt,
      running: pomoState.running,
      sessions: pomoState.sessions,
    };
    sessionStorage.setItem(POMO_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // storage may be unavailable; ignore
  }
}

function notifyPomo() {
  pomoSubscribers.forEach((cb) => cb());
}

function setPomoState(next: PomoPersist) {
  pomoState = next;
  persistPomo();
  notifyPomo();
}

// Advance the timer against the wall clock (called on each shared tick).
function tickPomodoro() {
  const now = Date.now();
  const tick = computePomodoroTick(pomoState.phase, pomoState.endsAt, pomoState.running, pomoState.sessions, now);
  const completed = tick.completedFocus > 0;
  const changed = tick.phase !== pomoState.phase
    || tick.running !== pomoState.running
    || tick.sessions !== pomoState.sessions
    || completed;
  if (changed) {
    pomoState = { phase: tick.phase, endsAt: tick.endsAt, running: tick.running, sessions: tick.sessions };
    persistPomo();
  }
  // Notify every tick (not only on transitions) so the floating countdown
  // re-renders and ticks down each second. usePomodoroMeta() subscribers are
  // unaffected — they bail out when running/phase/sessions are unchanged.
  notifyPomo();
}

addTickListener(tickPomodoro);

// ── Controls (module-level so any component can drive the shared timer) ────

export function startPomodoro() {
  const now = Date.now();
  const durMs = (pomoState.phase === 'focus' ? POMODORO_FOCUS_SECONDS : POMODORO_BREAK_SECONDS) * 1000;
  setPomoState({ ...pomoState, endsAt: now + durMs, running: true });
}

export function togglePomodoro() {
  if (pomoState.running) {
    setPomoState({ ...pomoState, running: false });
  } else {
    startPomodoro();
  }
}

export function resetPomodoro() {
  setPomoState({
    phase: 'focus',
    endsAt: Date.now() + POMODORO_FOCUS_SECONDS * 1000,
    running: false,
    sessions: pomoState.sessions,
  });
}

export interface PomodoroMeta {
  phase: PomodoroPhase;
  running: boolean;
  sessions: number;
}

// Lightweight subscription that only re-renders when running/phase/sessions
// change (i.e. on transitions), NOT every second — ideal for task rows.
export function usePomodoroMeta(): PomodoroMeta {
  const [meta, setMeta] = useState<PomodoroMeta>({
    phase: pomoState.phase,
    running: pomoState.running,
    sessions: pomoState.sessions,
  });

  useEffect(() => {
    const run = () => {
      setMeta((prev) => (
        prev.running === pomoState.running
        && prev.phase === pomoState.phase
        && prev.sessions === pomoState.sessions
          ? prev
          : { phase: pomoState.phase, running: pomoState.running, sessions: pomoState.sessions }
      ));
    };
    pomoSubscribers.add(run);
    return () => { pomoSubscribers.delete(run); };
  }, []);

  return meta;
}

export interface PomodoroState {
  phase: PomodoroPhase;
  secondsLeft: number;
  running: boolean;
  sessions: number;
}

export function usePomodoro() {
  const [, force] = useState(0);

  useEffect(() => {
    const sub = () => force((n) => n + 1);
    pomoSubscribers.add(sub);
    return () => { pomoSubscribers.delete(sub); };
  }, []);

  const now = Date.now();
  const tick = computePomodoroTick(pomoState.phase, pomoState.endsAt, pomoState.running, pomoState.sessions, now);

  return {
    pomo: {
      phase: tick.phase,
      secondsLeft: tick.secondsLeft,
      running: tick.running,
      sessions: tick.sessions,
    } as PomodoroState,
    toggle: togglePomodoro,
    reset: resetPomodoro,
  };
}

// ─── useStreak ────────────────────────────────────────────────────────────
// Tracks consecutive days the user has opened the app.

const STREAK_KEY = 'deadline-dashboard-streak';

interface StreakData {
  count: number;
  lastVisit: string; // ISO date string YYYY-MM-DD
}

export function useStreak(): number {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const raw = localStorage.getItem(STREAK_KEY);
      if (!raw) {
        localStorage.setItem(STREAK_KEY, JSON.stringify({ count: 1, lastVisit: today }));
        setStreak(1);
        return;
      }
      const data = JSON.parse(raw) as StreakData;
      const last = new Date(data.lastVisit);
      const now = new Date(today);
      const diffDays = Math.round(
        (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 0) {
        setStreak(data.count);
      } else if (diffDays === 1) {
        const newCount = data.count + 1;
        localStorage.setItem(STREAK_KEY, JSON.stringify({ count: newCount, lastVisit: today }));
        setStreak(newCount);
      } else {
        localStorage.setItem(STREAK_KEY, JSON.stringify({ count: 1, lastVisit: today }));
        setStreak(1);
      }
    } catch {
      setStreak(1);
    }
  }, []);

  return streak;
}