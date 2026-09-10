# Progress

## Completed ✅
- Premium UI polish pass (2026-09-10): CSS-only, no deps — `.floating-surface` elevation on modals/floating widgets, `.animate-fade-in-up` view transitions, `.active-rebound` checkbox spring, `.ambient-glow` running-Pomodoro breathing, CountdownCard hover lift, goal-color-tinted active sidebar row, Ctrl+K sidebar hint, TodayView "% done today" glance bar
- Fixed goal edit form carrying previous goal's data across switches (CountdownCard `key={activeGoal.id}` in App.tsx)

# Workflow rule: all future tasks follow the Ponytail lazy-senior-dev skill in `.clinerules` (smallest working diff, reuse, no unrequested abstractions, `ponytail:` comments on deliberate corner-cuts).
- Background-safe per-task Pomodoro: timestamp-based shared singleton timer (`usePomodoro` in `src/hooks/index.ts`, pure `computePomodoroTick` in `src/utils`), per-task play/pause button on `TaskItem`, shared focus target in `AppState.focusTargetId`; timer survives tab switching and refresh; fixed never-firing focus-time logging
- Fixed Analytics "Write Today's Reflection" button (was dispatching a dead `open-reflection` CustomEvent + junk `__trigger__` reflection); now opens the DailyReflection modal via an `onOpenReflection` prop wired in App.tsx (`AnalyticsView.tsx`, `App.tsx`)
- Core data model & reducer (goals, tasks, subtasks, milestones, inbox, templates, reflections) — `src/types`, `src/hooks/reducer.ts`
- State persistence + hydration with corrupted-storage recovery + field migration (`normalizeState`)
- Undo/redo history (20 states) with Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y
- Goal view: CountdownCard (live countdown + pace badge), TaskList/TaskItem (est vs actual minutes), NotesMilestones, ProgressChart
- Today view with auto "Plan my day" queue (capacity-aware, reorder/remove), daily capacity meter
- Calendar home view (default): month grid with goals/tasks/milestones, day detail panel, theme-aware, tested utils
- Analytics view (Recharts, theme-aware) incl. "Focus Time vs Estimates" card
- Inbox + QuickCapture; PomodoroTimer (25/5, focus-target selector, logs `actualMinutes`); DailyReflection; EmptyState
- Performance & polish pass: shared global countdown tick (1 interval for N cards), React.memo TaskItem, end-of-day `isOverdue`, `generateId()` recurrence clones, flash-free dark mode init, reflection modal via props, goal-category select in new-goal form, hardened `normalizeState`
- Google Calendar-style calendar UX: mosaic grid, inline task creation and completion toggles, day panel, legend; local-date event building (UTC bug fixed)
- TodayView task picker modal (search, grouped by goal, inline new-task creation) + manual "add to plan"; auto-plan covers all tasks
- Sri Lankan public holidays on the calendar: curated 2025-2027 dataset (incl. all Poya days), holiday chips + day-panel rows + legend, fixed-date fallback for other years
- Light-mode contrast improvements (CountdownCard, ProgressChart, TaskItem)
- Recurring tasks, task dependencies (`blockedBy`), JSON export/import, URL goal share, confetti, streak
- PWA setup with shortcuts (Today / New task / Focus mode) + share-target quick capture; deadline notification digest with per-day dedupe; reminders toggle
- **Periodic reminders + toast fallback + configurable lead-hours** (2026-09-08): `useDeadlineReminders` hook with 60s re-scan interval; in-app `ToastList` fallback; native delivery with stable tags; `SET_REMINDER_LEAD` reducer (1–168h, configurable from Sidebar); `computeDeadlineNotifications` now accepts `leadHours`; 8 new tests (37 total); new `vitest.config.ts` + jsdom dev dependency
- UI foundation: @fontsource Inter/JetBrains Mono, shared component classes, focus-visible rings, a11y fixes, no emojis anywhere
- **Full premium feature set (20 features)**: weekly planner w/ time blocks + catch-up + routines, Gantt timeline, analytics trends + estimation coach + streak heatmap + weekly digest, ICS export/import, natural-language smart add (~45m/every mon/after:task), accent theme picker, focus mode, command palette (Ctrl+P), read-only share page, printable report (PDF), PWA shortcuts + share-target capture
- **Import/Export tab + theme removal** (2026-09-08): added Import/Export as a proper sidebar tab combining JSON backup/restore + ICS calendar interop. Removed the theme/accent feature per user feedback (ThemeSettings.tsx, SET_ACCENT action, accent state, CSS variables). Removed duplicate ICS buttons from BottomToolbar.
- Unit tests for utils (37 passing, incl. computeDailyPlan, computePace, normalizeState, computeCatchUp, computeWeeklyTrends, computeEstimateCoach, computeStreakStats, computeWeeklyDigest, buildICS, parseICS, parseSmartInput, normalizeState new fields, computeDeadlineNotifications, filterUnnotified, pruneOldNotified, SET_REMINDER_LEAD reducer) — Vitest
- **Per-goal colors on the calendar** (2026-09-09): each goal now carries a user-chosen hex color used as a soft (~15% alpha) pastel tint on calendar event chips (goal/milestone/task), plus goal-colored icons and a `border-l` accent on day-panel rows. Users pick the color in the new-goal form (Sidebar swatches + native `<input type="color">` for any custom color) and can change it via the CountdownCard edit mode (through the existing `UPDATE_GOAL` action — no new reducer). Added `GOAL_COLOR_PALETTE` (8 coexisting hues), `normalizeGoalColor` (validates hex, maps legacy `'bg-blue-600'` → `#3b82f6`, palette fallback by goal index), `goalTint`, and `isGoalColor` in `src/utils`; `normalizeState` migrates legacy colors. Tints adapt automatically to light/dark themes and only tint backgrounds/dots/borders/icons — user text keeps neutral classes so contrast stays safe regardless of a chosen custom color. 4 new unit tests (41 total).\n

## Not Started / TODO ⬜
- Project-specific README
- Tier 2 features (calendar view, NL capture, search/filters, habit streaks)
- Backend/sync (out of current scope — client-side only by design)

## Known Gaps / Watch Items
- `parseImportedState` validation is minimal (only checks `goals` is an array).
- Undo/redo history is capped at 20 and not persisted across reloads.
- Main JS bundle > 500 kB (recharts); consider manualChunks.
- `wrangler.toml` added for Cloudflare Pages static deployment (no Workers functions needed).
