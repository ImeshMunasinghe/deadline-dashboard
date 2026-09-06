# Product Context

## Problem
Students and professionals juggling multiple deadlines lack a single place that combines deadline awareness (countdowns), task breakdown, focus time (Pomodoro), and motivation (streaks, confetti, analytics).

## Solution
A lightweight, offline-first dashboard organized around **Goals** (big deliverables with a deadline) that contain **Tasks** and **Milestones**, plus auxiliary views:

- **Goal view** — countdown card (with progress bar from creation → deadline), task list, notes & milestones.
- **Today view** — cross-goal look at what's due today / overdue.
- **Analytics view** — progress charts (Recharts) and stress indicators across goals.
- **Inbox** — QuickCapture for frictionless task dumping; tasks can later be moved into a goal.
- **Daily Reflection** — journal entries stored per date.

## User Experience Goals
- Instant, keyboard-friendly interaction; floating always-visible Pomodoro timer and QuickCapture.
- Dark-mode aware design (Tailwind `dark:` variants).
- Fun feedback: confetti at 100% completion, streak counter for consecutive daily visits.
- Zero-friction onboarding: no accounts — open the app and start.
- Share a goal with a friend via a URL containing an encoded snapshot.
