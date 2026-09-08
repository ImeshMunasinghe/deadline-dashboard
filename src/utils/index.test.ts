import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeCountdown } from './index';

describe('computeCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates countdown correctly before deadline', () => {
    // Mock current time: 2026-06-11T12:00:00Z
    const mockNow = new Date('2026-06-11T12:00:00.000Z');
    vi.setSystemTime(mockNow);

    const targetDateISO = '2026-06-12T12:00:00.000Z'; // exactly 24 hours later
    const createdAtISO = '2026-06-10T12:00:00.000Z';  // exactly 24 hours earlier

    const result = computeCountdown(targetDateISO, createdAtISO);

    expect(result.days).toBe(1);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.seconds).toBe(0);
    expect(result.isExpired).toBe(false);
    expect(result.totalSeconds).toBe(86400);
    expect(result.progressPercent).toBeCloseTo(50, 1); // 50% elapsed (1 day of 2)
  });

  it('handles expired/past deadline correctly', () => {
    const mockNow = new Date('2026-06-11T13:00:00.000Z');
    vi.setSystemTime(mockNow);

    const targetDateISO = '2026-06-11T12:00:00.000Z'; // 1 hour ago
    const createdAtISO = '2026-06-10T12:00:00.000Z';

    const result = computeCountdown(targetDateISO, createdAtISO);

    expect(result.days).toBe(0);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.seconds).toBe(0);
    expect(result.isExpired).toBe(true);
    expect(result.totalSeconds).toBe(0);
    expect(result.progressPercent).toBe(100);
  });
});

// ─── computeDailyPlan ─────────────────────────────────────────────────────

import { computeDailyPlan, computePace, normalizeState } from './index';
import type { PlanCandidate } from './index';
import type { AppState } from '../types';

describe('computeDailyPlan', () => {
  const base: PlanCandidate[] = [
    { taskId: 'overdue-high', goalId: '', dueDate: '2026-06-10T00:00:00Z', priority: 'high', estimatedMinutes: 60 },
    { taskId: 'overdue-low', goalId: '', dueDate: '2026-06-09T00:00:00Z', priority: 'low', estimatedMinutes: 30 },
    { taskId: 'today-med', goalId: '', dueDate: '2026-06-11T18:00:00Z', priority: 'medium', estimatedMinutes: 120 },
    { taskId: 'upcoming', goalId: '', dueDate: '2026-06-20T00:00:00Z', priority: 'medium', estimatedMinutes: 90 },
    { taskId: 'blocked', goalId: '', dueDate: '2026-06-10T00:00:00Z', priority: 'high', estimatedMinutes: 60 },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('orders overdue before today before upcoming, high priority first', () => {
    const plan = computeDailyPlan(base, new Set());
    // 'blocked' is included here (empty blocked set) and sorts with the overdue group
    expect(plan).toEqual(['overdue-high', 'blocked', 'overdue-low', 'today-med', 'upcoming']);
  });

  it('excludes blocked tasks', () => {
    const plan = computeDailyPlan(base, new Set(['blocked']));
    expect(plan).not.toContain('blocked');
  });

  it('respects capacity limit', () => {
    const plan = computeDailyPlan(base, new Set(), 90);
    // overdue-high (60) fits; overdue-low (30) fills to 90; others skipped
    expect(plan).toEqual(['overdue-high', 'overdue-low']);
  });

  it('defaults unestimated tasks to 30 minutes', () => {
    const noEstimate: PlanCandidate[] = [
      { taskId: 'a', goalId: '', dueDate: null, priority: 'low', estimatedMinutes: 0 },
      { taskId: 'b', goalId: '', dueDate: null, priority: 'low', estimatedMinutes: 0 },
      { taskId: 'c', goalId: '', dueDate: null, priority: 'low', estimatedMinutes: 0 },
    ];
    const plan = computeDailyPlan(noEstimate, new Set(), 75);
    expect(plan).toEqual(['a', 'b']); // 30 + 30 = 60 fits; third would exceed 75
  });
});

// ─── computePace ──────────────────────────────────────────────────────────

describe('computePace', () => {
  function makeGoal(overrides: Partial<Goal>): Goal {
    return {
      id: 'g1',
      title: 'Test Goal',
      targetDate: '2026-06-21T00:00:00Z',
      tasks: [],
      notes: '',
      milestones: [],
      createdAt: '2026-06-01T00:00:00Z',
      category: 'Work',
      color: '',
      ...overrides,
    };
  }

  const now = new Date('2026-06-11T00:00:00.000Z'); // day 10 of 20

  it('marks ahead when actual pace exceeds required pace', () => {
    // 5 of 10 tasks done in 10 days; 5 left in 10 days → needed 0.5/day, actual 0.5/day
    // Add a completed task beyond pace: 6 done → actual 0.6 vs needed 0.4 → ahead
    const goal = makeGoal({
      tasks: [
        ...Array.from({ length: 6 }, (_, i) => ({ id: `t${i}`, completed: true })),
        ...Array.from({ length: 4 }, (_, i) => ({ id: `r${i}`, completed: false })),
      ].map((t) => ({ id: String(t.id), text: '', completed: t.completed, priority: 'medium' as const, dueDate: null, subtasks: [], createdAt: '', completedAt: null, estimatedMinutes: null, actualMinutes: 0, recurrence: null, blockedBy: null })),
    });
    expect(computePace(goal, now).status).toBe('ahead');
  });

  it('marks at-risk when deadline passed with tasks remaining', () => {
    const goal = makeGoal({ targetDate: '2026-06-05T00:00:00Z', tasks: [{ id: 'a', text: '', completed: false, priority: 'low', dueDate: null, subtasks: [], createdAt: '', completedAt: null, estimatedMinutes: null, actualMinutes: 0, recurrence: null, blockedBy: null }] });
    expect(computePace(goal, now).status).toBe('at-risk');
  });

  it('marks done when all tasks completed', () => {
    const goal = makeGoal({ tasks: [{ id: 'a', text: '', completed: true, priority: 'low', dueDate: null, subtasks: [], createdAt: '', completedAt: null, estimatedMinutes: null, actualMinutes: 0, recurrence: null, blockedBy: null }] });
    expect(computePace(goal, now).status).toBe('done');
  });

  it('reports needed tasks per day', () => {
    // 10 tasks, 5 done, 10 days left → need 0.5/day
    const goal = makeGoal({
      tasks: [
        ...Array.from({ length: 5 }, (_, i) => ({ id: `t${i}`, completed: true })),
        ...Array.from({ length: 5 }, (_, i) => ({ id: `r${i}`, completed: false })),
      ].map((t) => ({ id: String(t.id), text: '', completed: t.completed, priority: 'low' as const, dueDate: null, subtasks: [], createdAt: '', completedAt: null, estimatedMinutes: null, actualMinutes: 0, recurrence: null, blockedBy: null })),
    });
    expect(computePace(goal, now).tasksPerDayNeeded).toBe(0.5);
  });
});

// ─── Calendar utils ───────────────────────────────────────────────────────

import { buildMonthGrid, collectCalendarEvents, sortCalendarEvents } from './index';
import type { Goal } from '../types';

describe('buildMonthGrid', () => {
  it('produces 42 cells with correct inMonth flags and today marker', () => {
    const today = new Date(2026, 8, 6); // Sep 6 2026, local time
    const grid = buildMonthGrid(2026, 8, today); // September
    expect(grid).toHaveLength(42);
    const inMonth = grid.filter((d) => d.inMonth);
    expect(inMonth).toHaveLength(30); // September has 30 days
    const first = inMonth[0];
    expect(first.dayOfMonth).toBe(1);
    const todayCell = grid.find((d) => d.isToday);
    expect(todayCell?.dayOfMonth).toBe(6);
  });
});

describe('collectCalendarEvents', () => {
  function makeGoal(overrides: Partial<Goal>): Goal {
    return {
      id: 'g1',
      title: 'Goal One',
      targetDate: '2026-09-10T12:00:00Z',
      tasks: [],
      notes: '',
      milestones: [],
      createdAt: '2026-08-01T00:00:00Z',
      category: 'Work',
      color: '',
      ...overrides,
    };
  }

  it('collects goals, tasks, and milestones by date', () => {
    const goal = makeGoal({
      milestones: [{ id: 'm1', label: 'Kickoff', date: '2026-09-05' }],
      tasks: [
        { id: 't1', text: 'Draft', completed: false, priority: 'high', dueDate: '2026-09-10T00:00:00Z', subtasks: [], createdAt: '', completedAt: null, estimatedMinutes: null, actualMinutes: 0, recurrence: null, blockedBy: null },
      ],
    });
    const map = collectCalendarEvents({ goals: [goal] } as never, new Date(2026, 8, 6));

    expect(map.get('2026-09-10')!.goals[0].title).toBe('Goal One');
    expect(map.get('2026-09-10')!.tasks[0].title).toBe('Draft');
    expect(map.get('2026-09-05')!.milestones[0].title).toBe('Kickoff');
  });

  it('flags past incomplete tasks as overdue', () => {
    const goal = makeGoal({
      tasks: [
        { id: 't1', text: 'Late', completed: false, priority: 'low', dueDate: '2026-09-01T00:00:00Z', subtasks: [], createdAt: '', completedAt: null, estimatedMinutes: null, actualMinutes: 0, recurrence: null, blockedBy: null },
      ],
    });
    const map = collectCalendarEvents({ goals: [goal] } as never, new Date(2026, 8, 6));
    expect(map.get('2026-09-01')!.overdue).toHaveLength(1);
  });

  it('sorts goals first, then incomplete tasks by priority, completed last', () => {
    const events = {
      goals: [{ kind: 'goal' as const, id: 'g', title: 'G', date: '', goalId: '', goalTitle: '', goalColor: '' }],
      tasks: [
        { kind: 'task' as const, id: 't1', title: 'Low', date: '', goalId: '', goalTitle: '', goalColor: '', priority: 'low' as const, completed: false },
        { kind: 'task' as const, id: 't2', title: 'Done', date: '', goalId: '', goalTitle: '', goalColor: '', priority: 'high' as const, completed: true },
        { kind: 'task' as const, id: 't3', title: 'High', date: '', goalId: '', goalTitle: '', goalColor: '', priority: 'high' as const, completed: false },
      ],
      milestones: [],
      overdue: [],
      holidays: [],
    };
    const sorted = sortCalendarEvents(events);
    expect(sorted.map((e) => e.title)).toEqual(['G', 'High', 'Low', 'Done']);
  });
});

// ─── Sri Lankan holidays ──────────────────────────────────────────────────

import { getSriLankanHolidayMap } from './index';

describe('getSriLankanHolidayMap', () => {
  it('returns curated lunar holidays for dataset years', () => {
    const map = getSriLankanHolidayMap(2026);
    expect(map.get('2026-02-04')![0].name).toBe('National Day');
    expect(map.get('2026-05-30')![0]).toMatchObject({ name: 'Vesak Full Moon Poya', type: 'poya' });
    expect(map.get('2026-11-08')![0].name).toBe('Deepavali Festival Day');
    expect(map.get('2026-04-14')![0].name).toBe('Sinhala and Tamil New Year');
    // Every dataset year should include all 12 Poya days
    const poyas = [...map.values()].flat().filter((h) => h.type === 'poya');
    expect(poyas.length).toBe(12);
  });

  it('falls back to fixed-date holidays for uncovered years', () => {
    const map = getSriLankanHolidayMap(2030);
    expect(map.get('2030-02-04')![0].name).toBe('National Day');
    expect(map.get('2030-05-01')![0].name).toBe('Labour Day');
    expect(map.get('2030-12-25')![0].name).toBe('Christmas Day');
    // No guessed lunar holidays
    expect([...map.values()].flat().filter((h) => h.type === 'poya')).toHaveLength(0);
  });

  it('merges holidays into collectCalendarEvents day map', () => {
    const map = collectCalendarEvents({ goals: [] } as never, new Date(2026, 1, 10), getSriLankanHolidayMap(2026));
    const day = map.get('2026-02-04')!;
    expect(day.holidays).toHaveLength(1);
    expect(day.holidays[0].name).toBe('National Day');
    expect(day.goals).toHaveLength(0);
    // Holiday-only days create entries even without events
    expect(map.has('2026-05-01')).toBe(true);
  });

  it('leaves days untouched when no holiday map is provided', () => {
    const map = collectCalendarEvents({ goals: [] } as never, new Date(2026, 1, 10));
    expect(map.size).toBe(0);
  });
});

// ─── normalizeState ───────────────────────────────────────────────────────

describe('normalizeState', () => {
  it('adds actualMinutes to tasks missing the field', () => {
    const state = {
      goals: [{ id: 'g', tasks: [{ id: 't', completed: false, estimatedMinutes: null, recurrence: null, blockedBy: null }] }],
      inbox: [{ id: 'i', completed: false, estimatedMinutes: null, recurrence: null, blockedBy: null }],
    } as unknown as AppState;
    const fixed = normalizeState(state);
    expect(fixed.goals[0].tasks[0].actualMinutes).toBe(0);
    expect(fixed.inbox[0].actualMinutes).toBe(0);
  });

  it('defaults plans, routines, and accent for older saved data', () => {
    const fixed = normalizeState({ goals: [] as never[], inbox: [], templates: [] } as unknown as AppState);
    expect(fixed.plans).toEqual({});
    expect(fixed.routines).toEqual([]);
    expect(fixed.accent).toBe('#2563eb');
  });
});

// ─── Insights ─────────────────────────────────────────────────────────────

import { computeCatchUp, computeWeeklyTrends, computeEstimateCoach, computeStreakStats, computeWeeklyDigest, buildICS, parseICS } from './index';

function goalWith(tasks: { id: string; text: string; completed?: boolean; dueDate?: string | null; createdAt?: string; completedAt?: string | null; estimatedMinutes?: number | null; actualMinutes?: number }[]) {
  return {
    id: 'g',
    title: 'G',
    targetDate: '2026-12-31',
    notes: '',
    milestones: [],
    createdAt: '2026-01-01',
    category: 'Work' as const,
    color: '',
    tasks: tasks.map((t) => ({
      id: t.id,
      text: t.text,
      completed: t.completed ?? false,
      priority: 'medium' as const,
      dueDate: t.dueDate ?? null,
      subtasks: [],
      createdAt: t.createdAt ?? '2026-01-01T00:00:00Z',
      completedAt: t.completedAt ?? null,
      estimatedMinutes: t.estimatedMinutes ?? null,
      actualMinutes: t.actualMinutes ?? 0,
      recurrence: null,
      blockedBy: null,
    })),
  };
}

describe('computeCatchUp', () => {
  it('returns overdue incomplete tasks to reschedule', () => {
    const state = { goals: [goalWith([
      { id: 'a', text: 'overdue', dueDate: '2026-09-01' },
      { id: 'b', text: 'done-late', completed: true, dueDate: '2026-08-01', completedAt: '2026-08-02T00:00:00Z' },
    ])] } as unknown as AppState;
    const updates = computeCatchUp(state, new Date(2026, 8, 10)); // 2026-09-10
    expect(updates).toHaveLength(1);
    expect(updates[0].taskId).toBe('a');
    expect(updates[0].to).toBe('2026-09-10');
  });
});

describe('computeWeeklyTrends', () => {
  it('buckets completions into the last 8 weeks', () => {
    const state = { goals: [goalWith([
      // completed 26 weeks ago — should fall outside the 8-week window
      { id: 'old', text: 'old', completed: true, completedAt: '2026-01-01T00:00:00Z' },
      { id: 'recent', text: 'recent', completed: true, completedAt: '2026-09-04T00:00:00Z' },
    ])] } as unknown as AppState;
    const trends = computeWeeklyTrends(state, 8, new Date(2026, 8, 6));
    expect(trends).toHaveLength(8);
    const total = trends.reduce((s, w) => s + w.completed, 0);
    expect(total).toBe(1);
  });
});

describe('computeEstimateCoach', () => {
  it('reports under-estimation when actual exceeds estimate', () => {
    const state = { goals: [goalWith([
      { id: 'a', text: 'a', completed: true, completedAt: '2026-01-02T00:00:00Z', estimatedMinutes: 60, actualMinutes: 120 },
    ])] } as unknown as AppState;
    const coach = computeEstimateCoach(state);
    expect(coach.samples).toBe(1);
    expect(coach.avgRatio).toBeCloseTo(2, 0);
    expect(coach.underestimate).toBe(1);
  });
});

describe('computeStreakStats', () => {
  it('computes consecutive-day streaks and heatmap size', () => {
    const state = { goals: [goalWith([
      { id: 't1', text: 'a', completed: true, completedAt: '2026-09-08T00:00:00Z' },
      { id: 't2', text: 'b', completed: true, completedAt: '2026-09-07T00:00:00Z' },
    ])] } as unknown as AppState;
    const streak = computeStreakStats(state, 84, new Date(2026, 8, 8));
    expect(streak.heatmap).toHaveLength(84);
    expect(streak.current).toBeGreaterThanOrEqual(1);
    expect(streak.best).toBeGreaterThanOrEqual(1);
  });
});

describe('computeWeeklyDigest', () => {
  it('counts completions and focus time for the week', () => {
    const state = { goals: [goalWith([
      { id: 't1', text: 'a', completed: true, completedAt: '2026-09-08T00:00:00Z', actualMinutes: 25 },
    ])], reflections: [] } as unknown as AppState;
    const digest = computeWeeklyDigest(state, new Date(2026, 8, 8));
    expect(digest.completed).toBe(1);
    expect(digest.focusMinutes).toBe(25);
    expect(digest.days).toHaveLength(7);
  });
});

// ─── ICS export / import ─────────────────────────────────────────────────

describe('ICS', () => {
  it('builds and round-trips all-day events', () => {
    const state = { goals: [goalWith([
      { id: 't1', text: 'Review report', dueDate: '2026-09-15' },
    ])] };
    const ics = buildICS(state);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('SUMMARY:Review report');
    const parsed = parseICS(ics);
    // buildICS emits a goal event + task event
    expect(parsed.length).toBe(2);
    const task = parsed.find((e) => e.summary === 'Review report');
    expect(task).not.toBeUndefined();
    expect(task!.date).toBe('2026-09-15');
  });

  it('parses a raw folded .ics snippet', () => {
    const raw = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:x\r\nDTSTART;VALUE=DATE:20260915\r\nSUMMARY:Standup\r\nEND:VEVENT\r\nEND:VCALENDAR';
    const parsed = parseICS(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].date).toBe('2026-09-15');
  });
});

// ─── Smart add parser ─────────────────────────────────────────────────────

import { parseSmartInput } from './index';

describe('parseSmartInput', () => {
  it('parses priority, estimate, recurrence, due date, and dependency', () => {
    const res = parseSmartInput('Write report !high ~1.5h every mon after:Research', {
      tasks: [{ id: 'x1', text: 'Research', dueDate: '2026-09-10' }],
      now: new Date(2026, 8, 6), // Sunday 2026-09-06
    });
    expect(res.text).toBe('Write report');
    expect(res.priority).toBe('high');
    expect(res.estimatedMinutes).toBe(90);
    expect(res.recurrence).toBe('weekly');
    expect(res.blockedBy).toBe('x1');
    // weekly + Monday default: next Monday = 2026-09-07
    expect(res.dueDate).toBe('2026-09-07');
  });

  it('strips nothing when no tokens present', () => {
    const res = parseSmartInput('Just a plain task', { now: new Date(2026, 8, 6) });
    expect(res.text).toBe('Just a plain task');
    expect(res.estimatedMinutes).toBeNull();
    expect(res.recurrence).toBeNull();
    expect(res.blockedBy).toBeNull();
  });
});
