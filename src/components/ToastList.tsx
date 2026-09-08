import { useEffect, useState } from 'react';
import { X, Bell, CheckCircle2, AlertTriangle } from 'lucide-react';
import { subscribeToToasts, dismissToast } from '../utils';
import type { Toast } from '../utils';

const variantStyles: Record<Toast['variant'], string> = {
  info: 'border-blue-500 dark:border-blue-400',
  warning: 'border-amber-500 dark:border-amber-400',
  success: 'border-emerald-500 dark:border-emerald-400',
};

const variantIcon: Record<Toast['variant'], typeof Bell> = {
  info: Bell,
  warning: AlertTriangle,
  success: CheckCircle2,
};

export function ToastList() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => subscribeToToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)] pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((t) => {
        const Icon = variantIcon[t.variant];
        return (
          <div
            key={t.id}
            className={`toast-slide-up pointer-events-auto card p-3 shadow-lg border-l-4 ${variantStyles[t.variant]}`}
          >
            <div className="flex items-start gap-2">
              <Icon size={16} className="mt-0.5 shrink-0 text-slate-500 dark:text-neutral-400" />
              <p className="text-xs leading-snug flex-1 text-slate-700 dark:text-neutral-200">{t.message}</p>
              <button
                onClick={() => dismissToast(t.id)}
                aria-label="Dismiss notification"
                className="shrink-0 rounded-md p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
