# System Patterns & Architecture

## Overall Pattern
Single-page React SPA, **no routing library** — navigation is state-driven via `AppState.activeView` (`'today' | 'analytics' | 'goal' | 'inbox'`), dispatched with `SET_ACTIVE_VIEW`.

## Data Flow
```
Components ──dispatch(AppAction)──▶ dispatch wrapper (hooks/index.ts)
   │                                    │ UNDO/REDO history handling
   │                                    ▼
   │                              appReducer (hooks/reducer.ts)  ← all mutations live here
   │                                    │
   └──◀── new AppState (present) ◀──────┘
                 │
                 ▼  useEffect
        localStorage ('deadline-dashboard-v2')
```

Key invariants:
- Components **never mutate state** — they only dispatch typed actions from `types/index.ts`.
- The reducer is a pure switch over discriminated-union actions (`AppAction`).
- Undo/redo wraps the reducer in a `{ past, present, future }` history (last 20 states), implemented in `useAppState`.

## Key Modules
| Path | Responsibility |
|---|---|
| `src/types/index.ts` | All domain types: `Task` (incl. `actualMinutes`), `Goal`, `SubTask`, `Milestone`, `AppState` (incl. `dailyPlan`, `remindersEnabled`), `AppAction` |
| `src/hooks/reducer.ts` | `initialState` (default view `'calendar'`) + `appReducer` (all state mutations, incl. plan/focus-time/reminders actions) |
| `src/hooks/index.ts` | `useAppState` (reducer + localStorage + undo/redo + shortcuts + `normalizeState` migration), `useCountdown`, `usePomodoro`, `useStreak` |
| `src/utils/index.ts` | Pure helpers: `computeCountdown`, `getTaskStats`, date helpers, JSON export/import, goal share encode/decode, `priorityWeight`, `computeDailyPlan`, `computePace`, `normalizeState`, `computeDeadlineNotifications`, `filterUnnotified`, `buildMonthGrid`, `collectCalendarEvents`, `sortCalendarEvents` |
| `src/components/CalendarView.tsx` | Default home view: month grid of goals/tasks/milestones, day detail panel, navigation |
| `src/components/*` | One file per UI feature: `Sidebar`, `CountdownCard` (exports shared `PaceBadge`), `TaskList`, `TaskItem`, `ProgressChart`, `PomodoroTimer`, `NotesMilestones`, `TodayView`, `AnalyticsView`, `QuickCapture`, `DailyReflection`, `EmptyState` |
| `src/App.tsx` | Composition root; share-param import; confetti on 100% completion; once-per-day deadline notification digest |

## Persistence
- `localStorage['deadline-dashboard-v2']` — full `AppState` JSON (goals, inbox, templates, reflections, `dailyPlan`, `remindersEnabled`), hydrated on mount with a shape guard and field migration via `normalizeState`; corrupted storage is cleared silently.
- `localStorage['deadline-dashboard-streak']` — `{ count, lastVisit }`.
- `localStorage['deadline-dashboard-notified']` — per-day notification dedupe keys.
- `localStorage['theme']` — 'dark' | 'light'.

## Daily Planning & Time Tracking
- "Plan my day" computes an ordered, capacity-aware task queue (`computeDailyPlan`, 360 min default) from overdue/today/upcoming candidates; stored as `AppState.dailyPlan { date, taskIds }`; reorder/remove via dedicated actions.
- Pomodoro focus sessions log 25 min to the selected task via `LOG_FOCUS_TIME` (accumulates `Task.actualMinutes`); analytics compare estimated vs actual.

## Calendar View
- `buildMonthGrid` (Monday-start, 42 cells, local-date safe) + `collectCalendarEvents` (date → goal/task/milestone events with overdue tracking) power the default home view; clicking an item navigates to its goal via `SET_ACTIVE_VIEW` + `SET_ACTIVE_GOAL`.

## Recurrence & Dependency Semantics
- Completing a recurring task schedules the next occurrence (daily +1d, weekly +7d, monthly +1mo) and un-completes it.
- `blockedBy` holds another task's id; UI surfaces blocked state (see `TaskItem`).
