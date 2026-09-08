import { useMemo } from 'react';
import { Target, CheckCircle2, Circle, Flag, Clock, TrendingUp } from 'lucide-react';
import type { Goal } from '../types';
import { getTaskStats, formatDate, computePace } from '../utils';
import type { GoalPace } from '../utils';

interface ShareViewProps {
  goal: Goal;
}

const PACE_STYLE: Record<string, { dot: string; label: string; text: string }> = {
  ahead: { dot: 'bg-emerald-500', label: 'Ahead', text: 'text-emerald-600' },
  'on-track': { dot: 'bg-amber-500', label: 'On track', text: 'text-amber-600' },
  behind: { dot: 'bg-orange-500', label: 'Behind', text: 'text-orange-600' },
  'at-risk': { dot: 'bg-red-500', label: 'At risk', text: 'text-red-600' },
  done: { dot: 'bg-emerald-500', label: 'Done', text: 'text-emerald-600' },
};

function ProgressRing({ percent, isExpired }: { percent: number; isExpired?: boolean }) {
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width="128" height="128" className="rotate-[-90deg]" aria-hidden>
      <circle cx="64" cy="64" r={radius} fill="none" className="stroke-slate-200" strokeWidth="8" />
      <circle cx="64" cy="64" r={radius} fill="none" stroke={isExpired ? '#10b981' : '#2563eb'} strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
    </svg>
  );
}


// ── Read-only share page: shows goal progress to anyone with the link ──────
export function ShareView({ goal }: ShareViewProps) {
  const { total, completed, remaining, percent } = useMemo(() => getTaskStats(goal), [goal]);
  const pace: GoalPace = useMemo(() => computePace(goal), [goal]);
  const paceStyle = PACE_STYLE[pace.status];
  const isExpired = new Date(goal.targetDate).getTime() < Date.now();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Target size={16} className="text-blue-600" />
            <span className="font-semibold text-slate-700">Deadline Dashboard</span>
            <span className="text-slate-300">·</span>
            <span>Shared goal</span>
          </div>
          <span className="text-xs text-slate-400">Read-only view</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Goal header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex flex-wrap items-start gap-6">
            <div className="relative shrink-0">
              <ProgressRing percent={isExpired ? 100 : percent} isExpired={isExpired} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-bold text-slate-900">{isExpired ? '100%' : `${percent}%`}</span>
                <span className="text-[10px] text-slate-400 tracking-widest uppercase">{isExpired ? 'done' : 'complete'}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900">{goal.title}</h1>
              <p className="text-sm text-slate-500 mt-1">{isExpired ? 'Deadline passed' : `Target: ${formatDate(goal.targetDate)}`}</p>
              {paceStyle && (
                <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium">
                  <span className={`w-2 h-2 rounded-full ${paceStyle.dot}`} aria-hidden />
                  <span className={paceStyle.text}>{paceStyle.label}</span>
                  {pace.tasksPerDayNeeded > 0 && <span className="text-slate-400">· need {pace.tasksPerDayNeeded}/day</span>}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <CheckCircle2 size={18} className="mx-auto text-emerald-500 mb-1" aria-hidden />
            <p className="text-2xl font-bold text-slate-900">{completed}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Done</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <Circle size={18} className="mx-auto text-amber-500 mb-1" aria-hidden />
            <p className="text-2xl font-bold text-slate-900">{remaining}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Remaining</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <Clock size={18} className="mx-auto text-blue-500 mb-1" aria-hidden />
            <p className="text-2xl font-bold text-slate-900">{total}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Total</p>
          </div>
        </div>

        {/* Milestones */}
        {goal.milestones.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
              <Flag size={15} className="text-violet-500" aria-hidden />
              Milestones
            </h2>
            <div className="flex flex-col gap-3">
              {goal.milestones.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" aria-hidden />
                  <span className="text-sm text-slate-700 flex-1">{m.label}</span>
                  <span className="text-xs text-slate-400">{formatDate(m.date)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Task list */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-blue-500" aria-hidden />
            Tasks
          </h2>
          {goal.tasks.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No tasks yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {goal.tasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3">
                  {t.completed ? (
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" aria-hidden />
                  ) : (
                    <Circle size={16} className="text-slate-300 shrink-0" aria-hidden />
                  )}
                  <span className={`text-sm flex-1 ${t.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{t.text}</span>
                  {t.dueDate && <span className="text-xs text-slate-400">{formatDate(t.dueDate)}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 py-4">
          Shared via Deadline Dashboard · {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </main>
    </div>
  );
}

