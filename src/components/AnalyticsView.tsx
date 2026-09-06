import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import type { AppState, AppAction } from '../types';

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
  dispatch: React.Dispatch<AppAction>;
}

export function AnalyticsView({ state, dispatch }: AnalyticsViewProps) {
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

  return (
    <div className="p-6 max-w-5xl w-full mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-neutral-100">Analytics</h2>

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

      {/* Reflections Journal */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-slate-800 dark:text-neutral-200">Daily Reflections</h3>
            <p className="text-xs text-slate-400 dark:text-neutral-500 mt-0.5">Your end-of-day journal entries</p>
          </div>
          <button
            onClick={() => {
              const todayStr = new Date().toISOString().split('T')[0];
              // Remove today's reflection so the modal reopens
              const hasToday = state.reflections.some(r => r.date === todayStr);
              if (hasToday) {
                // Remove so modal triggers again
                dispatch({ type: 'SAVE_REFLECTION', payload: { reflection: { date: '__trigger__', content: '' } } });
              }
              // We trigger DailyReflection modal via a custom event
              window.dispatchEvent(new CustomEvent('open-reflection'));
            }}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            + Write Today's Reflection
          </button>
        </div>

        {state.reflections.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-neutral-500">
            <p className="text-sm">No reflections yet.</p>
            <p className="text-xs mt-1">Reflections appear here after 5 PM each day, or click the button above.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {[...state.reflections]
              .filter(r => r.date !== '__trigger__' && r.content)
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((r, i) => (
                <div key={i} className="border border-slate-100 dark:border-neutral-800 rounded-lg p-4">
                  <p className="text-xs font-semibold text-blue-500 mb-2">
                    {new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">{r.content}</p>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}
