import React, { useState } from 'react';
import { Edit2, Check, X, Share2, Copy, Printer } from 'lucide-react';
import type { Goal } from '../types';
import type { AppAction } from '../types';
import { useCountdown } from '../hooks';
import { encodeGoalShare, computePace, formatDate } from '../utils';
import type { GoalPace } from '../utils';

// Pace chip: colored dot + label, no emojis
const PACE_STYLE: Record<string, { dot: string; label: string; text: string }> = {
  ahead: { dot: 'bg-emerald-500', label: 'Ahead', text: 'text-emerald-400' },
  'on-track': { dot: 'bg-amber-500', label: 'On track', text: 'text-amber-400' },
  behind: { dot: 'bg-orange-500', label: 'Behind', text: 'text-orange-400' },
  'at-risk': { dot: 'bg-red-500', label: 'At risk', text: 'text-red-400' },
  done: { dot: 'bg-emerald-500', label: 'Done', text: 'text-emerald-400' },
};

export function PaceBadge({ goal, showDetail }: { goal: Goal; showDetail?: boolean }) {
  const pace: GoalPace = computePace(goal);
  const style = PACE_STYLE[pace.status];
  if (!style) return null;
  return (
    <span
      className="chip bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400"
      title={
        pace.tasksPerDayNeeded > 0
          ? `Need ${pace.tasksPerDayNeeded} tasks/day, averaging ${pace.tasksPerDayActual}/day`
          : undefined
      }
    >
      <span className={`w-2 h-2 rounded-full ${style.dot}`} aria-hidden />
      {style.label}
      {showDetail && pace.tasksPerDayNeeded > 0 && (
        <span className="text-slate-400 dark:text-neutral-500">
          · need {pace.tasksPerDayNeeded}/day
        </span>
      )}
    </span>
  );
}

interface CountdownCardProps {
  goal: Goal;
  dispatch: React.Dispatch<AppAction>;
  onReport?: (goal: Goal) => void;
}

// Animated circular progress ring using SVG
function ProgressRing({ percent, isExpired }: { percent: number; isExpired?: boolean }) {
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (percent / 100) * circ;

  return (
    <svg width="128" height="128" className="rotate-[-90deg]" aria-hidden>
      {/* Track — theme-aware via CSS variables */}
      <circle
        cx="64"
        cy="64"
        r={radius}
        fill="none"
        className="stroke-slate-200 dark:stroke-neutral-800"
        strokeWidth="8"
      />
      {/* Progress */}
      <circle
        cx="64"
        cy="64"
        r={radius}
        fill="none"
        stroke={isExpired ? "url(#ringGradExpired)" : "url(#ringGrad)"}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
        <linearGradient id="ringGradExpired" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Single number unit for the countdown display
function CountUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-[44px] sm:min-w-[48px]">
      <span className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 dark:text-neutral-100 tabular-nums leading-none">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[11px] text-slate-400 dark:text-neutral-500 uppercase tracking-widest mt-1">
        {label}
      </span>
    </div>
  );
}

export function CountdownCard({ goal, dispatch, onReport }: CountdownCardProps) {
  const countdown = useCountdown(goal.targetDate, goal.createdAt);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editDate, setEditDate] = useState(goal.targetDate);
  const [copied, setCopied] = useState(false);

  function saveEdit() {
    if (!editTitle.trim() || !editDate) return;
    dispatch({
      type: 'UPDATE_GOAL',
      payload: { id: goal.id, updates: { title: editTitle.trim(), targetDate: editDate } },
    });
    setEditing(false);
  }

  function cancelEdit() {
    setEditTitle(goal.title);
    setEditDate(goal.targetDate);
    setEditing(false);
  }

  function handleShare() {
    const shareData = {
      title: goal.title,
      text: `Deadline: ${goal.title} - target ${formatDate(goal.targetDate)}`,
      url: encodeGoalShare(goal),
    };
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (nav.share) {
      nav.share(shareData).catch(() => {
        navigator.clipboard.writeText(shareData.url);
      });
    } else {
      navigator.clipboard.writeText(shareData.url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  // Determine ring fill colour based on time left
  const urgencyClass = countdown.isExpired
    ? 'text-emerald-400'
    : countdown.days <= 1
    ? 'text-red-400'
    : countdown.days <= 7
    ? 'text-amber-400'
    : 'text-blue-500';

  return (
    <div className="relative bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 overflow-hidden">
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-transparent pointer-events-none rounded-2xl" />

      {/* Header row */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex flex-col gap-2">
              <input
                autoFocus
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-lg font-semibold bg-slate-100 dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 rounded px-2 py-1 outline-none border border-blue-600 w-full"
              />
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="text-sm bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 rounded px-2 py-1 outline-none border border-slate-300 dark:border-neutral-700 focus:border-blue-600 w-full"
              />
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-neutral-100 truncate">
                {goal.title}
              </h2>
              <p className="text-xs text-slate-400 dark:text-neutral-500 mt-0.5">
                Target: {new Date(goal.targetDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <div className="mt-2">
                <PaceBadge goal={goal} showDetail />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 ml-3 shrink-0">
          {editing ? (
            <>
              <button
                onClick={saveEdit}
                aria-label="Save changes"
                className="p-1.5 rounded-lg text-emerald-400 hover:bg-slate-100 dark:bg-neutral-800 transition-colors"
              >
                <Check size={14} />
              </button>
              <button
                onClick={cancelEdit}
                aria-label="Cancel editing"
                className="p-1.5 rounded-lg text-slate-400 dark:text-neutral-500 hover:bg-slate-100 dark:bg-neutral-800 transition-colors"
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  dispatch({ type: 'SAVE_TEMPLATE', payload: { template: goal } });
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                aria-label="Save as Template"
                className="p-1.5 rounded-lg text-slate-400 dark:text-neutral-500 hover:text-emerald-400 hover:bg-slate-100 dark:bg-neutral-800 transition-colors"
                title="Save as Template"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={handleShare}
                aria-label="Copy shareable link"
                className="p-1.5 rounded-lg text-slate-400 dark:text-neutral-500 hover:text-blue-500 hover:bg-slate-100 dark:bg-neutral-800 transition-colors"
              >
                <Share2 size={14} />
              </button>
              {onReport && (
                <button
                  onClick={() => onReport(goal)}
                  aria-label="Generate report"
                  className="p-1.5 rounded-lg text-slate-400 dark:text-neutral-500 hover:text-violet-500 hover:bg-slate-100 dark:bg-neutral-800 transition-colors"
                >
                  <Printer size={14} />
                </button>
              )}
              <button
                onClick={() => setEditing(true)}
                aria-label="Edit goal"
                className="p-1.5 rounded-lg text-slate-400 dark:text-neutral-500 hover:text-blue-500 hover:bg-slate-100 dark:bg-neutral-800 transition-colors"
              >
                <Edit2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {copied && (
        <div className="absolute top-4 right-4 text-xs bg-blue-700 text-white px-2 py-1 rounded z-10">
          Action successful
        </div>
      )}

      {/* Main countdown display */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-8">
        {/* Ring */}
        <div className="relative shrink-0">
          <ProgressRing
            percent={countdown.isExpired ? 100 : countdown.progressPercent}
            isExpired={countdown.isExpired}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-sm font-bold ${urgencyClass}`}>
              {countdown.isExpired ? '100%' : `${Math.round(countdown.progressPercent)}%`}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-neutral-600 tracking-widest uppercase">
              {countdown.isExpired ? 'done' : 'elapsed'}
            </span>
          </div>
        </div>

        {/* Content on the right */}
        {countdown.isExpired ? (
          <div className="flex flex-col">
            <div className={`text-xl font-bold ${urgencyClass}`}>
              Goal Achieved
            </div>
            <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1">
              Deadline has passed
            </p>
          </div>
        ) : (
          /* Units */
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <CountUnit value={countdown.days} label="days" />
            <span className="text-2xl text-slate-300 dark:text-neutral-700 font-mono hidden sm:inline">:</span>
            <CountUnit value={countdown.hours} label="hrs" />
            <span className="text-2xl text-slate-300 dark:text-neutral-700 font-mono hidden sm:inline">:</span>
            <CountUnit value={countdown.minutes} label="min" />
            <span className="text-2xl text-slate-300 dark:text-neutral-700 font-mono hidden sm:inline">:</span>
            <CountUnit value={countdown.seconds} label="sec" />
          </div>
        )}
      </div>

      {/* Urgency badge */}
      {!countdown.isExpired && countdown.days <= 3 && (
        <div className="mt-4 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-1.5">
          Final stretch — {countdown.days === 0 ? 'due today' : `${countdown.days} day${countdown.days === 1 ? '' : 's'} left`}
        </div>
      )}
    </div>
  );
}
