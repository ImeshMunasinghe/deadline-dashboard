import React from 'react';
import type { AppState, AppAction, Task } from '../types';
import { isOverdue, todayISO } from '../utils';
import { TaskItem } from './TaskItem';

interface TodayViewProps {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

export function TodayView({ state, dispatch }: TodayViewProps) {
  const today = todayISO();
  
  // Aggregate tasks from all goals
  const todayTasks: { task: Task, goalId: string, goalTitle: string }[] = [];
  
  state.goals.forEach(goal => {
    goal.tasks.forEach(task => {
      if (!task.completed) {
        // Due today or overdue
        if (task.dueDate === today || isOverdue(task.dueDate)) {
          todayTasks.push({ task, goalId: goal.id, goalTitle: goal.title });
        }
      }
    });
  });

  // Calculate daily capacity (max 360 mins)
  const totalMinutes = todayTasks.reduce((sum, item) => sum + (item.task.estimatedMinutes || 0), 0);
  const capacityPercent = Math.min(100, (totalMinutes / 360) * 100);
  const isOverCapacity = totalMinutes > 360;

  return (
    <div className="p-6 max-w-5xl w-full mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-neutral-100">Today's Focus</h2>
      
      {/* Daily Capacity Meter */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-4 mb-6">
        <div className="flex justify-between items-end mb-2">
          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-neutral-300">Daily Capacity</h3>
            <p className="text-xs text-slate-400 dark:text-neutral-500">6 hours max recommended</p>
          </div>
          <div className={`text-sm font-semibold ${isOverCapacity ? 'text-red-400' : 'text-slate-700 dark:text-neutral-300'}`}>
            {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m / 6h
          </div>
        </div>
        <div className="h-2 w-full bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${isOverCapacity ? 'bg-red-500' : 'bg-blue-600'}`}
            style={{ width: `${capacityPercent}%` }}
          />
        </div>
        {isOverCapacity && (
          <p className="text-xs text-red-400 mt-2">
            You are over capacity! Consider deferring some tasks.
          </p>
        )}
      </div>

      {/* Task List */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-6">
        {todayTasks.length === 0 ? (
          <div className="text-center py-10 text-slate-400 dark:text-neutral-500">
            <p>No tasks due today. Enjoy your day!</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {todayTasks.map((item) => (
              <div key={item.task.id} className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase tracking-wider ml-1">
                  From: {item.goalTitle}
                </span>
                <TaskItem 
                  task={item.task}
                  goalId={item.goalId}
                  dispatch={dispatch}
                  availableTasks={state.goals.find(g => g.id === item.goalId)?.tasks}
                />
              </div>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
