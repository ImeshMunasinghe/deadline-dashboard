// â”€â”€â”€ Core Data Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type Priority = 'low' | 'medium' | 'high';

export interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  dueDate: string | null;  // ISO date string or null
  subtasks: SubTask[];
  createdAt: string;       // ISO date string
  completedAt: string | null; // ISO datetime when task was completed, null if incomplete
  estimatedMinutes: number | null;
  actualMinutes: number;   // minutes of logged focus time
  recurrence: 'daily' | 'weekly' | 'monthly' | null;
  blockedBy: string | null; // ID of another task
}

export interface Milestone {
  id: string;
  label: string;
  date: string; // ISO date string
}

export type GoalCategory = 'Work' | 'Personal' | 'Health' | 'Learning' | 'Other';

export interface Goal {
  id: string;
  title: string;
  targetDate: string; // ISO date string
  tasks: Task[];
  notes: string;
  milestones: Milestone[];
  createdAt: string;
  category: GoalCategory;
  color: string; // Hex code or Tailwind class
}

// â”€â”€â”€ Countdown State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  totalSeconds: number;
  progressPercent: number; // 0â€“100 from creation â†’ deadline
}

// â”€â”€â”€ App State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface Reflection {
  date: string; // ISO date string YYYY-MM-DD
  content: string;
}

export interface AppState {
  goals: Goal[];
  activeGoalId: string | null;
  activeView: ViewType;
  inbox: Task[];
  templates: Goal[];
  reflections: Reflection[];
  dailyPlan: DailyPlan | null;
  remindersEnabled: boolean;
  // How many hours ahead of a deadline a reminder fires (default 24).
  reminderLeadHours: number;
  // Multi-day plans (YYYY-MM-DD â†’ plan). Today's plan is mirrored in dailyPlan.
  plans: Record<string, DailyPlan>;
  // Recurring routine checklists that spawn tasks on demand
  routines: Routine[];
}

export type ViewType = 'calendar' | 'today' | 'planner' | 'timeline' | 'analytics' | 'goal' | 'inbox' | 'importexport';

// Ordered queue of task IDs planned for a specific day
export interface DailyPlan {
  date: string; // YYYY-MM-DD
  taskIds: string[];
  // Optional time-block start times per task (HH:MM)
  starts?: Record<string, string>;
}

// A routine checklist that can spawn the same set of tasks repeatedly
export interface Routine {
  id: string;
  title: string;
  goalId: string;
  taskTexts: string[];
  frequency: 'daily' | 'weekly' | 'weekdays';
}

// â”€â”€â”€ Reducer Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type AppAction =
  | { type: 'ADD_GOAL'; payload: Goal }
  | { type: 'UPDATE_GOAL'; payload: { id: string; updates: Partial<Omit<Goal, 'id' | 'tasks'>> } }
  | { type: 'DELETE_GOAL'; payload: { id: string } }
  | { type: 'SET_ACTIVE_GOAL'; payload: { id: string } }
  | { type: 'ADD_TASK'; payload: { goalId: string; task: Task } }
  | { type: 'UPDATE_TASK'; payload: { goalId: string; taskId: string; updates: Partial<Task> } }
  | { type: 'DELETE_TASK'; payload: { goalId: string; taskId: string } }
  | { type: 'TOGGLE_TASK'; payload: { goalId: string; taskId: string } }
  | { type: 'ADD_SUBTASK'; payload: { goalId: string; taskId: string; subtask: SubTask } }
  | { type: 'TOGGLE_SUBTASK'; payload: { goalId: string; taskId: string; subtaskId: string } }
  | { type: 'DELETE_SUBTASK'; payload: { goalId: string; taskId: string; subtaskId: string } }
  | { type: 'UPDATE_NOTES'; payload: { goalId: string; notes: string } }
  | { type: 'ADD_MILESTONE'; payload: { goalId: string; milestone: Milestone } }
  | { type: 'DELETE_MILESTONE'; payload: { goalId: string; milestoneId: string } }
  | { type: 'REORDER_TASKS'; payload: { goalId: string; tasks: Task[] } }
  | { type: 'LOAD_STATE'; payload: AppState }
  // Undo/Redo
  | { type: 'UNDO' }
  | { type: 'REDO' }
  // Navigation
  | { type: 'SET_ACTIVE_VIEW'; payload: { view: ViewType } }
  // Inbox
  | { type: 'ADD_TO_INBOX'; payload: { task: Task } }
  | { type: 'DELETE_FROM_INBOX'; payload: { taskId: string } }
  | { type: 'MOVE_FROM_INBOX'; payload: { taskId: string; goalId: string } }
  | { type: 'UPDATE_INBOX_TASK'; payload: { taskId: string; updates: Partial<Task> } }
  // Templates
  | { type: 'SAVE_TEMPLATE'; payload: { template: Goal } }
  | { type: 'DELETE_TEMPLATE'; payload: { templateId: string } }
  // Reflections
  | { type: 'SAVE_REFLECTION'; payload: { reflection: Reflection } }
  // Daily plan
  | { type: 'SET_DAILY_PLAN'; payload: { date: string; taskIds: string[] } }
  | { type: 'REORDER_DAILY_PLAN'; payload: { taskIds: string[] } }
  | { type: 'REMOVE_FROM_PLAN'; payload: { taskId: string } }
  | { type: 'SET_PLAN_START'; payload: { date: string; taskId: string; start: string } }
  // Routines
  | { type: 'ADD_ROUTINE'; payload: { routine: Routine } }
  | { type: 'DELETE_ROUTINE'; payload: { routineId: string } }
  // Focus time tracking
  | { type: 'LOG_FOCUS_TIME'; payload: { taskId: string; minutes: number } }
  // Reminders
  | { type: 'TOGGLE_REMINDERS' }
  | { type: 'SET_REMINDER_LEAD'; payload: { hours: number } };
