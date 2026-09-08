// ─── Natural-language smart add ────────────────────────────────────────────
// Shared parser used by TaskList and QuickCapture. Handles:
//   !high/!low/!medium   priority
//   ~45 or ~1.5h          estimate (minutes)
//   every day/mon/month   recurrence
//   today / tomorrow / weekday / YYYY-MM-DD   due date
//   after:<task text>     dependency (blockedBy)

import type { Priority } from '../types';

export interface SmartAddOptions {
  currentPriority?: Priority;
  currentDue?: string | null;
  tasks?: { id: string; text: string; dueDate: string | null }[];
  now?: Date;
}

export interface SmartAddResult {
  text: string;
  priority: Priority;
  dueDate: string | null;
  estimatedMinutes: number | null;
  recurrence: 'daily' | 'weekly' | 'monthly' | null;
  blockedBy: string | null;
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseSmartInput(raw: string, options: SmartAddOptions = {}): SmartAddResult {
  let input = raw;
  let priority: Priority = options.currentPriority ?? 'medium';
  let dueDate: string | null = options.currentDue ?? null;
  let estimatedMinutes: number | null = null;
  let recurrence: 'daily' | 'weekly' | 'monthly' | null = null;
  let blockedBy: string | null = null;
  const today = options.now ?? new Date();

  const priMatch = input.match(/\s*!(high|h|medium|med|m|low|l)\b/i);
  if (priMatch) {
    const p = priMatch[1].toLowerCase();
    priority = p.startsWith('h') ? 'high' : p.startsWith('l') ? 'low' : 'medium';
    input = input.replace(priMatch[0], '');
  }

  const estMatch = input.match(/\s*~(\d+(?:\.\d+)?)\s*(m|min|h|hr)?\b/i);
  if (estMatch) {
    const val = parseFloat(estMatch[1]);
    const unit = (estMatch[2] ?? 'm').toLowerCase();
    estimatedMinutes = unit.startsWith('h') ? Math.round(val * 60) : Math.round(val);
    input = input.replace(estMatch[0], '');
  }

  const recMatch = input.match(/\s*every\s+(daily|mon|monday|weekly|month|monthly)\b/i);
  if (recMatch) {
    const r = recMatch[1].toLowerCase();
    recurrence = r === 'mon' || r === 'monday' ? 'weekly' : r === 'daily' ? 'daily' : 'monthly';
    input = input.replace(recMatch[0], '');
    if (recurrence === 'weekly' && !dueDate) {
      const target = 1; // Monday
      const diff = (target - today.getDay() + 7) % 7 || 7;
      const next = new Date(today);
      next.setDate(next.getDate() + diff);
      dueDate = iso(next);
    }
  }

  const dateMatch = input.match(/\s+(today|tomorrow|mon|tue|wed|thu|fri|sat|sun|\d{4}-\d{2}-\d{2})\b/i);
  if (dateMatch) {
    const token = dateMatch[1].toLowerCase();
    if (token === 'today') {
      dueDate = iso(today);
    } else if (token === 'tomorrow') {
      const tom = new Date(today);
      tom.setDate(tom.getDate() + 1);
      dueDate = iso(tom);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(token)) {
      dueDate = token;
    } else {
      const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const target = days.indexOf(token);
      if (target !== -1) {
        const diff = (target - today.getDay() + 7) % 7 || 7;
        const next = new Date(today);
        next.setDate(next.getDate() + diff);
        dueDate = iso(next);
      }
    }
    input = input.replace(dateMatch[0], '');
  }

  const blockMatch = input.match(/\s*after:([\s\S]+)$/i);
  if (blockMatch) {
    const targetText = blockMatch[1].trim().toLowerCase();
    const match = options.tasks?.find((t) => t.text.toLowerCase() === targetText);
    blockedBy = match ? match.id : null;
    input = input.replace(blockMatch[0], '');
    if (blockedBy && !dueDate) {
      const blocker = options.tasks?.find((t) => t.id === blockedBy);
      if (blocker && blocker.dueDate) dueDate = blocker.dueDate.split('T')[0];
    }
  }

  return {
    text: input.trim(),
    priority,
    dueDate,
    estimatedMinutes,
    recurrence,
    blockedBy,
  };
}