import { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Timer } from 'lucide-react';
import { usePomodoro } from '../hooks';

// Floating Pomodoro circle fixed to the bottom-right corner of the viewport.
// Space bar (when not typing) toggles the timer.
export function PomodoroTimer() {
  const { pomo, toggle, reset } = usePomodoro();
  const [toast, setToast] = useState<string | null>(null);

  const mins = Math.floor(pomo.secondsLeft / 60);
  const secs = pomo.secondsLeft % 60;
  const total = pomo.phase === 'focus' ? 25 * 60 : 5 * 60;
  const progress = ((total - pomo.secondsLeft) / total) * 100;

  const phaseColor   = pomo.phase === 'focus' ? '#2563eb' : '#34d399';
  const phaseTextClr = pomo.phase === 'focus' ? 'text-blue-500' : 'text-emerald-400';
  const radius       = 44;
  const circ         = 2 * Math.PI * radius;
  const offset       = circ - (progress / 100) * circ;

  // ─── Space bar shortcut ───────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.code === 'Space' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'BUTTON'
      ) {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  // ─── Phase complete: toast + confetti ────────────────────────────────────
  useEffect(() => {
    if (pomo.secondsLeft !== 0) return;

    const msg = pomo.phase === 'focus'
      ? '🎉 Focus session done! Take a break.'
      : '💪 Break over — back to work!';

    // In-app toast
    setToast(msg);
    const toastTimer = setTimeout(() => setToast(null), 5000);

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(msg.replace(/^[^ ]+ /, ''));
    }

    // Confetti only on focus session complete
    if (pomo.phase === 'focus') {
      import('canvas-confetti').then((m) => {
        m.default({
          particleCount: 80,
          spread: 60,
          origin: { x: 0.95, y: 0.85 },
          colors: ['#2563eb', '#60a5fa', '#34d399', '#a78bfa'],
        });
      });
    }

    return () => clearTimeout(toastTimer);
  }, [pomo.secondsLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* ── In-app toast notification ──────────────────────────────── */}
      {toast && (
        <div
          className="fixed bottom-36 right-6 z-[60] toast-slide-up max-w-xs
            bg-white dark:bg-neutral-900 border border-blue-200 dark:border-blue-800
            shadow-xl rounded-xl px-4 py-3 flex items-center gap-3"
        >
          <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
          <p className="text-sm font-medium text-slate-800 dark:text-neutral-100">{toast}</p>
          <button
            onClick={() => setToast(null)}
            className="ml-auto text-slate-400 hover:text-slate-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Timer widget ───────────────────────────────────────────── */}
      <div
        className="fixed bottom-6 right-6 z-50 group"
        style={{ userSelect: 'none' }}
      >
        {/* Tooltip — shown above circle on hover */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100
          transition-opacity duration-200 whitespace-nowrap
          bg-slate-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700
          text-[10px] text-slate-500 dark:text-neutral-400 px-2 py-1 rounded-lg shadow-lg pointer-events-none">
          Space to toggle
        </div>

        {/* Session count badge */}
        {pomo.sessions > 0 && (
          <div className="absolute -top-2 -left-2 bg-blue-600 text-white text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
            {pomo.sessions}
          </div>
        )}

        {/* Running indicator pulse */}
        {pomo.running && (
          <div
            className="absolute inset-0 rounded-full opacity-30 animate-ping"
            style={{ backgroundColor: phaseColor }}
          />
        )}

        {/* Main circle button */}
        <div className="relative w-24 h-24">
          {/* SVG ring */}
          <svg
            width="96"
            height="96"
            className="rotate-[-90deg] drop-shadow-2xl"
            style={{ filter: `drop-shadow(0 0 12px ${phaseColor}44)` }}
          >
            {/* Background disc */}
            <circle cx="48" cy="48" r={radius} fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1" className="dark:fill-neutral-900 dark:stroke-neutral-800" />
            {/* Track */}
            <circle cx="48" cy="48" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="5" className="dark:stroke-neutral-800" />
            {/* Progress arc */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              stroke={phaseColor}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>

          {/* Timer label in the centre */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-sm font-mono font-bold ${phaseTextClr} tabular-nums leading-none`}>
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
            <span className="text-[8px] text-slate-400 dark:text-neutral-600 uppercase tracking-widest mt-0.5">
              {pomo.phase === 'focus' ? 'focus' : 'break'}
            </span>
          </div>
        </div>

        {/* Controls — visible on hover, positioned to the left */}
        <div className="absolute bottom-0 -left-12 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={toggle}
            aria-label={pomo.running ? 'Pause Pomodoro' : 'Start Pomodoro'}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700
              hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300
              flex items-center justify-center shadow-lg transition-colors"
          >
            {pomo.running ? <Pause size={12} /> : <Play size={12} />}
          </button>
          <button
            onClick={reset}
            aria-label="Reset Pomodoro"
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700
              hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-400 dark:text-neutral-500
              hover:text-slate-700 dark:hover:text-neutral-300 flex items-center justify-center shadow-lg transition-colors"
          >
            <RotateCcw size={11} />
          </button>
          <button
            onClick={() => {
              if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
              }
            }}
            aria-label="Enable notifications"
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700
              hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-400 dark:text-neutral-500
              hover:text-slate-700 dark:hover:text-neutral-300 flex items-center justify-center shadow-lg transition-colors"
            title="Enable focus notifications"
          >
            <Timer size={11} />
          </button>
        </div>
      </div>
    </>
  );
}