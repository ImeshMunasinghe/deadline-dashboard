import { BookOpen } from 'lucide-react';
import type { AppState } from '../types';

interface ReflectionViewProps {
  state: AppState;
  onOpenReflection: () => void;
}

export function ReflectionView({ state, onOpenReflection }: ReflectionViewProps) {
  const reflections = state.reflections
    .filter((r) => r.date !== '__trigger__' && r.content)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="max-w-3xl w-full mx-auto p-6 flex flex-col gap-4">
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-slate-800 dark:text-neutral-200 flex items-center gap-2">
              <BookOpen size={15} className="text-blue-500" aria-hidden />
              Daily Reflections
            </h3>
            <p className="text-xs text-slate-400 dark:text-neutral-500 mt-0.5">Your end-of-day journal entries</p>
          </div>
          <button
            onClick={onOpenReflection}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            + Write Today's Reflection
          </button>
        </div>

        {reflections.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-neutral-500">
            <p className="text-sm">No reflections yet.</p>
            <p className="text-xs mt-1">Write your first entry with the button above.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reflections.map((r, i) => (
              <div key={i} className="border border-slate-100 dark:border-neutral-800 rounded-lg p-4">
                <p className="text-xs font-semibold text-blue-500 mb-2">
                  {new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-sm text-slate-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">{r.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}