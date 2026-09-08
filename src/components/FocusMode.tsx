import React, { useEffect, useState } from 'react';
import { X, Play, Pause, CheckCircle2, Timer } from 'lucide-react';
import type { AppState, AppAction, Task } from '../types';
import { usePomodoro } from '../hooks';

interface FocusModeProps {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  onClose: () => void;
}

// ── Zen focus mode: full-screen single-task immersion ──────────────────────
export function FocusMode({ state, dispatch, onClose }: FocusModeProps) {
  const { pomo, toggle } = usePomodoro();
  const [taskId, setTaskId] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const allIncomplete: { task: Task; label: string; goalLabel: string }[] = [
    ...state.goals.flatMap((g) =>
      g.tasks.filter((t) => !t.completed).map((t) => ({ task: t, label: t.text, goalLabel: g.title }))
    ),
  ];

  const selected = allIncomplete.find((x) => x.task.id === taskId);

  // Auto-log focus time when a focus session completes while a task is selected
  useEffect(() => {
    if (pomo.secondsLeft !== 0) return;
    if (pomo.phase === 'focus' && taskId) {
      dispatch({ type: 'LOG_FOCUS_TIME', payload: { taskId, minutes: 25 } });
      setToast('Session logged.');
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [pomo.secondsLeft, pomo.phase, taskId, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  const mins = Math.floor(pomo.secondsLeft / 60);
  const secs = pomo.secondsLeft % 60;
  const total = pomo.phase === 'focus' ? 25 * 60 : 5 * 60;
  const progress = ((total - pomo.secondsLeft) / total) * 100;

  return (
    <div className="fixed inset-0 z-[120] bg-neutral-950 text-white flex flex-col items-center justify-center">
      {/* Close */}
      <button
        onClick={onClose}
        aria-label="Exit focus mode"
        className="fixed top-4 right-4 p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
      >
        <X size={18} />
      </button>

      <p className="text-xs uppercase tracking-widest text-neutral-500 mb-8">Focus Mode</p>

      {/* Task selector */}
      {allIncomplete.length > 0 ? (
        <div className="mb-8 flex flex-col items-center gap-2">
          <select
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            aria-label="Choose a task to focus on"
            className="text-center text-sm bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 outline-none max-w-md"
          >
            <option value="">Choose a task to focus on...</option>
            {allIncomplete.map((t) => (
              <option key={t.task.id} value={t.task.id}>
                {t.label} ({t.goalLabel})
              </option>
            ))}
          </select>

          {selected && (
            <>
              <p className="text-neutral-500 text-xs truncate max-w-md">{selected.goalLabel}</p>
              <p className="text-xl font-semibold text-center max-w-md leading-tight mt-1">{selected.task.text}</p>
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-neutral-500 mb-8">No open tasks to focus on.</p>
      )}

      {/* Timer */}
      <div className="relative w-56 h-56 mb-6">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#262626" strokeWidth="4" />
          <circle
            cx="50" cy="50" r="44" fill="none"
            stroke={pomo.phase === 'focus' ? '#2563eb' : '#34d399'}
            strokeWidth="4" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 44}
            strokeDashoffset={2 * Math.PI * 44 * (1 - progress / 100)}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-mono text-4xl font-bold tabular-nums ${pomo.phase === 'focus' ? 'text-blue-400' : 'text-emerald-400'}`}>
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-neutral-500 uppercase tracking-widest mt-2">
            {pomo.phase === 'focus' ? 'focus' : 'break'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { toggle(); }}
          disabled={!taskId}
          aria-label={pomo.running ? 'Pause timer' : 'Start timer'}
          className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center
            shadow-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pomo.running ? <Pause size={20} /> : <Play size={20} />}
        </button>
        {selected && (
          <button
            onClick={() => {
              if (taskId) {
                const goal = state.goals.find((g) => g.tasks.some((t) => t.id === taskId));
                if (goal) dispatch({ type: 'TOGGLE_TASK', payload: { goalId: goal.id, taskId } });
              }
              onClose();
            }}
            className="flex items-center gap-1.5 text-xs px-4 py-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
          >
            <CheckCircle2 size={14} /> Mark done & exit
          </button>
        )}
      </div>

      {toast && (
        <p className="toast-slide-up fixed bottom-6 text-sm text-blue-400">{toast}</p>
      )}

      {/* Timer hint */}
      <p className="fixed bottom-5 left-0 right-0 text-center text-[11px] text-neutral-500 flex items-center justify-center gap-1">
        <Timer size={11} /> Space bar toggles the timer
      </p>
    </div>
  );
}