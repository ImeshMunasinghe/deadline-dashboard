import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { Goal } from '../types';
import { getTaskStats } from '../utils';

interface ProgressChartProps {
  goal: Goal;
}

// ── Build last-7-days burn-down data from completedAt timestamps ──────────
function buildBurnDownData(goal: Goal) {
  const total = goal.tasks.length;
  const today = new Date();
  const rows: { date: string; remaining: number; completed: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dayStr = d.toISOString().split('T')[0]; // YYYY-MM-DD

    // Count tasks completed ON or BEFORE this day
    const completedByDay = goal.tasks.filter((t) => {
      if (!t.completedAt) return false;
      return t.completedAt.split('T')[0] <= dayStr;
    }).length;

    rows.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      remaining: Math.max(0, total - completedByDay),
      completed: completedByDay,
    });
  }
  return rows;
}

// Custom tooltip for the burn-down chart
function BurnDownTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-500 dark:text-neutral-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className={p.name === 'remaining' ? 'text-blue-500' : 'text-emerald-400'}>
          {p.name === 'remaining' ? 'Remaining' : 'Completed'}: {p.value}
        </p>
      ))}
    </div>
  );
}

export function ProgressChart({ goal }: ProgressChartProps) {
  const stats = getTaskStats(goal);
  const [activeTab, setActiveTab] = useState<'donut' | 'burndown'>('donut');

  const data = [
    { name: 'Completed', value: stats.completed },
    { name: 'Remaining', value: stats.remaining },
  ];

  const isDark = document.documentElement.classList.contains('dark');
  const COLORS = ['#2563eb', isDark ? '#262626' : '#e2e8f0'];

  // Priority breakdown
  const highCount  = goal.tasks.filter((t) => t.priority === 'high').length;
  const medCount   = goal.tasks.filter((t) => t.priority === 'medium').length;
  const lowCount   = goal.tasks.filter((t) => t.priority === 'low').length;
  const highDone   = goal.tasks.filter((t) => t.priority === 'high' && t.completed).length;
  const medDone    = goal.tasks.filter((t) => t.priority === 'medium' && t.completed).length;
  const lowDone    = goal.tasks.filter((t) => t.priority === 'low' && t.completed).length;

  const burnDownData = buildBurnDownData(goal);

  return (
    <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6">
      {/* Tab header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium tracking-widest text-slate-400 dark:text-neutral-500 uppercase">
          Progress
        </h3>
        <div className="flex gap-1 bg-slate-100 dark:bg-neutral-800 rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab('donut')}
            className={`text-[10px] px-2.5 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'donut'
                ? 'bg-slate-200 dark:bg-neutral-700 text-slate-800 dark:text-neutral-200'
                : 'text-slate-400 dark:text-neutral-500 hover:text-slate-700 dark:text-neutral-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('burndown')}
            className={`text-[10px] px-2.5 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'burndown'
                ? 'bg-slate-200 dark:bg-neutral-700 text-slate-800 dark:text-neutral-200'
                : 'text-slate-400 dark:text-neutral-500 hover:text-slate-700 dark:text-neutral-300'
            }`}
          >
            Burn-Down
          </button>
        </div>
      </div>

      {stats.total === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
          <p className="text-sm text-slate-400 dark:text-neutral-600">No tasks yet</p>
          <p className="text-xs text-slate-400 dark:text-neutral-700">Add tasks to see your progress here.</p>
        </div>
      ) : activeTab === 'donut' ? (
        <>
          {/* Donut */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative w-24 h-24 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={44}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-bold text-slate-900 dark:text-neutral-100 leading-none">
                  {stats.percent}%
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                <span className="text-xs text-slate-500 dark:text-neutral-400">{stats.completed} completed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-200 dark:bg-neutral-700 shrink-0" />
                <span className="text-xs text-slate-500 dark:text-neutral-400">{stats.remaining} remaining</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-400 dark:text-neutral-500">{stats.total} total</span>
              </div>
            </div>
          </div>

          {/* Priority breakdown bars */}
          {stats.total > 0 && (
            <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-slate-200 dark:border-neutral-800">
              <p className="text-[10px] text-slate-400 dark:text-neutral-600 uppercase tracking-widest mb-1">By Priority</p>
              {[
                { label: 'High',   done: highDone, total: highCount, color: 'bg-red-500' },
                { label: 'Medium', done: medDone,  total: medCount,  color: 'bg-amber-500' },
                { label: 'Low',    done: lowDone,  total: lowCount,  color: 'bg-emerald-500' },
              ]
                .filter((p) => p.total > 0)
                .map((p) => (
                  <div key={p.label} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 dark:text-neutral-500 w-10 shrink-0">{p.label}</span>
                    <div className="flex-1 h-1 rounded-full bg-slate-100 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${p.color} transition-all`}
                        style={{ width: `${(p.done / p.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-neutral-600 w-8 text-right shrink-0">
                      {p.done}/{p.total}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </>
      ) : (
        /* ── Burn-Down chart ── */
        <div>
          <p className="text-[10px] text-slate-400 dark:text-neutral-600 mb-3">
            Remaining tasks over the past 7 days
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={burnDownData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="doneGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#262626' : '#e2e8f0'} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: isDark ? '#525252' : '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 9, fill: isDark ? '#525252' : '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<BurnDownTooltip />} />
              <Area
                type="monotone"
                dataKey="remaining"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#burnGrad)"
                dot={{ fill: '#2563eb', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 4, fill: '#60a5fa' }}
              />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#doneGrad)"
                dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 4, fill: '#34d399' }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 justify-center">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span className="text-[10px] text-slate-400 dark:text-neutral-500">Remaining</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-slate-400 dark:text-neutral-500">Completed</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}