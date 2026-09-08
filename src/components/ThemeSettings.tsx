import React from 'react';
import { Palette, X } from 'lucide-react';
import type { AppState, AppAction } from '../types';

const ACCENTS = [
  '#2563eb', // blue
  '#7c3aed', // violet
  '#db2777', // pink
  '#059669', // emerald
  '#d97706', // amber
  '#dc2626', // red
  '#0891b2', // cyan
  '#f97316', // orange
];

interface ThemeSettingsProps {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  onClose: () => void;
}

// ── Accent color picker (light/dark aware via CSS var) ─────────────────────
export function ThemeSettings({ state, dispatch, onClose }: ThemeSettingsProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-neutral-100">Theme accent</h2>
            <p className="text-xs text-slate-400 dark:text-neutral-500 mt-0.5">Pick an accent colour used across the app</p>
          </div>
          <button onClick={onClose} aria-label="Close theme settings" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {ACCENTS.map((c) => (
            <button
              key={c}
              onClick={() => dispatch({ type: 'SET_ACCENT', payload: { color: c } })}
              aria-label={`Set accent to ${c}`}
              aria-pressed={state.accent === c}
              className={`w-9 h-9 rounded-full focus-ring ${state.accent === c ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white' : 'hover:scale-105'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Swatch showing current accent */}
        <div className="flex items-center gap-2 pt-4">
          <Palette size={14} className="text-slate-400" />
          <span className="text-[11px] text-slate-500 dark:text-neutral-400">Current: {state.accent}</span>
          <span className="ml-auto w-4 h-4 rounded" style={{ backgroundColor: state.accent }} />
        </div>
      </div>
    </div>
  );
}