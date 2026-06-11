import { Target, Plus } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 px-8 py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 flex items-center justify-center">
        <Target size={28} className="text-blue-500" />
      </div>
      <div className="max-w-sm">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-neutral-200 mb-2">
          No goals yet
        </h2>
        <p className="text-sm text-gray-400 dark:text-neutral-500 leading-relaxed">
          Add a goal using the sidebar. Set a title, a target date, and
          start building your task list — the countdown starts immediately.
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-neutral-600 border border-gray-200 dark:border-neutral-800 rounded-lg px-4 py-2">
        <Plus size={12} />
        Click the + in the sidebar to add your first goal
      </div>
    </div>
  );
}