import React, { useState } from 'react';
import type { AppState, AppAction } from '../types';

interface DailyReflectionProps {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  isOpen: boolean;
  onClose: () => void;
}

export function DailyReflection({ state: _state, dispatch, isOpen, onClose }: DailyReflectionProps) {
  const [content, setContent] = useState('');

  // Auto-open at end of day (after 5 PM), once per day — handled by parent App.tsx
  // The `isOpen` prop drives visibility directly.

  if (!isOpen) return null;

  function handleSave() {
    if (!content.trim()) {
      onClose();
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    dispatch({
      type: 'SAVE_REFLECTION',
      payload: { reflection: { date: todayStr, content: content.trim() } },
    });
    setContent('');
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-blue-600/10 flex items-center justify-center shrink-0">
            <span className="text-lg">📝</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-neutral-100">Daily Reflection</h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-neutral-400 mb-3">
          What did you accomplish today? What's blocking you?
        </p>
        <textarea
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleSave(); }}
          placeholder="Today I finished… I'm still stuck on… Tomorrow I'll…"
          className="w-full h-32 bg-slate-50 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200
            placeholder-slate-400 dark:placeholder-neutral-500 rounded-xl p-3 outline-none
            border border-slate-200 dark:border-neutral-700 focus:border-blue-500 transition-colors resize-none mb-4 text-sm"
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-400 dark:text-neutral-600">Ctrl+Enter to save</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200 transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Save Reflection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
