import type { CountdownState, Goal, AppState } from '../types';

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