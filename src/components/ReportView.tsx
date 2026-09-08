import { useMemo } from 'react';
import { X, CheckCircle2, Circle, Flag, Clock, TrendingUp, Printer } from 'lucide-react';
import type { Goal } from '../types';
import { getTaskStats, formatDate, computePace } from '../utils';
import type { GoalPace } from '../utils';

interface ReportViewProps {
  goal: Goal;
  onClose: () => void;
}

const PACE_STYLE: Record<string, { dot: string; label: string }> = {
  ahead: { dot: 'bg-emerald-500', label: 'Ahead' },
  'on-track': { dot: 'bg-amber-500', label: 'On track' },
  behind: { dot: 'bg-orange-500', label: 'Behind' },
  'at-risk': { dot: 'bg-red-500', label: 'At risk' },
  done: { dot: 'bg-emerald-500', label: 'Done' },
};

function ProgressRing({ percent }: { percent: number }) {
  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (percent / 100) * circ;

  return (
    <svg width="100" height="100" className="rotate-[-90deg]" aria-hidden>
      <circle cx="50" cy="50" r={radius} fill="none" className="stroke-slate-200" strokeWidth="7" />
      <circle
        cx="50" cy="50" r={radius} fill="none"
        stroke="#2563eb"
        strokeWidth="7" strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

// Print-friendly report view for a single goal
export function ReportView({ goal, onClose }: ReportViewProps) {
  const { total, completed, remaining, percent } = useMemo(() => getTaskStats(goal), [goal]);
  const pace: GoalPace = useMemo(() => computePace(goal), [goal]);
  const paceStyle = PACE_STYLE[pace.status];

  const generatedAt = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* Screen-only controls — hidden when printing */}
      <div className="print:hidden bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <span className="text-sm text-slate-500">Goal report preview</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Printer size={14} />
            Print / Save PDF
          </button>
          <button
            onClick={onClose}
            aria-label="Close report"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Report body — this is what prints */}
      <div className="max-w-3xl mx-auto px-6 py-10 print:px-0 print:py-0">
        {/* Header */}
        <div className="flex items-start gap-5 border-b border-slate-200 pb-6 mb-6">
          <div className="relative shrink-0">
            <ProgressRing percent={percent} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-bold text-slate-900">{percent}%</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900">{goal.title}</h1>
            <p className="text-sm text-slate-500 mt-1">
              Target date: {formatDate(goal.targetDate)}
            </p>
            {paceStyle && (
              <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-slate-600">
                <span className={`w-2 h-2 rounded-full ${paceStyle.dot}`} aria-hidden />
                Pace: {paceStyle.label}
                {pace.tasksPerDayNeeded > 0 && (
                  <span className="text-slate-400"> · need {pace.tasksPerDayNeeded} tasks/day</span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="border border-slate-200 rounded-lg p-4 text-center">
            <CheckCircle2 size={18} className="mx-auto text-emerald-500 mb-1" aria-hidden />
            <p className="text-2xl font-bold text-slate-900">{completed}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Completed</p>
          </div>
          <div className="border border-slate-200 rounded-lg p-4 text-center">
            <Circle size={18} className="mx-auto text-amber-500 mb-1" aria-hidden />
            <p className="text-2xl font-bold text-slate-900">{remaining}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Remaining</p>
          </div>
          <div className="border border-slate-200 rounded-lg p-4 text-center">
            <Clock size={18} className="mx-auto text-blue-500 mb-1" aria-hidden />
            <p className="text-2xl font-bold text-slate-900">{total}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Total tasks</p>
          </div>
        </div>

        {/* Milestones */}
        {goal.milestones.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
              <Flag size={15} className="text-violet-500" aria-hidden />
              Milestones
            </h2>
            <div className="flex flex-col gap-2">
              {goal.milestones.map((m) => (
                <div key={m.id} className="flex items-center gap-3 text-sm">
                  <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" aria-hidden />
                  <span className="text-slate-700 flex-1">{m.label}</span>
                  <span className="text-xs text-slate-400">{formatDate(m.date)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tasks */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <TrendingUp size={15} className="text-blue-500" aria-hidden />
            Tasks
          </h2>
          {goal.tasks.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No tasks recorded.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-400 uppercase tracking-widest">
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2 font-medium">Task</th>
                  <th className="py-2 font-medium">Due</th>
                </tr>
              </thead>
              <tbody>
                {goal.tasks.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100">
                    <td className="py-2">
                      {t.completed ? (
                        <CheckCircle2 size={14} className="text-emerald-500" aria-hidden />
                      ) : (
                        <Circle size={14} className="text-slate-300" aria-hidden />
                      )}
                    </td>
                    <td className={`py-2 ${t.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {t.text}
                    </td>
                    <td className="py-2 text-xs text-slate-400">
                      {t.dueDate ? formatDate(t.dueDate) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
          <p>Generated by Deadline Dashboard · {generatedAt}</p>
          <p className="mt-1">This report is for personal record-keeping.</p>
        </div>
      </div>
    </div>
  );
}