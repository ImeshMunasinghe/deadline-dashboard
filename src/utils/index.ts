import type { CountdownState, Goal, AppState, Priority, Task, ViewType } from '../types';

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
  // For date-only strings (YYYY-MM-DD), treat end-of-that-day as the cutoff
  // so a task due today is NOT overdue until the day actually ends.
  const due = new Date(dueDateISO);
  const endOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate(), 23, 59, 59, 999);
  return endOfDue.getTime() < Date.now();
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

// ─── Pomodoro Timer (wall-clock / background-safe) ─────────────────────────
// The countdown is stored as an absolute `endsAt` timestamp and derived from
// the wall clock on every tick. This means background-tab throttling (or even
// a sessionStorage-restored refresh) cannot lose time — when the tab is
// revisited, the timer catches up instantly and completes any finished phase.

export const POMODORO_FOCUS_SECONDS = 25 * 60;
export const POMODORO_BREAK_SECONDS = 5 * 60;

export type PomodoroPhase = 'focus' | 'break';

export interface PomodoroTick {
  phase: PomodoroPhase;
  endsAt: number; // absolute epoch ms when the current phase ends
  running: boolean;
  sessions: number; // completed focus sessions so far
  secondsLeft: number;
  completedFocus: number; // focus sessions completed during this tick (0 or 1)
}

export function computePomodoroTick(
  phase: PomodoroPhase,
  endsAt: number,
  running: boolean,
  sessions: number,
  now: number
): PomodoroTick {
  if (!running || now < endsAt) {
    return {
      phase,
      endsAt,
      running,
      sessions,
      secondsLeft: Math.max(0, Math.ceil((endsAt - now) / 1000)),
      completedFocus: 0,
    };
  }

  // A phase finished while we weren't looking (throttled/background). The timer
  // stops after each phase, so at most one phase completes in the elapsed gap.
  const didCompleteFocus = phase === 'focus';
  const nextPhase: PomodoroPhase = didCompleteFocus ? 'break' : 'focus';
  const durMs = (nextPhase === 'focus' ? POMODORO_FOCUS_SECONDS : POMODORO_BREAK_SECONDS) * 1000;
  const nextEndsAt = endsAt + durMs;

  return {
    phase: nextPhase,
    endsAt: nextEndsAt,
    running: false,
    sessions: sessions + (didCompleteFocus ? 1 : 0),
    secondsLeft: Math.max(0, Math.ceil((nextEndsAt - now) / 1000)),
    completedFocus: didCompleteFocus ? 1 : 0,
  };
}

// ─── PWA Launch Params ────────────────────────────────────────────────────
// Parses the manifest-shortcut deep-link params (?view=&capture=&focus=).
// Unknown or missing values are ignored.

export interface LaunchParams {
  view: ViewType | null;
  capture: boolean;
  focus: boolean;
}

const VIEW_TYPES: ViewType[] = ['calendar', 'today', 'planner', 'timeline', 'analytics', 'goal', 'inbox', 'importexport', 'reflection'];

export function parseLaunchParams(search: string): LaunchParams {
  // Tolerate both window.location.search ('?a=b') and full-path forms ('/?a=b'):
  // URLSearchParams only strips a leading '?', not a leading path.
  const params = new URLSearchParams(search.slice(search.indexOf('?') + 1));
  const view = params.get('view');
  return {
    view: view ? VIEW_TYPES.find((v) => v === view) ?? null : null,
    capture: params.get('capture') === '1',
    focus: params.get('focus') === '1',
  };
}

// ─── State Normalization (migration for stored data) ──────────────────────
// Ensures tasks carry fields added after initial release (e.g. actualMinutes).

export function normalizeState(state: AppState): AppState {
  const fixTask = (t: Task): Task => ({
    id: t.id,
    text: t.text,
    completed: t.completed ?? false,
    priority: t.priority ?? 'medium',
    dueDate: t.dueDate ?? null,
    subtasks: (t.subtasks ?? []).map((s) => ({ id: s.id, text: s.text, completed: s.completed ?? false })),
    createdAt: t.createdAt ?? new Date().toISOString(),
    completedAt: t.completedAt ?? null,
    estimatedMinutes: t.estimatedMinutes ?? null,
    actualMinutes: t.actualMinutes ?? 0,
    recurrence: t.recurrence ?? null,
    blockedBy: t.blockedBy ?? null,
  });
  return {
    ...state,
    goals: (state.goals ?? []).map((g, i) => ({ ...g, color: normalizeGoalColor(g.color, i), tasks: (g.tasks ?? []).map(fixTask) })),
    inbox: (state.inbox ?? []).map(fixTask),
    templates: (state.templates ?? []).map((g, i) => ({ ...g, color: normalizeGoalColor(g.color, i), tasks: (g.tasks ?? []).map(fixTask) })),
    plans: state.plans ?? {},
    routines: (state.routines ?? []).map((r) => ({
      id: r.id,
      title: r.title ?? '',
      goalId: r.goalId ?? '',
      taskTexts: r.taskTexts ?? [],
      frequency: r.frequency ?? 'daily',
    })),
    remindersEnabled: state.remindersEnabled ?? true,
    reminderLeadHours: state.reminderLeadHours ?? 24,
    focusTargetId: state.focusTargetId ?? null,
  };
}

// ─── Deadline Notifications ───────────────────────────────────────────────
// Computes plain-text notifications for deadlines due soon / today / overdue.
// Deduped per day via a localStorage key so reminders fire once per task per day.

export interface DeadlineNotification {
  id: string; // dedupe key: date + task/goal id
  tag: string; // stable per-notification tag so repeated fires replace rather than stack
  title: string;
  body: string;
}

export function computeDeadlineNotifications(
  state: AppState,
  now: Date = new Date(),
  leadHours: number = 24
): DeadlineNotification[] {
  const notifications: DeadlineNotification[] = [];
  const todayStr = now.toISOString().split('T')[0];
  const leadMs = leadHours * 60 * 60 * 1000;
  const leadCutoff = now.getTime() + leadMs;

  for (const goal of state.goals) {
    const deadline = new Date(goal.targetDate).getTime();
    if (deadline > now.getTime() && deadline <= leadCutoff) {
      const hours = Math.max(1, Math.round((deadline - now.getTime()) / (1000 * 60 * 60)));
      notifications.push({
        id: `${todayStr}-goal-${goal.id}`,
        tag: `goal-${goal.id}`,
        title: 'Deadline approaching',
        body: `"${goal.title}" is due in ${hours} hour${hours === 1 ? '' : 's'}.`,
      });
    }

    for (const task of goal.tasks) {
      if (task.completed) continue;
      if (task.dueDate && task.dueDate.split('T')[0] === todayStr) {
        notifications.push({
          id: `${todayStr}-task-${task.id}`,
          tag: `task-${task.id}`,
          title: 'Task due today',
          body: `"${task.text}" (${goal.title})`,
        });
      } else if (task.dueDate && new Date(task.dueDate).getTime() < now.getTime()) {
        notifications.push({
          id: `${todayStr}-task-${task.id}`,
          tag: `task-${task.id}`,
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

// ─── Notification Delivery ─────────────────────────────────────────────────
// Thin wrappers around the Web Notifications API plus an in-app toast fallback
// so reminders still surface in browsers that block native notifications.

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

// Fires a native notification if permitted. Returns true if a native notification
// was shown (caller can use this to decide whether to show an in-app toast).
export function deliverNotification(n: DeadlineNotification): boolean {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false;
  try {
    new Notification(n.title, { body: n.body, tag: n.tag, icon: '/favicon.svg' });
    return true;
  } catch {
    return false;
  }
}

// Clears today's dedupe keys so reminders can re-fire (e.g. after the user
// grants permission mid-session).
export function clearTodayNotified(): void {
  try {
    const prefix = todayISO();
    const sent: string[] = JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? '[]');
    const kept = sent.filter((id) => !id.startsWith(prefix));
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(kept));
  } catch {
    /* ignore */
  }
}

// End-of-day rollover: drop dedupe keys from previous days so the list stays small.
export function pruneOldNotified(): void {
  try {
    const prefix = todayISO();
    const sent: string[] = JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? '[]');
    const kept = sent.filter((id) => id.startsWith(prefix));
    if (kept.length !== sent.length) {
      localStorage.setItem(NOTIFIED_KEY, JSON.stringify(kept));
    }
  } catch {
    /* ignore */
  }
}

// Computes, dedupes, and delivers pending deadline notifications.
// Returns the list of notifications that were surfaced (native or toast).
// `onToast` is called for each notification that could not be delivered natively.
export function scheduleDeadlineNotifications(
  state: AppState,
  now: Date = new Date(),
  onToast?: (n: DeadlineNotification) => void
): DeadlineNotification[] {
  pruneOldNotified();
  const pending = filterUnnotified(
    computeDeadlineNotifications(state, now, state.reminderLeadHours)
  );
  for (const n of pending) {
    const delivered = deliverNotification(n);
    if (!delivered && onToast) onToast(n);
  }
  return pending;
}

// ─── In-App Toast Fallback ─────────────────────────────────────────────────
// A tiny pub/sub toast queue used when native notifications are unavailable.
// Components subscribe via useToasts(); any code calls showToast().

export interface Toast {
  id: string;
  message: string;
  variant: 'info' | 'warning' | 'success';
}

type Listener = (toasts: Toast[]) => void;
const listeners = new Set<Listener>();
let queue: Toast[] = [];
let seq = 0;

function emit(): void {
  listeners.forEach((l) => l(queue));
}

export function showToast(message: string, variant: Toast['variant'] = 'info'): void {
  const id = `toast-${Date.now()}-${seq++}`;
  queue = [...queue, { id, message, variant }];
  emit();
  // Auto-dismiss after 6s
  setTimeout(() => {
    queue = queue.filter((t) => t.id !== id);
    emit();
  }, 6000);
}

export function dismissToast(id: string): void {
  queue = queue.filter((t) => t.id !== id);
  emit();
}

export function subscribeToToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(queue);
  return () => listeners.delete(listener);
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

export type { HolidayInfo } from './holidays';
export { getSriLankanHolidayMap } from './holidays';
export * from './insights';
export * from './smartAdd';
export {
  buildICS, downloadICS, parseICS,
  type IcsEvent,
} from './ics';
import type { HolidayInfo } from './holidays';

// ─── Goal Colors ──────────────────────────────────────────────────────────
// Each goal carries a color used as a pastel tint for its tasks/milestones on
// the calendar and elsewhere. Colors are stored as 6-digit hex strings picked
// to stay readable on both light and dark themes.
export const GOAL_COLOR_PALETTE: readonly string[] = [
  '#3b82f6', // blue
  '#f97316', // orange
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#eab308', // amber
  '#ef4444', // red
];

// Legacy goals stored a Tailwind class instead of a hex value.
const LEGACY_GOAL_COLORS: Record<string, string> = {
  'bg-blue-600': '#3b82f6',
};

// Returns a valid 6-digit hex color (lowercased). Falls back to the palette
// entry at `index` (pass the goal's position so goals get distinct colors).
export function normalizeGoalColor(color: string | undefined | null, index = 0): string {
  const trimmed = (color ?? '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (LEGACY_GOAL_COLORS[trimmed]) return LEGACY_GOAL_COLORS[trimmed];
  return GOAL_COLOR_PALETTE[index % GOAL_COLOR_PALETTE.length];
}

// True when the string is a 6-digit hex color (tailwind-class legacy values
// are fine too and will be normalized to the default palette color).
export function isGoalColor(color: string | undefined | null): boolean {
  return !!color && /^#[0-9a-fA-F]{6}$/.test(color.trim());
}

// Pastel hint: the goal color at low (~15%) alpha so it reads as a soft wash in
// both light and dark themes rather than a solid fill.
export function goalTint(color: string): string {
  return `${normalizeGoalColor(color)}26`;
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
  holidays: HolidayInfo[];  // Sri Lankan public holidays (filled when a holiday map is provided)
}

// Flatten all dated items in state into a map of date → events.
// `holidayMap` (optional): date → Sri Lankan holidays for the visible year,
// as produced by getSriLankanHolidayMap.
export function collectCalendarEvents(
  state: AppState,
  today: Date = new Date(),
  holidayMap?: Map<string, HolidayInfo[]>
): Map<string, CalendarDayEvents> {
  const map = new Map<string, CalendarDayEvents>();
  // Use local date components — toISOString() is UTC and can be a day behind in UTC+5:30
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const push = (date: string, event: CalendarEvent) => {
    if (!map.has(date)) {
      map.set(date, { goals: [], tasks: [], milestones: [], overdue: [], holidays: [] });
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

  // Merge holidays into the day map (a date can have a holiday but no events)
  if (holidayMap) {
    for (const [date, holidays] of holidayMap) {
      if (holidays.length === 0) continue;
      if (!map.has(date)) {
        map.set(date, { goals: [], tasks: [], milestones: [], overdue: [], holidays: [] });
      }
      map.get(date)!.holidays.push(...holidays);
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
