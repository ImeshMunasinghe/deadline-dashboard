# Active Context

## Current State
- **Cloudflare Pages static deployment configured** (2026-09-08): Added `wrangler.toml` (`name = "deadline-dashboard"`, `pages_build_output_dir = "dist"`). Resolved the "invalid request body" UI bug by either using `true` as a no-op deploy command in the Pages UI, or deploying via `npx wrangler pages deploy dist/` CLI. No Workers/Functions needed — client-side only, data stored in localStorage.
- **Theme/accent feature removed** (2026-09-08): user found it unnecessary. Removed `ThemeSettings.tsx`, `SET_ACCENT` action, `accent` field from `AppState`, `accent` from `initialState`, `hexToRgb` function, accent CSS variables, and the Themes tab from Sidebar. The `normalizeState` function and its test were updated to remove the `accent` default.
- **Import/Export tab added to main navigation** (2026-09-08): new `ImportExportTab.tsx` combines JSON backup/restore + ICS calendar interop in one place. Removed duplicate ICS buttons from BottomToolbar.
  - Already in place before this session: weekly planner (PlannerView), smart scheduling/catch-up (computeCatchUp), time blocking (SET_PLAN_START), task templates + routines, goals-as-projects Gantt (TimelineView), productivity trends (computeWeeklyTrends), estimation coach (computeEstimateCoach), streak depth + heatmap (computeStreakStats), weekly digest + reflections journal (computeWeeklyDigest), ICS export/import (ics.ts), themes/accent picker (ThemeSettings), focus mode (FocusMode), command palette (CommandPalette), natural-language quick capture (smartAdd.ts).
  - New in this session:
    - **Feature 14 — Shared goals / read-only share page** (`src/components/ShareView.tsx`): public `ShareView` renders goal progress (ring, pace, milestones, task list) for anyone with the `?share=` link. CountdownCard already had the share button; App.tsx routes `?share=` param to this view and cleans the URL.
    - **Feature 15 — Export as report** (`src/components/ReportView.tsx`): print-friendly per-goal report with progress ring, pace, stats, milestones, task table. Triggered via a new Printer icon on CountdownCard → App.tsx `reportGoal` state → full-screen ReportView with Print/Save PDF button. Print styles added to `src/index.css` (`.print:hidden` etc.).
    - **Feature 19 — PWA shortcuts + share-target quick capture**: shortcuts (Today / New task / Focus mode) and `share_target` were already in `vite.config.ts`; the app-side handler in App.tsx parses `?share-target=&title=&text=&url=`, runs the shared text through `parseSmartInput`, and creates an inbox task.
- **Sri Lankan public holidays on the calendar** (2026-09-07): new pure module `src/utils/holidays.ts` with curated per-year datasets for 2025–2027; uncovered years fall back to fixed-date holidays only. CalendarView shows rose-colored holiday chips and day-panel rows. 29 tests pass.
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
