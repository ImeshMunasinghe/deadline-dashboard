// ─── Insights: catch-up scheduling, trends, estimation coach, streaks, digest ─
// Pure helpers powering the premium analytics features. All operate on plain
// app state so they are trivially testable.

import type { AppState } from '../types';

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Feature 2: catch-up scheduling ────────────────────────────────────────
// Overdue incomplete tasks → list of updates to move them to today (or the
// next weekday for weekly-style catch-up when `skipWeekend` is set).

export interface RescheduleUpdate {
  goalId: string;
  taskId: string;
  from: string;
  to: string;
}

export function computeCatchUp(
  state: AppState,
  today: Date = new Date(),
  skipWeekend = false
): RescheduleUpdate[] {
  const todayStr = dayKey(today);
  const target = new Date(today);
  if (skipWeekend) {
    while (target.getDay() === 0 || target.getDay() === 6) target.setDate(target.getDate() + 1);
  }
  const to = dayKey(target);

  const updates: RescheduleUpdate[] = [];
  for (const goal of state.goals) {
    for (const task of goal.tasks) {
      if (task.completed || !task.dueDate) continue;
      const due = task.dueDate.split('T')[0];
      if (due < todayStr && due !== to) {
        updates.push({ goalId: goal.id, taskId: task.id, from: due, to });
      }
    }
  }
  return updates;
}

function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(d);
  monday.setDate(d.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export interface WeeklyTrend {
  weekStart: string; // Monday, YYYY-MM-DD
  label: string;
  completed: number;
  focusMinutes: number;
}

// ── Feature 6: completion trends ──────────────────────────────────────────
// Weekly completed-task counts for the last `weeks` weeks.

export function computeWeeklyTrends(state: AppState, weeks = 8, now: Date = new Date()): WeeklyTrend[] {
  const completedByWeek = new Map<string, number>();
  const focusByWeek = new Map<string, number>();
  const currentWeek = dayKey(startOfWeek(now));

  for (const goal of state.goals) {
    for (const task of goal.tasks) {
      if (task.completed && task.completedAt) {
        const key = dayKey(startOfWeek(new Date(task.completedAt)));
        completedByWeek.set(key, (completedByWeek.get(key) ?? 0) + 1);
      }
      if (task.actualMinutes > 0) {
        // Attribute logged focus time to the completion week, or current week
        const key = task.completedAt
          ? dayKey(startOfWeek(new Date(task.completedAt)))
          : currentWeek;
        focusByWeek.set(key, (focusByWeek.get(key) ?? 0) + task.actualMinutes);
      }
    }
  }

  const trends: WeeklyTrend[] = [];
  const cursor = startOfWeek(now);
  cursor.setDate(cursor.getDate() - (weeks - 1) * 7);
  for (let i = 0; i < weeks; i++) {
    const key = dayKey(cursor);
    trends.push({
      weekStart: key,
      label: cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      completed: completedByWeek.get(key) ?? 0,
      focusMinutes: focusByWeek.get(key) ?? 0,
    });
    cursor.setDate(cursor.getDate() + 7);
  }
  return trends;
}

// ── Feature 7: estimation coach ───────────────────────────────────────────

export interface EstimateCoach {
  samples: number;
  avgRatio: number; // actual / estimated; 1 = perfect, >1 = underestimating
  overestimate: number; // tasks finished well under estimate
  underestimate: number; // tasks way over estimate
  advice: string;
}

export function computeEstimateCoach(state: AppState): EstimateCoach {
  let ratioSum = 0;
  let samples = 0;
  let over = 0;
  let under = 0;

  for (const goal of state.goals) {
    for (const task of goal.tasks) {
      if (!task.completed || !task.estimatedMinutes || task.estimatedMinutes <= 0) continue;
      const ratio = task.actualMinutes / task.estimatedMinutes;
      ratioSum += ratio;
      samples++;
      if (ratio > 1.25) under++;
      else if (ratio < 0.75) over++;
    }
  }

  const avgRatio = samples > 0 ? ratioSum / samples : 0;
  let advice = 'Add time estimates to tasks to unlock coaching.';
  if (samples > 0) {
    if (avgRatio > 1.25) advice = `You average ${Math.round(avgRatio * 100)}% of your estimates. Try padding estimates by ${Math.round((avgRatio - 1) * 100)}%.`;
    else if (avgRatio < 0.75) advice = 'You finish faster than you plan. Tighten estimates to plan more per day.';
    else advice = 'Estimates are well calibrated. Keep it up.';
  }

  return { samples, avgRatio: Math.round(avgRatio * 100) / 100, overestimate: over, underestimate: under, advice };
}

// ── Feature 8: streak + heatmap ───────────────────────────────────────────

export interface StreakStats {
  current: number;
  best: number;
  heatmap: { date: string; count: number }[]; // oldest → newest, `days` entries
}

export function computeStreakStats(state: AppState, days = 84, now: Date = new Date()): StreakStats {
  const counts = new Map<string, number>();
  for (const goal of state.goals) {
    for (const task of goal.tasks) {
      if (task.completed && task.completedAt) {
        const key = task.completedAt.split('T')[0];
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }

  // Current streak: consecutive active days ending today (or yesterday, so
  // today-not-done-yet does not reset the streak).
  let current = 0;
  const cursor = new Date(now);
  if (!counts.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (counts.has(dayKey(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Best streak over all recorded history.
  const activeDays = [...counts.keys()].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of activeDays) {
    const d = new Date(key + 'T12:00:00');
    if (prev && d.getTime() - prev.getTime() === 24 * 60 * 60 * 1000) run++;
    else run = 1;
    if (run > best) best = run;
    prev = d;
  }

  // Heatmap for the last `days` days
  const heatmap: { date: string; count: number }[] = [];
  const hm = new Date(now);
  hm.setDate(hm.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const key = dayKey(hm);
    heatmap.push({ date: key, count: counts.get(key) ?? 0 });
    hm.setDate(hm.getDate() + 1);
  }

  return { current, best: Math.max(best, current), heatmap };
}

// ── Feature 9: weekly digest ──────────────────────────────────────────────

export interface WeeklyDigest {
  completed: number;
  focusMinutes: number;
  reflections: number;
  added: number;
  days: { date: string; completed: number }[]; // last 7 days, oldest → newest
}

export function computeWeeklyDigest(state: AppState, now: Date = new Date()): WeeklyDigest {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 6);
  const cutoffKey = dayKey(cutoff);
  const todayKey = dayKey(now);

  const dayCounts = new Map<string, number>();
  let completed = 0;
  let added = 0;
  let focusMinutes = 0;

  for (const goal of state.goals) {
    for (const task of goal.tasks) {
      if (task.completed && task.completedAt) {
        const key = task.completedAt.split('T')[0];
        if (key >= cutoffKey && key <= todayKey) {
          completed++;
          dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
        }
      }
      if (task.createdAt.split('T')[0] >= cutoffKey) added++;
      focusMinutes += task.actualMinutes;
    }
  }

  const days: { date: string; completed: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    days.push({ date: key, completed: dayCounts.get(key) ?? 0 });
  }

  const reflections = state.reflections.filter(
    (r) => r.date >= cutoffKey && r.date <= todayKey && r.date !== '__trigger__' && r.content
  ).length;

  return { completed, focusMinutes, reflections, added, days };
}
