import { create } from 'zustand';

import { Habit, Project, Task, TaskStatus, Week } from '@/types';

interface WeeklyStore {
  // State
  currentWeek: Week | null;
  weeks: Week[];
  habits: Habit[];

  // Actions
  setCurrentWeek: (week: Week) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'createdWeekId' | 'currentWeekId' | 'actionHistory' | 'subtaskIds' | 'goalIds'>) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  addProject: (
    project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
  ) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt'>) => void;
  completeHabit: (habitId: string) => void;
}

export const useWeeklyStore = create<WeeklyStore>((set, get) => ({
  currentWeek: null,
  weeks: [],
  habits: [],

  setCurrentWeek: week => set({ currentWeek: week }),

  addTask: taskData => {
    const currentWeek = get().currentWeek;
    if (!currentWeek) return;

    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      createdWeekId: currentWeek.id,
      currentWeekId: currentWeek.id,
      actionHistory: [{
        id: crypto.randomUUID(),
        taskId: crypto.randomUUID(),
        type: 'CREATED',
        timestamp: new Date(),
        weekId: currentWeek.id,
      }],
      subtaskIds: [],
      goalIds: [],
    };

    // Update the task ID in the action history
    newTask.actionHistory[0].taskId = newTask.id;

    set(state => {
      if (!state.currentWeek) return state;

      const updatedWeek = {
        ...state.currentWeek,
        tasks: [...state.currentWeek.tasks, newTask],
      };

      return {
        ...state,
        currentWeek: updatedWeek,
        weeks: state.weeks.map(w =>
          w.id === updatedWeek.id ? updatedWeek : w
        ),
      };
    });
  },

  updateTask: (taskId, updates) => {
    set(state => {
      if (!state.currentWeek) return state;

      const updatedTasks = state.currentWeek.tasks.map(task => {
        if (task.id === taskId) {
          const updatedTask = { ...task, ...updates };
          // Add action to history if status changed
          if (updates.status && updates.status !== task.status) {
            const actionType = updates.status === TaskStatus.COMPLETED ? 'COMPLETED' : 
                             updates.status === TaskStatus.PENDING ? 'UNCOMPLETED' : 'MOVED_TO_WEEK';
            updatedTask.actionHistory = [
              ...task.actionHistory,
              {
                id: crypto.randomUUID(),
                taskId: task.id,
                type: actionType,
                timestamp: new Date(),
                weekId: state.currentWeek?.id,
                oldValue: task.status,
                newValue: updates.status,
              }
            ];
          }
          return updatedTask;
        }
        return task;
      });

      const updatedWeek = {
        ...state.currentWeek,
        tasks: updatedTasks,
      };

      return {
        ...state,
        currentWeek: updatedWeek,
        weeks: state.weeks.map(w =>
          w.id === updatedWeek.id ? updatedWeek : w
        ),
      };
    });
  },

  deleteTask: taskId => {
    set(state => {
      if (!state.currentWeek) return state;

      const updatedWeek = {
        ...state.currentWeek,
        tasks: state.currentWeek.tasks.filter(task => task.id !== taskId),
      };

      return {
        ...state,
        currentWeek: updatedWeek,
        weeks: state.weeks.map(w =>
          w.id === updatedWeek.id ? updatedWeek : w
        ),
      };
    });
  },

  addProject: projectData => {
    const newProject: Project = {
      ...projectData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set(state => {
      if (!state.currentWeek) return state;

      const updatedWeek = {
        ...state.currentWeek,
        projects: [...state.currentWeek.projects, newProject],
      };

      return {
        ...state,
        currentWeek: updatedWeek,
        weeks: state.weeks.map(w =>
          w.id === updatedWeek.id ? updatedWeek : w
        ),
      };
    });
  },

  updateProject: (projectId, updates) => {
    set(state => {
      if (!state.currentWeek) return state;

      const updatedProjects = state.currentWeek.projects.map(project =>
        project.id === projectId
          ? { ...project, ...updates, updatedAt: new Date() }
          : project
      );

      const updatedWeek = {
        ...state.currentWeek,
        projects: updatedProjects,
      };

      return {
        ...state,
        currentWeek: updatedWeek,
        weeks: state.weeks.map(w =>
          w.id === updatedWeek.id ? updatedWeek : w
        ),
      };
    });
  },

  addHabit: habitData => {
    const newHabit: Habit = {
      ...habitData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    set(state => ({
      ...state,
      habits: [...state.habits, newHabit],
    }));
  },

  completeHabit: habitId => {
    set(state => ({
      ...state,
      habits: state.habits.map(habit =>
        habit.id === habitId
          ? {
              ...habit,
              streak: habit.streak + 1,
              longestStreak: Math.max(habit.longestStreak, habit.streak + 1),
              completions: [
                ...habit.completions,
                {
                  id: crypto.randomUUID(),
                  habitId,
                  completedAt: new Date(),
                },
              ],
            }
          : habit
      ),
    }));
  },
}));
