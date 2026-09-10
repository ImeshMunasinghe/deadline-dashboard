import React, { useState, useCallback, memo } from 'react';
import {
  Trash2,
  ChevronDown,
  ChevronRight,
  Plus,
  GripVertical,
  Calendar,
  Clock,
  Lock,
  Play,
  Pause,
} from 'lucide-react';
import type { Task, Priority, SubTask } from '../types';
import type { AppAction } from '../types';
import { generateId, isOverdue, formatDate } from '../utils';
import { startPomodoro, togglePomodoro } from '../hooks';

interface TaskItemProps {
  task: Task;
  goalId: string;
  dispatch: React.Dispatch<AppAction>;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  availableTasks?: Task[];
  focusTargetId: string | null;
  pomoRunning: boolean;
}

// Priority color system
const PRIORITY_COLOR: Record<Priority, string> = {
  high:   'text-red-600    dark:text-red-400    bg-red-50    dark:bg-red-950/40    border-red-200    dark:border-red-900/50',
  medium: 'text-amber-600  dark:text-amber-400  bg-amber-50  dark:bg-amber-950/40  border-amber-200  dark:border-amber-900/50',
  low:    'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50',
};

const PRIORITY_DOT: Record<Priority, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500',
};

function _TaskItem({ task, goalId, dispatch, dragHandleProps, availableTasks, focusTargetId, pomoRunning }: TaskItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskText, setSubtaskText] = useState('');
  const [editingDue, setEditingDue] = useState(false);
  const [editingMinutes, setEditingMinutes] = useState(false);

  const isBlocked = task.blockedBy && availableTasks?.some(t => t.id === task.blockedBy && !t.completed);

  const isFocusTarget = task.id === focusTargetId;
  const isRunning = isFocusTarget && pomoRunning;

  // Start the shared Pomodoro on this task (or pause/resume if already targeted)
  const handleFocus = useCallback(() => {
    if (!isFocusTarget) {
      dispatch({ type: 'SET_FOCUS_TARGET', payload: { taskId: task.id } });
    }
    if (isFocusTarget && pomoRunning) {
      togglePomodoro(); // pause the running session
    } else {
      startPomodoro(); // start or resume
    }
  }, [dispatch, task.id, isFocusTarget, pomoRunning]);

  const overdue = isOverdue(task.dueDate) && !task.completed;
  const subtasksDone = task.subtasks.filter((s) => s.completed).length;

  function handleAddSubtask() {
    if (!subtaskText.trim()) return;
    const subtask: SubTask = {
      id: generateId(),
      text: subtaskText.trim(),
      completed: false,
    };
    dispatch({ type: 'ADD_SUBTASK', payload: { goalId, taskId: task.id, subtask } });
    setSubtaskText('');
    setAddingSubtask(false);
  }

  const cyclePriority = useCallback(() => {
    const order: Priority[] = ['low', 'medium', 'high'];
    const next = order[(order.indexOf(task.priority) + 1) % order.length];
    dispatch({ type: 'UPDATE_TASK', payload: { goalId, taskId: task.id, updates: { priority: next } } });
  }, [dispatch, goalId, task.id, task.priority]);

  const handleToggle = useCallback(() => {
    dispatch({ type: 'TOGGLE_TASK', payload: { goalId, taskId: task.id } });
  }, [dispatch, goalId, task.id]);

  const handleDelete = useCallback(() => {
    dispatch({ type: 'DELETE_TASK', payload: { goalId, taskId: task.id } });
  }, [dispatch, goalId, task.id]);

  return (
    <li
      className={`group rounded-xl border transition-all ${
        task.completed
          ? 'bg-white dark:bg-neutral-900/50 border-slate-200 dark:border-neutral-800/50 opacity-60'
          : overdue
          ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
          : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800'
      }`}
    >
      <div className="flex items-start gap-2 p-3">
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          aria-label="Drag to reorder task"
          className="shrink-0 mt-0.5 text-slate-300 dark:text-neutral-700 hover:text-slate-400 dark:text-neutral-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical size={14} />
        </div>

        {/* Checkbox */}
        <button
          disabled={!!isBlocked}
          onClick={handleToggle}
          aria-label={task.completed ? 'Mark task incomplete' : 'Mark task complete'}
          className={`shrink-0 mt-0.5 w-4 h-4 rounded border transition-all ${
            isBlocked
              ? 'border-slate-300 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-800 opacity-50 cursor-not-allowed'
              : task.completed
              ? 'bg-blue-600 border-blue-600'
              : 'border-slate-400 dark:border-neutral-600 hover:border-blue-600'
          } flex items-center justify-center`}
        >
          {isBlocked ? (
            <Lock size={10} className="text-slate-400 dark:text-neutral-500" />
          ) : task.completed && (
            <svg width="8" height="8" viewBox="0 0 8 8" className="text-white" fill="none">
              <path d="M1 4L3 6L7 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <span
              className={`text-sm leading-snug flex-1 min-w-0 ${
                task.completed ? 'line-through text-slate-400 dark:text-neutral-600' : 'text-slate-800 dark:text-neutral-200'
              }`}
            >
              {task.text}
            </span>

            {/* Priority badge */}
            <button
              onClick={cyclePriority}
              aria-label={`Priority: ${task.priority}. Click to cycle`}
              className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border transition-all ${PRIORITY_COLOR[task.priority]}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} />
              {task.priority}
            </button>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {/* Due date */}
            {editingDue ? (
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  autoFocus
                  defaultValue={task.dueDate ?? ''}
                  className="text-[10px] bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 rounded px-1 py-0.5 outline-none border border-blue-600"
                  onBlur={(e) => {
                    dispatch({
                      type: 'UPDATE_TASK',
                      payload: { goalId, taskId: task.id, updates: { dueDate: e.target.value || null } },
                    });
                    setEditingDue(false);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Escape') setEditingDue(false); }}
                />
              </div>
            ) : (
              <button
                onClick={() => setEditingDue(true)}
                aria-label={task.dueDate ? 'Change due date' : 'Add due date'}
                className={`flex items-center gap-1 text-[10px] transition-colors ${
                  overdue
                    ? 'text-amber-600 dark:text-amber-400'
                    : task.dueDate
                    ? 'text-slate-500 dark:text-neutral-500 hover:text-slate-700 dark:text-neutral-300'
                    : 'text-slate-400 dark:text-neutral-700 hover:text-slate-500 dark:text-neutral-500'
                }`}
              >
                <Calendar size={10} />
                {task.dueDate ? formatDate(task.dueDate) : 'Due'}
                {overdue && ' (overdue)'}
              </button>
            )}

            {/* Estimated Minutes */}
            {editingMinutes ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  autoFocus
                  min="0"
                  placeholder="mins"
                  defaultValue={task.estimatedMinutes ?? ''}
                  className="text-[10px] bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 rounded px-1 py-0.5 outline-none border border-blue-600 w-12"
                  onBlur={(e) => {
                    const val = parseInt(e.target.value);
                    dispatch({
                      type: 'UPDATE_TASK',
                      payload: { goalId, taskId: task.id, updates: { estimatedMinutes: isNaN(val) ? null : val } },
                    });
                    setEditingMinutes(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') setEditingMinutes(false);
                  }}
                />
              </div>
            ) : (
              <button
                onClick={() => setEditingMinutes(true)}
                aria-label={task.estimatedMinutes ? 'Edit minutes' : 'Add minutes'}
                className={`flex items-center gap-1 text-[10px] transition-colors ${
                  task.estimatedMinutes
                    ? 'text-slate-500 dark:text-neutral-500 hover:text-slate-700 dark:text-neutral-300'
                    : 'text-slate-400 dark:text-neutral-700 hover:text-slate-500 dark:text-neutral-500'
                }`}
              >
                <Clock size={10} />
                {task.estimatedMinutes
                  ? `${task.estimatedMinutes}m${task.actualMinutes > 0 ? ` / ${task.actualMinutes}m done` : ''}`
                  : 'Time'}
              </button>
            )}
            {task.actualMinutes > 0 && !task.estimatedMinutes && (
              <span className="flex items-center gap-1 text-[10px] text-blue-400" title="Logged focus time">
                <Clock size={10} />
                {task.actualMinutes}m focused
              </span>
            )}

            {/* Recurrence */}
            <select
              value={task.recurrence ?? ''}
              onChange={(e) => dispatch({
                type: 'UPDATE_TASK',
                payload: { goalId, taskId: task.id, updates: { recurrence: e.target.value ? e.target.value as any : null } }
              })}
              className={`text-[10px] bg-transparent outline-none cursor-pointer transition-colors ${
                task.recurrence
                  ? 'text-slate-500 dark:text-neutral-500'
                  : 'text-slate-400 dark:text-neutral-700'
              }`}
            >
              <option value="">No Repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>

            {/* Blocked By */}
            {availableTasks && availableTasks.length > 1 && (
              <select
                value={task.blockedBy ?? ''}
                onChange={(e) => dispatch({
                  type: 'UPDATE_TASK',
                  payload: { goalId, taskId: task.id, updates: { blockedBy: e.target.value || null } }
                })}
                className={`text-[10px] bg-transparent outline-none cursor-pointer transition-colors max-w-[80px] truncate ${
                  task.blockedBy
                    ? 'text-slate-500 dark:text-neutral-500'
                    : 'text-slate-400 dark:text-neutral-700'
                }`}
                title="Blocked By"
              >
                <option value="">Not blocked</option>
                {availableTasks.filter(t => t.id !== task.id).map(t => (
                  <option key={t.id} value={t.id}>Blocked by: {t.text}</option>
                ))}
              </select>
            )}

            {/* Subtask count */}
            {task.subtasks.length > 0 && (
              <span className="text-[10px] text-slate-400 dark:text-neutral-600">
                {subtasksDone}/{task.subtasks.length} subtasks
              </span>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!task.completed && (
            <button
              onClick={handleFocus}
              title={isRunning ? 'Pause timer for this task' : 'Start timer for this task'}
              aria-label={isRunning ? `Pause timer for ${task.text}` : `Start timer for ${task.text}`}
              className={`p-1 transition-colors ${
                isRunning
                  ? 'text-blue-600 dark:text-blue-400 animate-pulse'
                  : 'text-slate-300 dark:text-neutral-700 opacity-0 group-hover:opacity-100 hover:text-blue-500'
              }`}
            >
              {isRunning ? <Pause size={13} /> : <Play size={13} />}
            </button>
          )}
          {task.subtasks.length > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? 'Collapse subtasks' : 'Expand subtasks'}
              className="p-1 text-slate-400 dark:text-neutral-600 hover:text-slate-700 dark:text-neutral-300 transition-colors"
            >
              {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
          )}
          <button
            onClick={() => setAddingSubtask((v) => !v)}
            aria-label="Add subtask"
            className="p-1 text-slate-300 dark:text-neutral-700 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Plus size={13} />
          </button>
          <button
            onClick={handleDelete}
            aria-label="Delete task"
            className="p-1 text-slate-300 dark:text-neutral-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Subtasks */}
      {(expanded || task.subtasks.length > 0) && expanded && (
        <ul className="flex flex-col gap-1 px-3 pb-3 ml-8">
          {task.subtasks.map((sub) => (
            <li
              key={sub.id}
              className="group/sub flex items-center gap-2 py-1 rounded-lg px-2 hover:bg-slate-100 dark:bg-neutral-800/50 transition-colors"
            >
              <button
                onClick={() =>
                  dispatch({ type: 'TOGGLE_SUBTASK', payload: { goalId, taskId: task.id, subtaskId: sub.id } })
                }
                aria-label={sub.completed ? 'Mark subtask incomplete' : 'Mark subtask complete'}
                className={`shrink-0 w-3.5 h-3.5 rounded border transition-all ${
                  sub.completed ? 'bg-blue-600 border-blue-600' : 'border-slate-400 dark:border-neutral-600 hover:border-blue-600'
                } flex items-center justify-center`}
              >
                {sub.completed && (
                  <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
                    <path d="M1 4L3 6L7 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                )}
              </button>
              <span
                className={`text-xs flex-1 ${
                  sub.completed ? 'line-through text-slate-400 dark:text-neutral-600' : 'text-slate-500 dark:text-neutral-400'
                }`}
              >
                {sub.text}
              </span>
              <button
                onClick={() =>
                  dispatch({ type: 'DELETE_SUBTASK', payload: { goalId, taskId: task.id, subtaskId: sub.id } })
                }
                aria-label="Delete subtask"
                className="opacity-0 group-hover/sub:opacity-100 text-slate-300 dark:text-neutral-700 hover:text-red-400 transition-all"
              >
                <Trash2 size={11} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add subtask inline form */}
      {addingSubtask && (
        <div className="flex items-center gap-2 px-3 pb-3 ml-8">
          <input
            autoFocus
            type="text"
            placeholder="Subtask description"
            value={subtaskText}
            onChange={(e) => setSubtaskText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddSubtask();
              if (e.key === 'Escape') setAddingSubtask(false);
            }}
            className="flex-1 text-xs bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 rounded px-2 py-1 outline-none border border-slate-300 dark:border-neutral-700 focus:border-blue-600"
          />
          <button onClick={handleAddSubtask} className="text-xs text-blue-500 hover:text-blue-400">
            Add
          </button>
        </div>
      )}
    </li>
  );
}

export const TaskItem = memo(_TaskItem);