# Progress

## Completed ✅
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
- TodayView task picker modal (search, grouped by goal) + manual "add to plan"; auto-plan covers all tasks
- Light-mode contrast improvements (CountdownCard, ProgressChart, TaskItem)
- Recurring tasks, task dependencies (`blockedBy`), JSON export/import, URL goal share, confetti, streak
- PWA setup; deadline notification digest with per-day dedupe; reminders toggle
- UI foundation: @fontsource Inter/JetBrains Mono, shared component classes, focus-visible rings, a11y fixes, no emojis anywhere
- Unit tests for utils (11 passing, incl. computeDailyPlan, computePace, normalizeState) — Vitest

## Not Started / TODO ⬜
- Project-specific README
- Tier 2 features (calendar view, NL capture, search/filters, habit streaks)
- Backend/sync (out of current scope — client-side only by design)

## Known Gaps / Watch Items
- `parseImportedState` validation is minimal (only checks `goals` is an array).
- Undo/redo history is capped at 20 and not persisted across reloads.
- Main JS bundle > 500 kB (recharts); consider manualChunks.
