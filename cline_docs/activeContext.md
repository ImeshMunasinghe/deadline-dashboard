# Active Context

## Current State
- **Today picker can create new tasks** (2026-09-07): TaskPickerModal in TodayView now includes an inline "Create new task" form (description, goal select, priority select, due date pre-filled to today); Enter or the Add button dispatches `ADD_TASK` and immediately adds the new task to today's plan via `onAdd`. When no goals exist the form is replaced by a "Create a goal first" hint. Verified: `tsc`, `vite build`, and 15 Vitest tests all pass.
- **Google Calendar-style UX + Today task picker** (`2005e11`, 2026-09-07):
  - CalendarView: fixed stale-today and UTC-vs-local date bugs (events now built from local date components); mosaic grid (gap-px layout); inline completion toggles on task chips and in the day panel; "+Add" inline task creation form (text, goal, priority, due date pre-filled); legend row; day panel close button.
  - TodayView: "+Add task" opens a TaskPickerModal (all incomplete tasks grouped by goal, with search); planned tasks shown disabled; "Add to plan" on unplanned due-today rows; auto-plan now considers all tasks, not just due-today.
- **Light-mode contrast pass** (`b824b41`, 2026-09-07): improved contrast/colors in CountdownCard, ProgressChart, TaskItem.
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
