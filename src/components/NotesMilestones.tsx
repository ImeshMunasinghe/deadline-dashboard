import React, { useCallback, useRef, useState } from 'react';
import { Plus, Trash2, BookOpen, Flag } from 'lucide-react';
import type { Goal, Milestone } from '../types';
import type { AppAction } from '../types';
import { generateId, formatDate } from '../utils';

interface NotesMilestonesProps {
  goal: Goal;
  dispatch: React.Dispatch<AppAction>;
}

export function NotesMilestones({ goal, dispatch }: NotesMilestonesProps) {
  const [tab, setTab] = useState<'notes' | 'milestones'>('notes');
  const [msLabel, setMsLabel] = useState('');
  const [msDate, setMsDate] = useState('');
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Debounced notes save
  const handleNotesChange = useCallback(
    (val: string) => {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        dispatch({ type: 'UPDATE_NOTES', payload: { goalId: goal.id, notes: val } });
      }, 400);
    },
    [goal.id, dispatch]
  );

  function addMilestone() {
    if (!msLabel.trim() || !msDate) return;
    const milestone: Milestone = {
      id: generateId(),
      label: msLabel.trim(),
      date: msDate,
    };
    dispatch({ type: 'ADD_MILESTONE', payload: { goalId: goal.id, milestone } });
    setMsLabel('');
    setMsDate('');
  }

  // Sort milestones chronologically
  const sorted = [...goal.milestones].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Build timeline positions
  const goalStart = new Date(goal.createdAt).getTime();
  const goalEnd = new Date(goal.targetDate).getTime();
  const totalSpan = goalEnd - goalStart;
  const [now] = useState(() => new Date());

  function timelinePercent(dateISO: string) {
    const t = new Date(dateISO).getTime();
    return Math.min(100, Math.max(0, ((t - goalStart) / totalSpan) * 100));
  }

  const todayPercent = timelinePercent(now.toISOString());

  return (
    <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6">
      {/* Tab switcher */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setTab('notes')}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
            tab === 'notes'
              ? 'bg-blue-900/40 text-blue-400 border border-blue-700/50'
              : 'text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:text-neutral-300'
          }`}
        >
          <BookOpen size={12} />
          Notes
        </button>
        <button
          onClick={() => setTab('milestones')}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
            tab === 'milestones'
              ? 'bg-blue-900/40 text-blue-400 border border-blue-700/50'
              : 'text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:text-neutral-300'
          }`}
        >
          <Flag size={12} />
          Milestones
          {goal.milestones.length > 0 && (
            <span className="text-gray-400 dark:text-neutral-600 ml-0.5">({goal.milestones.length})</span>
          )}
        </button>
      </div>

      {/* Notes tab */}
      {tab === 'notes' && (
        <textarea
          key={goal.id}
          defaultValue={goal.notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Scratch notes, links, context... auto-saved as you type."
          className="w-full h-36 text-sm bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 placeholder-gray-400 dark:placeholder-neutral-600 rounded-lg px-3 py-2 outline-none border border-gray-300 dark:border-neutral-700 focus:border-blue-600 transition-colors resize-none leading-relaxed"
        />
      )}

      {/* Milestones tab */}
      {tab === 'milestones' && (
        <div className="flex flex-col gap-4">
          {/* Add milestone */}
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Milestone name"
              value={msLabel}
              onChange={(e) => setMsLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addMilestone(); }}
              className="flex-1 text-xs bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-neutral-200 rounded-lg px-2 py-1.5 outline-none border border-gray-300 dark:border-neutral-700 focus:border-blue-600"
            />
            <input
              type="date"
              value={msDate}
              onChange={(e) => setMsDate(e.target.value)}
              className="text-xs bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400 rounded-lg px-2 py-1.5 outline-none border border-gray-300 dark:border-neutral-700 focus:border-blue-600"
            />
            <button
              onClick={addMilestone}
              aria-label="Add milestone"
              className="bg-blue-600 hover:bg-blue-600 text-white rounded-lg p-1.5 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Timeline */}
          {sorted.length > 0 && (
            <div className="relative pt-3">
              {/* Track line */}
              <div className="relative h-1 bg-gray-100 dark:bg-neutral-800 rounded-full mx-2 mb-6">
                {/* Today marker */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500 border-2 border-neutral-900 z-10"
                  style={{ left: `${todayPercent}%`, transform: 'translate(-50%, -50%)' }}
                  title="Today"
                />
                {/* Milestone ticks */}
                {sorted.map((m) => {
                  const pct = timelinePercent(m.date);
                  const isPast = new Date(m.date).getTime() < now.getTime();
                  return (
                    <div
                      key={m.id}
                      className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full border-2 border-neutral-900 ${
                        isPast ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                      style={{ left: `${pct}%`, transform: 'translate(-50%, -50%)' }}
                    />
                  );
                })}
              </div>

              {/* List */}
              <ul className="flex flex-col gap-1">
                {sorted.map((m) => {
                  const isPast = new Date(m.date).getTime() < now.getTime();
                  return (
                    <li
                      key={m.id}
                      className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:bg-neutral-800/50 transition-colors"
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isPast ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}
                      />
                      <span className={`text-xs flex-1 ${isPast ? 'text-gray-400 dark:text-neutral-500 line-through' : 'text-gray-700 dark:text-neutral-300'}`}>
                        {m.label}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-neutral-600 shrink-0">
                        {formatDate(m.date)}
                      </span>
                      <button
                        onClick={() =>
                          dispatch({
                            type: 'DELETE_MILESTONE',
                            payload: { goalId: goal.id, milestoneId: m.id },
                          })
                        }
                        aria-label={`Delete milestone: ${m.label}`}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 dark:text-neutral-700 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={11} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {sorted.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-neutral-600 text-center py-4">
              No milestones yet. Mark key dates on the timeline above.
            </p>
          )}
        </div>
      )}
    </div>
  );
}