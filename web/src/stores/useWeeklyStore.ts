import { create } from 'zustand';
import { Task, Week, Project, Habit, TaskStatus, WeekStatus, ProjectStatus } from '@/types';

interface WeeklyStore {
  // State
  currentWeek: Week | null;
  weeks: Week[];
  habits: Habit[];
  
  // Actions
  setCurrentWeek: (week: Week) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt'>) => void;
  completeHabit: (habitId: string) => void;
}

export const useWeeklyStore = create<WeeklyStore>((set, get) => ({
  currentWeek: null,
  weeks: [],
  habits: [],

  setCurrentWeek: (week) => set({ currentWeek: week }),

  addTask: (taskData) => {
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((state) => {
      if (!state.currentWeek) return state;
      
      const updatedWeek = {
        ...state.currentWeek,
        tasks: [...state.currentWeek.tasks, newTask],
      };

      return {
        ...state,
        currentWeek: updatedWeek,
        weeks: state.weeks.map(w => w.id === updatedWeek.id ? updatedWeek : w),
      };
    });
  },

  updateTask: (taskId, updates) => {
    set((state) => {
      if (!state.currentWeek) return state;

      const updatedTasks = state.currentWeek.tasks.map(task =>
        task.id === taskId 
          ? { ...task, ...updates, updatedAt: new Date() }
          : task
      );

      const updatedWeek = {
        ...state.currentWeek,
        tasks: updatedTasks,
      };

      return {
        ...state,
        currentWeek: updatedWeek,
        weeks: state.weeks.map(w => w.id === updatedWeek.id ? updatedWeek : w),
      };
    });
  },

  deleteTask: (taskId) => {
    set((state) => {
      if (!state.currentWeek) return state;

      const updatedWeek = {
        ...state.currentWeek,
        tasks: state.currentWeek.tasks.filter(task => task.id !== taskId),
      };

      return {
        ...state,
        currentWeek: updatedWeek,
        weeks: state.weeks.map(w => w.id === updatedWeek.id ? updatedWeek : w),
      };
    });
  },

  addProject: (projectData) => {
    const newProject: Project = {
      ...projectData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((state) => {
      if (!state.currentWeek) return state;
      
      const updatedWeek = {
        ...state.currentWeek,
        projects: [...state.currentWeek.projects, newProject],
      };

      return {
        ...state,
        currentWeek: updatedWeek,
        weeks: state.weeks.map(w => w.id === updatedWeek.id ? updatedWeek : w),
      };
    });
  },

  updateProject: (projectId, updates) => {
    set((state) => {
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
        weeks: state.weeks.map(w => w.id === updatedWeek.id ? updatedWeek : w),
      };
    });
  },

  addHabit: (habitData) => {
    const newHabit: Habit = {
      ...habitData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    set((state) => ({
      ...state,
      habits: [...state.habits, newHabit],
    }));
  },

  completeHabit: (habitId) => {
    set((state) => ({
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
                }
              ]
            }
          : habit
      ),
    }));
  },
}));
