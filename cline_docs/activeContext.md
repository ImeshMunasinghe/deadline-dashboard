# Active Context

## Current State
- **Performance/bugfix/UX pass merged by user** (`3edf759`, 2026-09-07):
  - Rendering: single shared module-level tick replaces one setInterval per CountdownCard; TaskItem wrapped in React.memo with useCallback handlers.
  - Bug fixes: `isOverdue` now compares end-of-day (tasks due today are no longer overdue at midnight); recurrence clones use `generateId()`; dark-mode init reads localStorage before paint (no theme flash); Reflection modal opened via props/state in App instead of custom DOM events.
  - Data integrity: `LOG_FOCUS_TIME` short-circuits goals without the target task; `normalizeState` explicitly defaults all Task fields.
  - UX: new-goal form includes a GoalCategory select (Work/Personal/Health/Learning/Other).
- **Calendar is the default home view** (2026-09-06):
  - `activeView` now includes `'calendar'`; `initialState.activeView = 'calendar'` (existing users' stored view is respected, Calendar is first in the sidebar).
  - `CalendarView` component: Monday-start 6-week month grid, month nav + Today button, day chips for goal deadlines (blue, Target icon), milestones (violet, Flag), tasks (priority dot, completed struck through, overdue dates in red), "+N more" overflow, click-day side detail panel, click-item jumps to its goal.
  - Pure utils (tested): `buildMonthGrid`, `collectCalendarEvents`, `sortCalendarEvents`.
- **Tier 1 daily-driver upgrade implemented** (2026-09-06):
  - Plan-my-day: `computeDailyPlan` auto-builds a capacity-aware ordered queue; TodayView renders it with reorder/remove controls; persisted via `AppState.dailyPlan`.
  - Pace tracker: `computePace` powers `PaceBadge` (colored dot + label, no emojis) on CountdownCard and Sidebar.
  - Pomodoro-task linking: focus target selector on the floating timer; 25 min logged per completed focus session via `LOG_FOCUS_TIME`; `actualMinutes` shown on tasks and as a "Focus Time vs Estimates" analytics card.
  - Deadline notifications: once-per-day digest on app load (`computeDeadlineNotifications` + `filterUnnotified`, dedupe key `deadline-dashboard-notified`); bell toggle in BottomToolbar.
  - UI overhaul: self-hosted Inter variable + JetBrains Mono via @fontsource; shared `.card`/`.icon-btn`/`.chip`/`.focus-ring` classes; theme-aware ProgressRing + Recharts colors; responsive countdown row; fixed nested-button a11y issue in Sidebar; Pomodoro controls always visible; global focus-visible rings; removed `replace_*.mjs` scripts; all emojis removed from UI copy.
- `README.md` is still the default Vite template — not project documentation.

## Known Limitations
- Notifications fire only while the app is open (no push server); reminder toggle is best-effort.
- Daily plan is per-date only (single today queue).

## Possible Next Steps
- Drag-to-reschedule task chips in the calendar (UPDATE_TASK on dueDate already exists).
- Tier 2: natural-language quick capture, search/filters, habit-style recurring tasks.
- Code-split the 647 kB main bundle (recharts is the main cost).
