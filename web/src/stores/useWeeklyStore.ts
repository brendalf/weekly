import { create } from 'zustand';

import { Habit, Project, Task, TaskStatus, Week } from '@/types';
import { createWeek, getCurrentWeekId, getNextWeekId, getPreviousWeekId } from '@/utils/weekUtils';

interface WeeklyStore {
  // State
  currentWeek: Week | null;
  weeks: Map<string, Week>;
  habits: Habit[];

  // Actions
  setCurrentWeek: (week: Week) => void;
  navigateToWeek: (weekId: string) => void;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToCurrentWeek: () => void;
  getOrCreateWeek: (weekId: string) => Week;
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
  weeks: new Map(),
  habits: [],

  setCurrentWeek: week => {
    set(state => {
      const newWeeks = new Map(state.weeks);
      newWeeks.set(week.id, week);
      return { currentWeek: week, weeks: newWeeks };
    });
  },

  getOrCreateWeek: (weekId: string) => {
    const state = get();
    const existingWeek = state.weeks.get(weekId);
    if (existingWeek) {
      return existingWeek;
    }
    
    const newWeek = createWeek(weekId);
    set(state => {
      const newWeeks = new Map(state.weeks);
      newWeeks.set(weekId, newWeek);
      return { weeks: newWeeks };
    });
    return newWeek;
  },

  navigateToWeek: (weekId: string) => {
    const state = get();
    const week = state.getOrCreateWeek(weekId);
    set({ currentWeek: week });
  },

  goToPreviousWeek: () => {
    set(state => {
      if (!state.currentWeek) return state;
      
      const previousWeekId = getPreviousWeekId(state.currentWeek.id);
      let previousWeek = state.weeks.get(previousWeekId);
      
      if (!previousWeek) {
        previousWeek = createWeek(previousWeekId);
        const newWeeks = new Map(state.weeks);
        newWeeks.set(previousWeekId, previousWeek);
        return { ...state, currentWeek: previousWeek, weeks: newWeeks };
      }
      
      return { ...state, currentWeek: previousWeek };
    });
  },

  goToNextWeek: () => {
    set(state => {
      if (!state.currentWeek) return state;
      
      const nextWeekId = getNextWeekId(state.currentWeek.id);
      let nextWeek = state.weeks.get(nextWeekId);
      
      if (!nextWeek) {
        nextWeek = createWeek(nextWeekId);
        const newWeeks = new Map(state.weeks);
        newWeeks.set(nextWeekId, nextWeek);
        return { ...state, currentWeek: nextWeek, weeks: newWeeks };
      }
      
      return { ...state, currentWeek: nextWeek };
    });
  },

  goToCurrentWeek: () => {
    set(state => {
      const currentWeekId = getCurrentWeekId();
      let currentWeek = state.weeks.get(currentWeekId);
      
      if (!currentWeek) {
        currentWeek = createWeek(currentWeekId);
        const newWeeks = new Map(state.weeks);
        newWeeks.set(currentWeekId, currentWeek);
        return { ...state, currentWeek, weeks: newWeeks };
      }
      
      return { ...state, currentWeek };
    });
  },

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
        weeks: (() => {
          const newWeeks = new Map(state.weeks);
          newWeeks.set(updatedWeek.id, updatedWeek);
          return newWeeks;
        })(),
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
        weeks: (() => {
          const newWeeks = new Map(state.weeks);
          newWeeks.set(updatedWeek.id, updatedWeek);
          return newWeeks;
        })(),
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
        weeks: (() => {
          const newWeeks = new Map(state.weeks);
          newWeeks.set(updatedWeek.id, updatedWeek);
          return newWeeks;
        })(),
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
        weeks: (() => {
          const newWeeks = new Map(state.weeks);
          newWeeks.set(updatedWeek.id, updatedWeek);
          return newWeeks;
        })(),
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
        weeks: (() => {
          const newWeeks = new Map(state.weeks);
          newWeeks.set(updatedWeek.id, updatedWeek);
          return newWeeks;
        })(),
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
