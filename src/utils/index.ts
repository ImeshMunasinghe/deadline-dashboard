import type { CountdownState, Goal, AppState, Priority, Task } from '../types';

// ─── ID Generation ────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Countdown Calculator ─────────────────────────────────────────────────
// Pure function — easy to unit-test with Vitest

export function computeCountdown(
  targetDateISO: string,
  createdAtISO: string
): CountdownState {
  const now = Date.now();
  const target = new Date(targetDateISO).getTime();
  const created = new Date(createdAtISO).getTime();

  const diff = target - now;

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      totalSeconds: 0,
      progressPercent: 100,
    };
  }

  const totalDuration = target - created;
  const elapsed = now - created;
  const progressPercent =
    totalDuration > 0
      ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
      : 0;

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isExpired: false, totalSeconds, progressPercent };
}

// ─── Task Stats ───────────────────────────────────────────────────────────

export function getTaskStats(goal: Goal) {
  const total = goal.tasks.length;
  const completed = goal.tasks.filter((t) => t.completed).length;
  const remaining = total - completed;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, remaining, percent };
}

// ─── Date Helpers ─────────────────────────────────────────────────────────

export function isOverdue(dueDateISO: string | null): boolean {
  if (!dueDateISO) return false;
  return new Date(dueDateISO).getTime() < Date.now();
}

export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Export / Import ──────────────────────────────────────────────────────

export function exportStateAsJSON(state: AppState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `deadline-dashboard-backup-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseImportedState(json: string): AppState | null {
  try {
    const parsed = JSON.parse(json) as AppState;
    // Basic validation
    if (!Array.isArray(parsed.goals)) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ─── URL Share Snapshot ───────────────────────────────────────────────────
// Encodes a read-only goal snapshot as a base64 URL param

export function encodeGoalShare(goal: Goal): string {
  const snapshot = JSON.stringify(goal);
  const encoded = btoa(unescape(encodeURIComponent(snapshot)));
  const url = new URL(window.location.href);
  url.searchParams.set('share', encoded);
  return url.toString();
}

export function decodeGoalShare(param: string): Goal | null {
  try {
    const json = decodeURIComponent(escape(atob(param)));
    return JSON.parse(json) as Goal;
  } catch {
    return null;
  }
}

// ─── Priority Sort Weight ─────────────────────────────────────────────────

export function priorityWeight(p: string): number {
  return p === 'high' ? 0 : p === 'medium' ? 1 : 2;
}

// ─── Daily Plan Computation ───────────────────────────────────────────────
// Pure function: picks an ordered, capacity-aware task queue for today.
// Selection heuristic (in priority order):
//   1. Overdue tasks (oldest due date first)
//   2. Tasks due today
//   3. Nearest upcoming tasks, only if capacity remains
// Within each group: priority weight, then deadline proximity.
// Blocked tasks (blockedBy an incomplete task) are skipped.

export interface PlanCandidate {
  taskId: string;
  goalId: string;
  dueDate: string | null;
  priority: Priority;
  estimatedMinutes: number;
}

export function computeDailyPlan(
  candidates: PlanCandidate[],
  blockedTaskIds: Set<string>,
  capacityMinutes: number = 360
): string[] {
  const todayStr = todayISO();
  const now = Date.now();

  const overdue = candidates.filter(
    (c) => c.dueDate && new Date(c.dueDate).getTime() < now && !blockedTaskIds.has(c.taskId)
  );
  const dueToday = candidates.filter(
    (c) => c.dueDate && c.dueDate.split('T')[0] === todayStr && !blockedTaskIds.has(c.taskId)
  );
  const upcoming = candidates.filter(
    (c) => c.dueDate && new Date(c.dueDate).getTime() >= endOfToday() && !blockedTaskIds.has(c.taskId)
  );
  const undated = candidates.filter((c) => !c.dueDate && !blockedTaskIds.has(c.taskId));

  const byPriorityThenDue = (a: PlanCandidate, b: PlanCandidate): number => {
    const pw = priorityWeight(a.priority) - priorityWeight(b.priority);
    if (pw !== 0) return pw;
    if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    return 0;
  };

  overdue.sort(byPriorityThenDue);
  dueToday.sort(byPriorityThenDue);
  upcoming.sort(byPriorityThenDue);
  undated.sort(byPriorityThenDue);

  const ordered = [...overdue, ...dueToday, ...upcoming, ...undated];

  // Greedy capacity fill: tasks without an estimate count as a fixed 30 min
  const chosen: string[] = [];
  let used = 0;
  for (const c of ordered) {
    const cost = c.estimatedMinutes || 30;
    if (used + cost > capacityMinutes) continue;
    chosen.push(c.taskId);
    used += cost;
    if (used >= capacityMinutes) break;
  }
  return chosen;
}

function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

// ─── Goal Pace Tracker ────────────────────────────────────────────────────
// Compares completion pace against the pace required to finish on time.

export type PaceStatus = 'ahead' | 'on-track' | 'behind' | 'at-risk' | 'done' | 'no-deadline';

export interface GoalPace {
  status: PaceStatus;
  tasksPerDayNeeded: number; // remaining tasks per remaining day
  tasksPerDayActual: number; // completed tasks per elapsed day
}

export function computePace(goal: Goal, now: Date = new Date()): GoalPace {
  const total = goal.tasks.length;
  const completed = goal.tasks.filter((t) => t.completed).length;
  const remaining = total - completed;

  if (total === 0) return { status: 'on-track', tasksPerDayNeeded: 0, tasksPerDayActual: 0 };
  if (remaining === 0) return { status: 'done', tasksPerDayNeeded: 0, tasksPerDayActual: 0 };

  const created = new Date(goal.createdAt).getTime();
  const target = new Date(goal.targetDate).getTime();
  const nowMs = now.getTime();

  if (!isFinite(created) || !isFinite(target) || target <= nowMs) {
    // Expired deadline with tasks remaining
    return { status: 'at-risk', tasksPerDayNeeded: remaining, tasksPerDayActual: 0 };
  }

  const daysLeft = Math.max(1, Math.ceil((target - nowMs) / (1000 * 60 * 60 * 24)));
  const daysElapsed = Math.max(1, Math.ceil((nowMs - created) / (1000 * 60 * 60 * 24)));

  const needed = remaining / daysLeft;
  const actual = completed / daysElapsed;
  const ratio = needed === 0 ? Infinity : actual / needed;

  let status: PaceStatus;
  if (ratio >= 1.1) status = 'ahead';
  else if (ratio >= 0.8) status = 'on-track';
  else if (ratio >= 0.5) status = 'behind';
  else status = 'at-risk';

  return { status, tasksPerDayNeeded: Math.round(needed * 10) / 10, tasksPerDayActual: Math.round(actual * 10) / 10 };
}

// ─── State Normalization (migration for stored data) ──────────────────────
// Ensures tasks carry fields added after initial release (e.g. actualMinutes).

export function normalizeState(state: AppState): AppState {
  const fixTask = (t: Task): Task => ({ ...t, actualMinutes: t.actualMinutes ?? 0 });
  return {
    ...state,
    goals: (state.goals ?? []).map((g) => ({ ...g, tasks: (g.tasks ?? []).map(fixTask) })),
    inbox: (state.inbox ?? []).map(fixTask),
    templates: (state.templates ?? []).map((g) => ({ ...g, tasks: (g.tasks ?? []).map(fixTask) })),
  };
}

// ─── Deadline Notifications ───────────────────────────────────────────────
// Computes plain-text notifications for deadlines due soon / today / overdue.
// Deduped per day via a localStorage key so reminders fire once per task per day.

export interface DeadlineNotification {
  id: string; // dedupe key: date + task/goal id
  title: string;
  body: string;
}

export function computeDeadlineNotifications(state: AppState, now: Date = new Date()): DeadlineNotification[] {
  const notifications: DeadlineNotification[] = [];
  const todayStr = now.toISOString().split('T')[0];
  const in24h = now.getTime() + 24 * 60 * 60 * 1000;

  for (const goal of state.goals) {
    const deadline = new Date(goal.targetDate).getTime();
    if (deadline > now.getTime() && deadline <= in24h) {
      const hours = Math.max(1, Math.round((deadline - now.getTime()) / (1000 * 60 * 60)));
      notifications.push({
        id: `${todayStr}-goal-${goal.id}`,
        title: 'Deadline approaching',
        body: `"${goal.title}" is due in ${hours} hour${hours === 1 ? '' : 's'}.`,
      });
    }

    for (const task of goal.tasks) {
      if (task.completed) continue;
      if (task.dueDate && task.dueDate.split('T')[0] === todayStr) {
        notifications.push({
          id: `${todayStr}-task-${task.id}`,
          title: 'Task due today',
          body: `"${task.text}" (${goal.title})`,
        });
      } else if (task.dueDate && new Date(task.dueDate).getTime() < now.getTime()) {
        notifications.push({
          id: `${todayStr}-task-${task.id}`,
          title: 'Overdue task',
          body: `"${task.text}" (${goal.title})`,
        });
      }
    }
  }
  return notifications;
}

const NOTIFIED_KEY = 'deadline-dashboard-notified';

export function filterUnnotified(notifications: DeadlineNotification[]): DeadlineNotification[] {
  try {
    const sent: string[] = JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? '[]');
    const pending = notifications.filter((n) => !sent.includes(n.id));
    if (pending.length > 0) {
      // Keep only today's keys so the list does not grow forever
      const todayPrefix = todayISO();
      const kept = [...sent, ...pending.map((n) => n.id)].filter((id) => id.startsWith(todayPrefix));
      localStorage.setItem(NOTIFIED_KEY, JSON.stringify(kept));
    }
    return pending;
  } catch {
    return notifications;
  }
}

// ─── Calendar Grid ────────────────────────────────────────────────────────
// Pure helpers for the month calendar view.

export interface CalendarDay {
  date: string;        // YYYY-MM-DD
  dayOfMonth: number;
  inMonth: boolean;    // false for leading/trailing padding days
  isToday: boolean;
}

// Build a 6-week grid (42 cells) covering the month, weeks starting Monday.
export function buildMonthGrid(year: number, month: number /* 0-11 */, today: Date = new Date()): CalendarDay[] {
  const first = new Date(year, month, 1);
  // Monday-based offset (getDay: 0=Sun..6=Sat)
  const offset = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - offset);

  const localDateStr = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayStr = localDateStr(today);
  const days: CalendarDay[] = [];

  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const date = localDateStr(d);
    days.push({
      date,
      dayOfMonth: d.getDate(),
      inMonth: d.getMonth() === month,
      isToday: date === todayStr,
    });
  }
  return days;
}

export interface CalendarEvent {
  kind: 'goal' | 'task' | 'milestone';
  id: string;
  title: string;
  date: string;      // YYYY-MM-DD
  goalId: string;
  goalTitle: string;
  goalColor: string;
  priority?: Priority;
  completed?: boolean;
}

export interface CalendarDayEvents {
  goals: CalendarEvent[];
  tasks: CalendarEvent[];
  milestones: CalendarEvent[];
  overdue: CalendarEvent[]; // tasks whose dueDate < today (surfaced on the day cell they're due... kept on due date)
}

// Flatten all dated items in state into a map of date → events.
export function collectCalendarEvents(
  state: AppState,
  today: Date = new Date()
): Map<string, CalendarDayEvents> {
  const map = new Map<string, CalendarDayEvents>();
  const todayStr = today.toISOString().split('T')[0];

  const push = (date: string, event: CalendarEvent) => {
    if (!map.has(date)) {
      map.set(date, { goals: [], tasks: [], milestones: [], overdue: [] });
    }
    map.get(date)![event.kind === 'goal' ? 'goals' : event.kind === 'task' ? 'tasks' : 'milestones'].push(event);
    if (event.kind === 'task' && !event.completed && event.date < todayStr) {
      map.get(date)!.overdue.push(event);
    }
  };

  for (const goal of state.goals) {
    push(goal.targetDate.split('T')[0], {
      kind: 'goal',
      id: goal.id,
      title: goal.title,
      date: goal.targetDate.split('T')[0],
      goalId: goal.id,
      goalTitle: goal.title,
      goalColor: goal.color,
    });

    for (const milestone of goal.milestones) {
      push(milestone.date.split('T')[0], {
        kind: 'milestone',
        id: milestone.id,
        title: milestone.label,
        date: milestone.date.split('T')[0],
        goalId: goal.id,
        goalTitle: goal.title,
        goalColor: goal.color,
      });
    }

    for (const task of goal.tasks) {
      if (!task.dueDate) continue;
      push(task.dueDate.split('T')[0], {
        kind: 'task',
        id: task.id,
        title: task.text,
        date: task.dueDate.split('T')[0],
        goalId: goal.id,
        goalTitle: goal.title,
        goalColor: goal.color,
        priority: task.priority,
        completed: task.completed,
      });
    }
  }
  return map;
}

// Sort events within a day: incomplete before complete, then priority, then goals/milestones
export function sortCalendarEvents(events: CalendarDayEvents): CalendarEvent[] {
  const rank = (e: CalendarEvent): number => {
    if (e.kind !== 'task') return e.kind === 'goal' ? 0 : 3;
    if (e.completed) return 4;
    return 1 + priorityWeight(e.priority ?? 'low');
  };
  return [...events.goals, ...events.tasks, ...events.milestones].sort((a, b) => rank(a) - rank(b));
}