import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Flame, Printer, TrendingUp, Gauge, CalendarHeart } from 'lucide-react';
import type { AppState } from '../types';
import {
  computeWeeklyTrends,
  computeEstimateCoach,
  computeStreakStats,
  computeWeeklyDigest,
} from '../utils';

// Detect dark mode for Recharts, which needs concrete color values
function useIsDark(): boolean {
  // Safe initial read; falls back to media query on change
  const [isDark, setIsDark] = React.useState(
    () => document.documentElement.classList.contains('dark')
  );
  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

interface AnalyticsViewProps {
  state: AppState;
}

export function AnalyticsView({ state }: AnalyticsViewProps) {
  const isDark = useIsDark();
  // Aggregate all tasks
  const allTasks = useMemo(() => state.goals.flatMap(g => g.tasks), [state.goals]);
  const completedTasks = useMemo(() => allTasks.filter(t => t.completed && t.completedAt), [allTasks]);

  // Calculate last 28 days of completion
  const chartData = useMemo(() => {
    const data: { date: string, dateLabel: string, completed: number }[] = [];
    const today = new Date();
    
    // Create map for easy lookup
    const countsByDay: Record<string, number> = {};
    completedTasks.forEach(t => {
      const day = t.completedAt!.split('T')[0];
      countsByDay[day] = (countsByDay[day] || 0) + 1;
    });

    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      data.push({
        date: dayStr,
        dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        completed: countsByDay[dayStr] || 0
      });
    }
    return data;
  }, [completedTasks]);

  // Stats: Most productive day
  const mostProductiveDay = useMemo(() => {
    let max = 0;
    let label = 'N/A';
    chartData.forEach(d => {
      if (d.completed > max) {
        max = d.completed;
        label = d.dateLabel;
      }
    });
    return max > 0 ? `${label} (${max} tasks)` : 'N/A';
  }, [chartData]);

  // Stats: Avg time to completion (all time)
  const avgTimeToCompletion = useMemo(() => {
    if (completedTasks.length === 0) return 'N/A';
    
    let totalMs = 0;
    let count = 0;
    completedTasks.forEach(t => {
      if (t.createdAt && t.completedAt) {
        const created = new Date(t.createdAt).getTime();
        const completed = new Date(t.completedAt).getTime();
        totalMs += (completed - created);
        count++;
      }
    });
    
    if (count === 0) return 'N/A';
    const avgMs = totalMs / count;
    
    const days = Math.floor(avgMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((avgMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return `< 1h`;
  }, [completedTasks]);

  // Stats: Estimate accuracy (completed tasks with estimates and logged time)
  const estimateAccuracy = useMemo(() => {
    const withBoth = completedTasks.filter((t) => t.estimatedMinutes && t.actualMinutes > 0);
    if (withBoth.length === 0) return 'N/A';
    const est = withBoth.reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0);
    const act = withBoth.reduce((s, t) => s + t.actualMinutes, 0);
    const pct = Math.round((act / est) * 100);
    return `${pct}% of estimate`;
  }, [completedTasks]);

  const trends = useMemo(() => computeWeeklyTrends(state, 8), [state]);
  const coach = useMemo(() => computeEstimateCoach(state), [state]);
  const streak = useMemo(() => computeStreakStats(state, 84), [state]);
  const digest = useMemo(() => computeWeeklyDigest(state), [state]);

  const heatmapColor = (count: number): string => {
    if (count === 0) return isDark ? '#262626' : '#e5e7eb';
    if (count <= 1) return isDark ? '#1e3a8a' : '#bfdbfe';
    if (count <= 3) return isDark ? '#1d4ed8' : '#60a5fa';
    return isDark ? '#3b82f6' : '#2563eb';
  };

  return (
    <div className="p-6 max-w-5xl w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-neutral-100">Analytics</h2>
        <button
          onClick={() => window.print()}
          className="focus-ring flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg
            bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700
            text-slate-600 dark:text-neutral-300 transition-colors print:hidden"
          title="Print / save as PDF report"
        >
          <Printer size={13} />
          Print report
        </button>
      </div>

      {/* Weekly digest banner */}
      <div className="card p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <CalendarHeart size={15} className="text-blue-500" aria-hidden />
          <h3 className="text-sm font-medium text-slate-800 dark:text-neutral-200">Last 7 Days</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-bold text-blue-500">{digest.completed}</p>
            <p className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase tracking-widest">Tasks done</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-400">{Math.round(digest.focusMinutes / 60 * 10) / 10}h</p>
            <p className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase tracking-widest">Focus time</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-violet-500">{digest.added}</p>
            <p className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase tracking-widest">Tasks added</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-400">{digest.reflections}</p>
            <p className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase tracking-widest">Reflections</p>
          </div>
        </div>
        {/* Mini bar row */}
        <div className="flex items-end gap-1 mt-4 h-8">
          {digest.days.map((d) => {
            const max = Math.max(...digest.days.map((x) => x.completed), 1);
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.completed} tasks`}>
                <div
                  className="w-full rounded-t bg-blue-500/80"
                  style={{ height: `${Math.max(4, (d.completed / max) * 100)}%` }}
                />
                <span className="text-[8px] text-slate-400 dark:text-neutral-600">{d.date.slice(8)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-6 flex flex-col justify-center">
          <p className="text-xs text-slate-400 dark:text-neutral-500 uppercase tracking-widest mb-1">Most Productive Day (Last 4 Weeks)</p>
          <p className="text-2xl font-bold text-blue-500">{mostProductiveDay}</p>
        </div>
        <div className="card p-6 flex flex-col justify-center">
          <p className="text-xs text-slate-400 dark:text-neutral-500 uppercase tracking-widest mb-1">Avg Time-to-Completion</p>
          <p className="text-2xl font-bold text-emerald-400">{avgTimeToCompletion}</p>
        </div>
        <div className="card p-6 flex flex-col justify-center">
          <p className="text-xs text-slate-400 dark:text-neutral-500 uppercase tracking-widest mb-1">Focus Time vs Estimates</p>
          <p className="text-2xl font-bold text-violet-500">{estimateAccuracy}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="card p-6 mb-6">
        <h3 className="text-sm font-medium text-slate-700 dark:text-neutral-300 mb-6">Tasks Completed per Day (Last 4 Weeks)</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#262626' : '#e5e7eb'} vertical={false} />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 11, fill: isDark ? '#737373' : '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                minTickGap={20}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: isDark ? '#737373' : '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: isDark ? '#26262655' : '#f3f4f6' }}
                contentStyle={{
                  backgroundColor: isDark ? '#171717' : '#ffffff',
                  border: `1px solid ${isDark ? '#262626' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                itemStyle={{ color: isDark ? '#60a5fa' : '#2563eb' }}
                labelStyle={{ color: isDark ? '#a3a3a3' : '#6b7280', marginBottom: '4px' }}
              />
              <Bar dataKey="completed" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.completed > 0 ? '#2563eb' : (isDark ? '#262626' : '#e5e7eb')}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Premium: weekly trends */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={15} className="text-blue-500" aria-hidden />
          <h3 className="text-sm font-medium text-slate-700 dark:text-neutral-300">Completion Trends (Last 8 Weeks)</h3>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#262626' : '#e5e7eb'} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: isDark ? '#737373' : '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: isDark ? '#737373' : '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#171717' : '#ffffff',
                  border: `1px solid ${isDark ? '#262626' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Line type="monotone" dataKey="completed" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="focusMinutes" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} name="Focus minutes" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Premium: estimation coach + streak */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Gauge size={15} className="text-violet-500" aria-hidden />
            <h3 className="text-sm font-medium text-slate-700 dark:text-neutral-300">Estimation Coach</h3>
          </div>
          {coach.samples === 0 ? (
            <p className="text-xs text-slate-400 dark:text-neutral-500">{coach.advice}</p>
          ) : (
            <>
              <p className="text-3xl font-bold text-violet-500 mb-1">{Math.round(coach.avgRatio * 100)}%</p>
              <p className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase tracking-widest mb-3">
                of estimates used ({coach.samples} tasks)
              </p>
              <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">{coach.advice}</p>
              <p className="text-[10px] text-slate-400 dark:text-neutral-600 mt-2">
                Over-estimated: {coach.overestimate} · Under-estimated: {coach.underestimate}
              </p>
            </>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Flame size={15} className="text-amber-400" aria-hidden />
            <h3 className="text-sm font-medium text-slate-700 dark:text-neutral-300">Streak</h3>
          </div>
          <div className="flex items-baseline gap-4 mb-4">
            <p className="text-3xl font-bold text-amber-400">{streak.current}</p>
            <p className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase tracking-widest">current day streak</p>
            <p className="text-sm font-semibold text-slate-500 dark:text-neutral-400 ml-auto">best: {streak.best}</p>
          </div>
          {/* 12-week heatmap */}
          <div className="grid grid-flow-col grid-rows-7 gap-0.5" style={{ gridAutoColumns: '10px' }}>
            {streak.heatmap.map((d) => (
              <span
                key={d.date}
                title={`${d.date}: ${d.count} completed`}
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: heatmapColor(d.count) }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
