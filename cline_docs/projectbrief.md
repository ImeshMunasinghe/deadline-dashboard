# Project Brief: Deadline Dashboard

## Purpose
Deadline Dashboard is a client-side productivity app for tracking deadlines, goals, and tasks, with countdowns, progress analytics, a Pomodoro timer, quick capture (inbox), daily reflections, notes, and milestones.

## Core Requirements
- **Goals with deadlines**: Each goal has a title, target date, tasks, notes, milestones, category, and color. A live countdown (days/hours/minutes/seconds) is shown per goal.
- **Task management**: Tasks have priority (low/medium/high), due dates, subtasks, estimates, recurrence (daily/weekly/monthly), and dependencies (`blockedBy`).
- **Multiple views**: Calendar (default home: month grid of deadlines), Today view (daily plan queue), Analytics view, Goal view, and Inbox (quick capture).
- **Undo/Redo**: History-based undo/redo (last 20 states) with Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y shortcuts.
- **Persistence**: Entire app state is saved to localStorage (`deadline-dashboard-v2`); a daily streak is tracked separately.
- **Export/Import**: Full state backup as JSON download; import with basic validation.
- **Sharing**: A goal snapshot can be encoded as a base64 URL param (`?share=...`) and imported as a read-only copy by the recipient.
- **Gamification**: Confetti animation when a goal reaches 100% completion; streak tracking.
- **PWA**: Installable offline-capable app via vite-plugin-pwa (autoUpdate).

## Scope Constraints
- Fully client-side — no backend, no server storage, no user accounts.
- All data lives in the browser's localStorage.
- Single-page app built with Vite + React 18 + TypeScript.
