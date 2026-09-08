import { useEffect, useRef } from 'react';
import type { AppState } from '../types';
import {
  scheduleDeadlineNotifications,
  requestNotificationPermission,
  clearTodayNotified,
  notificationsSupported,
} from '../utils';
import { showToast } from '../utils';

const CHECK_INTERVAL_MS = 60 * 1000; // re-scan every 60s while the app is open

// ─── useDeadlineReminders ─────────────────────────────────────────────────
// Periodically computes and surfaces deadline reminders. Uses native
// notifications when permitted; falls back to in-app toasts otherwise.
// Re-scans on a timer so reminders fire even if the deadline becomes due
// after the app has been open for a while (the old behaviour only fired once
// on load).
export function useDeadlineReminders(state: AppState): void {
  const stateRef = useRef(state);
  stateRef.current = state;

  // Track the last permission state so a mid-session grant can re-fire today's
  // pending reminders (after clearing the dedupe keys).
  const lastPermission = useRef<NotificationPermission | 'unsupported'>(
    notificationsSupported() ? Notification.permission : 'unsupported'
  );

  // Initial scan + periodic re-scan.
  useEffect(() => {
    if (!state.remindersEnabled) return;

    const run = (): void => {
      scheduleDeadlineNotifications(stateRef.current, undefined, (n) => {
        const variant = n.title === 'Overdue task' ? 'warning' : 'info';
        showToast(`${n.title}: ${n.body}`, variant);
      });
    };

    // Fire once immediately on mount / when reminders are toggled on.
    run();

    const id = window.setInterval(run, CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [state.remindersEnabled]);

  // Watch for permission changes: if the user grants permission mid-session,
  // clear today's dedupe keys and re-run so native notifications take over.
  useEffect(() => {
    if (!state.remindersEnabled) return;
    if (!notificationsSupported()) return;

    const check = async (): Promise<void> => {
      const perm = await requestNotificationPermission();
      if (perm === 'granted' && lastPermission.current !== 'granted') {
        clearTodayNotified();
        scheduleDeadlineNotifications(stateRef.current);
      }
      lastPermission.current = perm;
    };

    const id = window.setInterval(check, CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [state.remindersEnabled]);
}
