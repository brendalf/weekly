import { endOfWeek, getWeek, startOfWeek, subDays } from 'date-fns';

import {
  Habit,
  HabitFrequency,
  Project,
  ProjectStatus,
  Task,
  TaskStatus,
  Week,
  WeekStatus,
} from '@/types';

const now = new Date();
const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday

const currentWeek = getWeek(now);

export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Review quarterly goals',
    status: TaskStatus.COMPLETED,
    weekId: 'current-week',
    createdAt: subDays(now, 3),
    updatedAt: subDays(now, 1),
    completedAt: subDays(now, 1),
    weekStreak: 3,
  },
  {
    id: '2',
    title: 'Implement user authentication',
    description: 'Add login/signup functionality with JWT tokens',
    status: TaskStatus.IN_PROGRESS,
    weekId: 'current-week',
    createdAt: subDays(now, 14), // 2 weeks ago
    updatedAt: now,
    createdWeek: currentWeek - 2,
    weeksOpen: 2,
  },
  {
    id: '3',
    title: 'Morning workout',
    status: TaskStatus.COMPLETED,
    weekId: 'current-week',
    createdAt: weekStart,
    updatedAt: now,
    completedAt: now,
    weekStreak: 5,
  },
  {
    id: '4',
    title: 'Design system documentation',
    description: 'Document component library and usage guidelines',
    status: TaskStatus.PENDING,
    weekId: 'current-week',
    createdAt: subDays(now, 28), // 4 weeks ago
    updatedAt: subDays(now, 28),
    createdWeek: currentWeek - 4,
    weeksOpen: 4,
  },
  {
    id: '5',
    title: 'Client meeting preparation',
    status: TaskStatus.PENDING,
    weekId: 'current-week',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: '6',
    title: 'Old task from 8 weeks ago',
    status: TaskStatus.PENDING,
    weekId: 'current-week',
    createdAt: subDays(now, 56), // 8 weeks ago
    updatedAt: subDays(now, 56),
    createdWeek: currentWeek - 8,
    weeksOpen: 8,
  },
  {
    id: '7',
    title: 'Very old task',
    status: TaskStatus.PENDING,
    weekId: 'current-week',
    createdAt: subDays(now, 84), // 12 weeks ago
    updatedAt: subDays(now, 84),
    createdWeek: currentWeek - 12,
    weeksOpen: 12,
  },
];

export const mockProjects: Project[] = [
  {
    id: 'project-1',
    name: 'Weekly Task Manager',
    description:
      'Build a comprehensive task management app with WASM integration',
    color: '#3b82f6',
    status: ProjectStatus.ACTIVE,
    tasks: [],
    createdAt: subDays(now, 14),
    updatedAt: now,
  },
  {
    id: 'project-2',
    name: 'Personal Website Redesign',
    description: 'Modernize portfolio website with new tech stack',
    color: '#10b981',
    status: ProjectStatus.ON_HOLD,
    tasks: [],
    createdAt: subDays(now, 30),
    updatedAt: subDays(now, 7),
  },
];

export const mockHabits: Habit[] = [
  {
    id: 'habit-1',
    name: 'Daily Exercise',
    description: 'At least 30 minutes of physical activity',
    frequency: HabitFrequency.DAILY,
    targetCount: 1,
    streak: 12,
    longestStreak: 28,
    completions: [
      {
        id: 'completion-1',
        habitId: 'habit-1',
        completedAt: now,
        notes: 'Morning run + strength training',
      },
    ],
    isActive: true,
    createdAt: subDays(now, 30),
  },
  {
    id: 'habit-2',
    name: 'Read Technical Articles',
    description: 'Stay updated with latest tech trends',
    frequency: HabitFrequency.DAILY,
    targetCount: 1,
    streak: 5,
    longestStreak: 15,
    completions: [],
    isActive: true,
    createdAt: subDays(now, 20),
  },
  {
    id: 'habit-3',
    name: 'Weekly Planning',
    description: 'Review and plan upcoming week',
    frequency: HabitFrequency.WEEKLY,
    targetCount: 1,
    streak: 8,
    longestStreak: 12,
    completions: [],
    isActive: true,
    createdAt: subDays(now, 60),
  },
];

export const mockCurrentWeek: Week = {
  id: 'current-week',
  startDate: weekStart,
  endDate: weekEnd,
  status: WeekStatus.ACTIVE,
  goals: [
    'Complete authentication implementation',
    'Maintain daily exercise routine',
    'Prepare for client presentation',
  ],
  tasks: mockTasks,
  projects: mockProjects,
  stats: {
    totalTasks: mockTasks.length,
    completedTasks: mockTasks.filter(t => t.status === TaskStatus.COMPLETED)
      .length,
    totalProjects: mockProjects.length,
    completedProjects: mockProjects.filter(
      p => p.status === ProjectStatus.COMPLETED
    ).length,
    totalTimeSpent: 0, // Simplified - no time tracking
    completionRate: Math.round(
      (mockTasks.filter(t => t.status === TaskStatus.COMPLETED).length /
        mockTasks.length) *
        100
    ),
    streakCount: 3,
  },
  createdAt: weekStart,
};
