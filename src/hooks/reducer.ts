import type { AppState, AppAction } from '../types';

// ─── Initial State ────────────────────────────────────────────────────────

export const initialState: AppState = {
  goals: [],
  activeGoalId: null,
  activeView: 'goal',
  inbox: [],
  templates: [],
  reflections: [],
};

// ─── Reducer ──────────────────────────────────────────────────────────────
// All mutations live here. Components only dispatch typed actions —
// they never mutate state directly. This makes the data flow easy to trace.

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {

    // ── Goals ──────────────────────────────────────────────────────────

    case 'ADD_GOAL': {
      const goals = [...state.goals, action.payload];
      return { ...state, goals, activeGoalId: action.payload.id };
    }

    case 'UPDATE_GOAL': {
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.payload.id
            ? { ...g, ...action.payload.updates }
            : g
        ),
      };
    }

    case 'DELETE_GOAL': {
      const goals = state.goals.filter((g) => g.id !== action.payload.id);
      const activeGoalId =
        state.activeGoalId === action.payload.id
          ? (goals[0]?.id ?? null)
          : state.activeGoalId;
      return { ...state, goals, activeGoalId };
    }

    case 'SET_ACTIVE_GOAL': {
      return { ...state, activeGoalId: action.payload.id };
    }

    // ── Tasks ──────────────────────────────────────────────────────────

    case 'ADD_TASK': {
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.payload.goalId
            ? { ...g, tasks: [...g.tasks, action.payload.task] }
            : g
        ),
      };
    }

    case 'UPDATE_TASK': {
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.payload.goalId
            ? {
                ...g,
                tasks: g.tasks.map((t) =>
                  t.id === action.payload.taskId
                    ? { ...t, ...action.payload.updates }
                    : t
                ),
              }
            : g
        ),
      };
    }

    case 'DELETE_TASK': {
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.payload.goalId
            ? { ...g, tasks: g.tasks.filter((t) => t.id !== action.payload.taskId) }
            : g
        ),
      };
    }

    case 'TOGGLE_TASK': {
      return {
        ...state,
        goals: state.goals.map((g) => {
          if (g.id !== action.payload.goalId) return g;
          
          let newTasks = [...g.tasks];
          const taskIndex = newTasks.findIndex(t => t.id === action.payload.taskId);
          if (taskIndex === -1) return g;

          const t = newTasks[taskIndex];
          const isCompleting = !t.completed;
          const now = new Date().toISOString();

          // Handle recurrence
          if (isCompleting && t.recurrence) {
            const nextDue = new Date();
            if (t.recurrence === 'daily') nextDue.setDate(nextDue.getDate() + 1);
            if (t.recurrence === 'weekly') nextDue.setDate(nextDue.getDate() + 7);
            if (t.recurrence === 'monthly') nextDue.setMonth(nextDue.getMonth() + 1);
            
            const clonedTask = {
              ...t,
              id: Math.random().toString(36).substr(2, 9),
              completed: false,
              completedAt: null,
              createdAt: now,
              dueDate: nextDue.toISOString().split('T')[0],
              subtasks: t.subtasks.map(st => ({ ...st, id: Math.random().toString(36).substr(2, 9), completed: false }))
            };
            newTasks.push(clonedTask);
          }

          newTasks[taskIndex] = {
            ...t,
            completed: isCompleting,
            completedAt: isCompleting ? now : null,
          };

          return { ...g, tasks: newTasks };
        }),
      };
    }

    case 'REORDER_TASKS': {
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.payload.goalId
            ? { ...g, tasks: action.payload.tasks }
            : g
        ),
      };
    }

    // ── Subtasks ───────────────────────────────────────────────────────

    case 'ADD_SUBTASK': {
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.payload.goalId
            ? {
                ...g,
                tasks: g.tasks.map((t) =>
                  t.id === action.payload.taskId
                    ? { ...t, subtasks: [...t.subtasks, action.payload.subtask] }
                    : t
                ),
              }
            : g
        ),
      };
    }

    case 'TOGGLE_SUBTASK': {
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.payload.goalId
            ? {
                ...g,
                tasks: g.tasks.map((t) =>
                  t.id === action.payload.taskId
                    ? {
                        ...t,
                        subtasks: t.subtasks.map((s) =>
                          s.id === action.payload.subtaskId
                            ? { ...s, completed: !s.completed }
                            : s
                        ),
                      }
                    : t
                ),
              }
            : g
        ),
      };
    }

    case 'DELETE_SUBTASK': {
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.payload.goalId
            ? {
                ...g,
                tasks: g.tasks.map((t) =>
                  t.id === action.payload.taskId
                    ? {
                        ...t,
                        subtasks: t.subtasks.filter(
                          (s) => s.id !== action.payload.subtaskId
                        ),
                      }
                    : t
                ),
              }
            : g
        ),
      };
    }

    // ── Notes & Milestones ─────────────────────────────────────────────

    case 'UPDATE_NOTES': {
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.payload.goalId
            ? { ...g, notes: action.payload.notes }
            : g
        ),
      };
    }

    case 'ADD_MILESTONE': {
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.payload.goalId
            ? { ...g, milestones: [...g.milestones, action.payload.milestone] }
            : g
        ),
      };
    }

    case 'DELETE_MILESTONE': {
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.payload.goalId
            ? {
                ...g,
                milestones: g.milestones.filter(
                  (m) => m.id !== action.payload.milestoneId
                ),
              }
            : g
        ),
      };
    }

    // ── Navigation ─────────────────────────────────────────────────────

    case 'SET_ACTIVE_VIEW': {
      return { ...state, activeView: action.payload.view };
    }

    // ── Inbox ──────────────────────────────────────────────────────────

    case 'ADD_TO_INBOX': {
      return { ...state, inbox: [...state.inbox, action.payload.task] };
    }

    case 'DELETE_FROM_INBOX': {
      return { ...state, inbox: state.inbox.filter((t) => t.id !== action.payload.taskId) };
    }

    case 'MOVE_FROM_INBOX': {
      const taskIndex = state.inbox.findIndex((t) => t.id === action.payload.taskId);
      if (taskIndex === -1) return state;
      const task = state.inbox[taskIndex];
      const newInbox = [...state.inbox];
      newInbox.splice(taskIndex, 1);
      return {
        ...state,
        inbox: newInbox,
        goals: state.goals.map((g) =>
          g.id === action.payload.goalId ? { ...g, tasks: [...g.tasks, task] } : g
        ),
      };
    }

    case 'UPDATE_INBOX_TASK': {
      return {
        ...state,
        inbox: state.inbox.map((t) =>
          t.id === action.payload.taskId ? { ...t, ...action.payload.updates } : t
        ),
      };
    }

    // ── Templates ──────────────────────────────────────────────────────

    case 'SAVE_TEMPLATE': {
      return { ...state, templates: [...state.templates, action.payload.template] };
    }

    case 'DELETE_TEMPLATE': {
      return { ...state, templates: state.templates.filter((t) => t.id !== action.payload.templateId) };
    }

    // ── Reflections ────────────────────────────────────────────────────

    case 'SAVE_REFLECTION': {
      return { ...state, reflections: [...state.reflections, action.payload.reflection] };
    }

    // ── State Hydration ────────────────────────────────────────────────

    case 'LOAD_STATE': {
      return { ...initialState, ...action.payload };
    }

    default:
      return state;
  }
}