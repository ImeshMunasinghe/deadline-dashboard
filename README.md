# Deadline Dashboard

A fast, offline-first productivity dashboard for tracking deadlines, breaking goals into tasks, and staying focused. Built as a single-page React application with no backend — your data never leaves your browser.

![Stack](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple) ![PWA](https://img.shields.io/badge/PWA-ready-green)

## Overview

Deadline Dashboard is organized around **Goals** — big deliverables with a deadline — that contain **Tasks**, **Subtasks**, and **Milestones**. The app answers four questions at a glance:

1. **When is everything due?** — a month calendar home view
2. **What should I do today?** — an auto-generated, capacity-aware daily plan
3. **Am I on track?** — pace tracking per goal (ahead / on track / behind / at risk)
4. **Where is my time going?** — Pomodoro-linked focus tracking vs. task estimates

## Features

### Calendar (default home view)
- Month grid with goal deadlines, task due dates, and milestones
- Priority-colored task chips, completed-task strike-through, overdue day highlighting
- Day detail panel; click any item to jump straight into its goal
- Monday-start weeks, month navigation, and a one-click "Today" shortcut

### Daily planning
- **Plan my day** builds an ordered task queue from overdue, due-today, and upcoming tasks — sorted by priority and deadline, skipping tasks blocked by incomplete dependencies
- Greedy capacity fill against a configurable daily limit (default 6 hours)
- Reorder or remove planned tasks; the plan persists per day

### Task management
- Priorities (low / medium / high), due dates, time estimates, and subtasks
- Recurring tasks (daily / weekly / monthly) that reschedule on completion
- Task dependencies — blocked tasks cannot be completed until their blocker is done
- Inbox with quick capture for frictionless task dumping; move tasks into goals later

### Deadline intelligence
- Live countdown per goal (days / hours / minutes / seconds) with an elapsed-progress ring
- **Pace tracker** per goal: compares your actual completion rate against the rate required to finish on time, shown as a colored status badge
- Once-per-day browser notification digest for approaching deadlines, tasks due today, and overdue work (with a toggle)

### Focus and reflection
- Floating Pomodoro timer (25/5) attachable to any task — each completed focus session logs 25 minutes to it
- Estimated vs. actual time shown on tasks, plus a "Focus Time vs Estimates" analytics card
- Daily reflection journal and completion analytics (Recharts)

### Data and sharing
- Full **undo/redo** (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y) with a 20-state history
- Everything persists to `localStorage` — no accounts, no server
- JSON export/import for backups and device migration
- Share any goal as a read-only snapshot via a URL

### Platform
- Installable **PWA** (offline-capable, auto-updating service worker)
- Light and dark themes with self-hosted Inter and JetBrains Mono fonts
- Keyboard shortcuts throughout (space toggles the timer; undo/redo everywhere)

## Getting Started

### Prerequisites
- Node.js 18 or later
- npm

### Install and run

```bash
git clone https://github.com/ImeshMunasinghe/deadline-dashboard.git
cd deadline-dashboard
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`).

### Production build

```bash
npm run build     # type-checks, bundles, and generates the PWA service worker
npm run preview   # serve the production build locally
```

### Tests

```bash
npm test          # Vitest — unit tests for all pure planning/calendar logic
```

### Deployment (Cloudflare Pages)

The app builds to static files in `dist/` and needs no server. Recommended Cloudflare Pages settings:

| Setting | Value |
|---|---|
| Framework preset | None (or Vite) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Environment variable | `NODE_VERSION` = `20` |

Connect the GitHub repository in the Cloudflare dashboard (Workers & Pages > Create > Pages > Connect to Git) and every push to `master` deploys automatically. The SPA rewrite (`public/_redirects`) and the PWA service worker are picked up from the build output automatically.

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 18, lucide-react icons, canvas-confetti |
| Language | TypeScript (strict mode) |
| Build | Vite 5, vite-plugin-pwa |
| Styling | Tailwind CSS 3 (light/dark), self-hosted fonts via @fontsource |
| Charts | Recharts |
| Testing | Vitest |
| Storage | localStorage (no backend) |

## Architecture Notes

- **Single source of truth**: all state lives in one `AppState` handled by a typed reducer (`src/hooks/reducer.ts`). Components never mutate state — they dispatch typed `AppAction`s.
- **Undo/redo** wraps the reducer in a `{ past, present, future }` history, persisted with the rest of the state.
- **Pure logic is separated**: daily planning, pace calculation, calendar grid/event building, and notification dedupe are pure functions in `src/utils/` and are unit-tested.
- **State migrations**: stored state is normalized on load (`normalizeState`), so new fields ship without breaking existing local data.

## Project Structure

```
src/
├── components/   # UI: CalendarView, TodayView, CountdownCard, PomodoroTimer, ...
├── hooks/        # useAppState (reducer + persistence + undo/redo), usePomodoro, useStreak
├── utils/        # Pure, tested logic: planning, pace, calendar, notifications
├── types/        # Domain types and the AppAction union
└── App.tsx       # Composition root
```

## Privacy

All data — goals, tasks, notes, reflections — is stored exclusively in your browser's localStorage. There is no server, no telemetry, and no account. Clearing your browser data deletes your dashboard data, so use **Export** (bottom-left toolbar) for backups.

## Limitations

- Data is per-browser/per-device; sync across devices requires export/import.
- Deadline notifications fire while the app is open (no push server).
- Notification permission must be granted via the bell icon in the bottom-left toolbar.

## Roadmap

- Drag-to-reschedule task chips in the calendar
- Natural-language quick capture ("Essay draft friday !high ~2h")
- Search and filters across goals and tasks
- Habit-style recurring tasks with streaks

## Contributing

Bug reports and pull requests are welcome. Before starting work, review `cline_docs/` (the project memory bank) and `.clinerules` for code conventions — notably: all state changes go through the typed reducer, pure logic belongs in `src/utils`, and no emojis in UI copy or commit messages.

## License

MIT


