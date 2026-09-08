// ─── ICS (iCalendar) export / import ──────────────────────────────────────
// One-way calendar interop: export goals/tasks/milestones as .ics, or import
// external .ics files as tasks. Enables the feasible half of Google Calendar
// interop without an OAuth backend.

export interface IcsEvent {
  uid: string;
  summary: string;
  date: string; // YYYY-MM-DD (all-day events only)
  description?: string;
}

function icsDate(date: string): string {
  return date.replace(/-/g, '');
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function unescapeIcs(text: string): string {
  return text.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

// Build an all-day VEVENT list from app state.
export function buildICS(state: { goals: { id: string; title: string; targetDate: string; milestones: { id: string; label: string; date: string }[]; tasks: { id: string; text: string; dueDate: string | null }[] }[] }): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Deadline Dashboard//EN',
    'CALSCALE:GREGORIAN',
  ];
  for (const goal of state.goals) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:goal-${goal.id}@deadline-dashboard`);
    lines.push(`DTSTAMP:${icsDate(new Date().toISOString().split('T')[0])}`);
    lines.push(`DTSTART;VALUE=DATE:${icsDate(goal.targetDate.split('T')[0])}`);
    lines.push(`SUMMARY:${escapeIcs(`[Goal] ${goal.title}`)}`);
    lines.push('END:VEVENT');

    for (const m of goal.milestones ?? []) {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:milestone-${m.id}@deadline-dashboard`);
      lines.push(`DTSTAMP:${icsDate(new Date().toISOString().split('T')[0])}`);
      lines.push(`DTSTART;VALUE=DATE:${icsDate(m.date.split('T')[0])}`);
      lines.push(`SUMMARY:${escapeIcs(`[Milestone] ${m.label}`)}`);
      lines.push(`DESCRIPTION:${escapeIcs(goal.title)}`);
      lines.push('END:VEVENT');
    }

    for (const t of goal.tasks ?? []) {
      if (!t.dueDate) continue;
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:task-${t.id}@deadline-dashboard`);
      lines.push(`DTSTAMP:${icsDate(new Date().toISOString().split('T')[0])}`);
      lines.push(`DTSTART;VALUE=DATE:${icsDate(t.dueDate.split('T')[0])}`);
      lines.push(`SUMMARY:${escapeIcs(t.text)}`);
      lines.push(`DESCRIPTION:${escapeIcs(goal.title)}`);
      lines.push('END:VEVENT');
    }
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// Download the current state as an .ics file (browser only).
export function downloadICS(ics: string, filename = 'deadline-dashboard.ics'): void {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Parse a (possibly folded) .ics file into all-day events.
export function parseICS(text: string): IcsEvent[] {
  // Unfold continuation lines (lines starting with space/tab)
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  const events: IcsEvent[] = [];
  const blocks = unfolded.split(/BEGIN:VEVENT/i).slice(1);

  for (const block of blocks) {
    const body = block.split(/END:VEVENT/i)[0];
    const get = (prop: string): string | undefined => {
      // Match "PROP;PARAMS:value" or "PROP:value"
      const re = new RegExp(`^${prop}[^:\\r\\n]*:(.*)$`, 'im');
      const m = body.match(re);
      return m ? m[1].trim() : undefined;
    };
    const summary = get('SUMMARY');
    const dtStart = get('DTSTART');
    const uid = get('UID') ?? '';
    if (!summary || !dtStart) continue;

    const dateMatch = dtStart.match(/^(\d{4})(\d{2})(\d{2})/);
    if (!dateMatch) continue; // skip timed/zoned events we cannot map reliably

    events.push({
      uid,
      summary: unescapeIcs(summary),
      date: `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`,
      description: get('DESCRIPTION'),
    });
  }
  return events;
}
