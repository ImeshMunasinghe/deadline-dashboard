import { useEffect, useState, useCallback, useRef } from 'react';
import type { AppState, AppAction, CountdownState } from '../types';
import { appReducer, initialState } from './reducer';
import { computeCountdown, normalizeState } from '../utils';

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
// 25/5 Pomodoro timer. Returns state + controls.

type PomodoroPhase = 'focus' | 'break';

interface PomodoroState {
  phase: PomodoroPhase;
  secondsLeft: number;
  running: boolean;
  sessions: number;
}

export function usePomodoro() {
  const FOCUS = 25 * 60;
  const BREAK = 5 * 60;

  const [pomo, setPomo] = useState<PomodoroState>({
    phase: 'focus',
    secondsLeft: FOCUS,
    running: false,
    sessions: 0,
  });

  useEffect(() => {
    if (!pomo.running) return;

    const id = setInterval(() => {
      setPomo((prev) => {
        if (prev.secondsLeft <= 1) {
          const nextPhase: PomodoroPhase =
            prev.phase === 'focus' ? 'break' : 'focus';
          return {
            phase: nextPhase,
            secondsLeft: nextPhase === 'focus' ? FOCUS : BREAK,
            running: false,
            sessions: prev.phase === 'focus' ? prev.sessions + 1 : prev.sessions,
          };
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(id);
  }, [pomo.running, FOCUS, BREAK]);

  const toggle = () => setPomo((p) => ({ ...p, running: !p.running }));
  const reset = () =>
    setPomo({ phase: 'focus', secondsLeft: FOCUS, running: false, sessions: pomo.sessions });

  return { pomo, toggle, reset };
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