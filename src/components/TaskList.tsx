import React, { useEffect, useRef, useState } from 'react';
import { Plus, ArrowUpDown } from 'lucide-react';
import type { Goal, Task, Priority } from '../types';
import type { AppAction } from '../types';
import { generateId, priorityWeight, isOverdue, parseSmartInput } from '../utils';
import { usePomodoroMeta } from '../hooks';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  goal: Goal;
  dispatch: React.Dispatch<AppAction>;
  focusTargetId: string | null;
}

type SortMode = 'manual' | 'priority' | 'dueDate' | 'status';

const SORT_LABELS: Record<SortMode, string> = {
  manual: 'Manual',
  priority: 'Priority',
  dueDate: 'Due date',
  status: 'Status',
};

function sortTasks(tasks: Task[], mode: SortMode): Task[] {
  if (mode === 'manual') return tasks;
  return [...tasks].sort((a, b) => {
    if (mode === 'priority') return priorityWeight(a.priority) - priorityWeight(b.priority);
    if (mode === 'status') return Number(a.completed) - Number(b.completed);
    if (mode === 'dueDate') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return 0;
  });
}

export function TaskList({ goal, dispatch, focusTargetId }: TaskListProps) {
  const { running: pomoRunning } = usePomodoroMeta();
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('manual');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: N to focus the new task input
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.key === 'n' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close sort menu on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // ── Smart Add via shared parser (priority, estimate, recurrence, due, after:) ──
  function addTask() {
    if (!text.trim()) return;
    const parsed = parseSmartInput(text, {
      currentPriority: priority,
      currentDue: dueDate,
      tasks: goal.tasks,
    });
    if (!parsed.text) return;
    const task: Task = {
      id: generateId(),
      text: parsed.text,
      completed: false,
      priority: parsed.priority,
      dueDate: parsed.dueDate,
      subtasks: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
      estimatedMinutes: parsed.estimatedMinutes,
      actualMinutes: 0,
      recurrence: parsed.recurrence,
      blockedBy: parsed.blockedBy,
    };
    dispatch({ type: 'ADD_TASK', payload: { goalId: goal.id, task } });
    setText('');
    setDueDate('');
    setPriority('medium');
  }

  // ── Drag-and-drop (native HTML5, no extra deps needed for basic reorder)
  const dragIndex = useRef<number | null>(null);
  const dropIndex = useRef<number | null>(null);

  function onDragStart(i: number) {
    dragIndex.current = i;
  }
  function onDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    dropIndex.current = i;
  }
  function onDrop() {
    if (dragIndex.current === null || dropIndex.current === null) return;
    if (dragIndex.current === dropIndex.current) return;
    const reordered = [...goal.tasks];
    const [moved] = reordered.splice(dragIndex.current, 1);
    reordered.splice(dropIndex.current, 0, moved);
    dispatch({ type: 'REORDER_TASKS', payload: { goalId: goal.id, tasks: reordered } });
    dragIndex.current = null;
    dropIndex.current = null;
  }

  const visibleTasks = sortTasks(goal.tasks, sortMode);

  // Separate overdue tasks to float them up when sort = manual
  const overdueTasks = sortMode === 'manual'
    ? visibleTasks.filter((t) => !t.completed && isOverdue(t.dueDate))
    : [];
  const regularTasks = sortMode === 'manual'
    ? visibleTasks.filter((t) => !overdueTasks.includes(t))
    : visibleTasks;

  const displayTasks = [...overdueTasks, ...regularTasks];

  return (
    <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium tracking-widest text-slate-400 dark:text-neutral-500 uppercase">
          Tasks
          {goal.tasks.length > 0 && (
            <span className="ml-2 text-slate-300 dark:text-neutral-700">({goal.tasks.length})</span>
          )}
        </h3>

        {/* Sort */}
        <div className="relative" ref={sortMenuRef}>
          <button
            onClick={() => setShowSortMenu((v) => !v)}
            aria-label="Sort tasks"
            className="flex items-center gap-1 text-xs text-slate-400 dark:text-neutral-600 hover:text-slate-700 dark:text-neutral-300 transition-colors"
          >
            <ArrowUpDown size={12} />
            {SORT_LABELS[sortMode]}
          </button>
          {showSortMenu && (
            <div className="absolute right-0 top-full mt-1 bg-slate-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-lg overflow-hidden shadow-xl z-10">
              {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setSortMode(mode); setShowSortMenu(false); }}
                  className={`block w-full text-left px-3 py-2 text-xs transition-colors ${
                    sortMode === mode
                      ? 'text-blue-500 bg-blue-900/30'
                      : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:text-neutral-200 hover:bg-slate-200 dark:bg-neutral-700'
                  }`}
                >
                  {SORT_LABELS[mode]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add task form */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Add task... !high today  or  Review notes !low fri"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addTask();
              if (e.key === 'Escape') { setText(''); inputRef.current?.blur(); }
            }}
            className="flex-1 text-sm bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 placeholder-slate-400 dark:placeholder-neutral-600 rounded-lg px-3 py-2 outline-none border border-slate-300 dark:border-neutral-700 focus:border-blue-600 transition-colors"
          />
          <button
            onClick={addTask}
            aria-label="Add task"
            className="shrink-0 bg-blue-600 hover:bg-blue-600 text-white rounded-lg p-2 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Priority + due date row */}
        <div className="flex gap-2">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            aria-label="Task priority"
            className="text-xs bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400 rounded-lg px-2 py-1.5 outline-none border border-slate-300 dark:border-neutral-700 focus:border-blue-600 transition-colors cursor-pointer"
          >
            <option value="low">Low priority</option>
            <option value="medium">Medium priority</option>
            <option value="high">High priority</option>
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            aria-label="Task due date"
            className="text-xs bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400 rounded-lg px-2 py-1.5 outline-none border border-slate-300 dark:border-neutral-700 focus:border-blue-600 transition-colors"
          />
        </div>
      </div>

      {/* Task list */}
      {displayTasks.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-400 dark:text-neutral-600">
          No tasks yet. Add one above to get started.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {displayTasks.map((task, i) => (
            <div
              key={task.id}
              draggable={sortMode === 'manual'}
              onDragStart={() => onDragStart(i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDrop={onDrop}
            >
              <TaskItem
                task={task}
                goalId={goal.id}
                dispatch={dispatch}
                dragHandleProps={{ role: 'button', tabIndex: 0 }}
                availableTasks={goal.tasks}
                focusTargetId={focusTargetId}
                pomoRunning={pomoRunning}
              />
            </div>
          ))}
        </ul>
      )}

      {/* Keyboard hint */}
      {goal.tasks.length > 0 && (
        <p className="mt-3 text-[10px] text-slate-300 dark:text-neutral-700 text-center">
          Press N to add a task · Escape to cancel
        </p>
      )}
    </div>
  );
}