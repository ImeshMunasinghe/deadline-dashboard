import React, { useRef } from 'react';
import { Download, Upload, FileText, Calendar, HardDrive, ArrowDownUp } from 'lucide-react';
import type { AppState, AppAction } from '../types';
import { generateId, exportStateAsJSON, parseImportedState, buildICS, downloadICS, parseICS } from '../utils';

interface ImportExportTabProps {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

export function ImportExportTab({ state, dispatch }: ImportExportTabProps) {
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const icsInputRef = useRef<HTMLInputElement>(null);

  function handleExportJSON() {
    exportStateAsJSON(state);
  }

  function handleImportJSONClick() {
    jsonInputRef.current?.click();
  }

  function handleJSONFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseImportedState(text);
      if (parsed) {
        dispatch({ type: 'LOAD_STATE', payload: parsed });
        alert('Backup restored successfully.');
      } else {
        alert('Invalid backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleExportICS() {
    const ics = buildICS(state);
    downloadICS(ics);
  }

  function handleImportICSClick() {
    icsInputRef.current?.click();
  }

  function handleICSFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const events = parseICS(text);
      if (events.length === 0) {
        alert('No all-day events found in that .ics file.');
        return;
      }
      events.forEach((ev) => {
        dispatch({
          type: 'ADD_TO_INBOX',
          payload: {
            task: {
              id: generateId(),
              text: ev.summary,
              completed: false,
              priority: 'medium',
              dueDate: ev.date,
              subtasks: [],
              createdAt: new Date().toISOString(),
              completedAt: null,
              estimatedMinutes: null,
              actualMinutes: 0,
              recurrence: null,
              blockedBy: null,
            },
          },
        });
      });
      alert(`Imported ${events.length} event${events.length === 1 ? '' : 's'} to your inbox.`);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const taskCount = state.goals.reduce((sum, g) => sum + g.tasks.length, 0);
  const goalCount = state.goals.length;
  const milestoneCount = state.goals.reduce((sum, g) => sum + g.milestones.length, 0);

  return (
    <div className="p-6 max-w-3xl w-full mx-auto">
      <h1 className="text-xl font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-2 mb-6">
        <ArrowDownUp size={20} />
        Import / Export
      </h1>
      <section className="card p-5 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <HardDrive size={18} className="text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">App data backup (JSON)</h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-neutral-400 mb-4">
          {goalCount} goals, {taskCount} tasks, {milestoneCount} milestones
        </p>
        <div className="flex gap-3">
          <button onClick={handleExportJSON} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
            <Download size={16} /> Save backup
          </button>
          <button onClick={handleImportJSONClick} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-neutral-600 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 text-sm font-medium">
            <Upload size={16} /> Restore
          </button>
        </div>
        <input ref={jsonInputRef} type="file" accept=".json" onChange={handleJSONFile} className="hidden" />
      </section>
      <section className="card p-5">
        <div className="flex items-center gap-3 mb-3">
          <Calendar size={18} className="text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">Calendar exchange (ICS)</h2>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExportICS} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium">
            <FileText size={16} /> Export ICS
          </button>
          <button onClick={handleImportICSClick} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-neutral-600 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 text-sm font-medium">
            <Upload size={16} /> Import ICS
          </button>
        </div>
        <input ref={icsInputRef} type="file" accept=".ics,text/calendar" onChange={handleICSFile} className="hidden" />
      </section>
    </div>
  );
}