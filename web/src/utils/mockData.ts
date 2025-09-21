import {
  Task,
  TaskStatus,
  RecurrenceTemplate,
  Goal,
  Week,
  WeekStatus,
} from '@/types';

// Sample tasks using the new Task interface
export const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Biceps',
    status: TaskStatus.PENDING,
    createdAt: new Date('2025-09-09T22:00:00.000Z'),
    createdWeekId: '2025-38',
    currentWeekId: '2025-38',
    templateId: 'template-biceps',
    templateInstanceId: 'biceps-2025-38',
    actionHistory: [
      {
        id: 'action-1-1',
        taskId: 'task-1',
        type: 'CREATED',
        timestamp: new Date('2025-09-09T22:00:00.000Z'),
        weekId: '2025-38',
        metadata: {},
      }
    ],
    subtaskIds: [],
    goalIds: ['goal-1'],
  },
  {
    id: 'task-2',
    title: 'Run',
    status: TaskStatus.PENDING,
    createdAt: new Date('2025-09-09T22:00:00.000Z'),
    createdWeekId: '2025-38',
    currentWeekId: '2025-38',
    templateId: 'template-run',
    templateInstanceId: 'run-2025-38',
    actionHistory: [
      {
        id: 'action-2-1',
        taskId: 'task-2',
        type: 'CREATED',
        timestamp: new Date('2025-09-09T22:00:00.000Z'),
        weekId: '2025-38',
        metadata: {},
      }
    ],
    subtaskIds: [],
    goalIds: ['goal-1'],
  },
  {
    id: 'task-3',
    title: 'Review quarterly goals',
    description: 'Assess progress on Q4 objectives and plan for Q1',
    status: TaskStatus.COMPLETED,
    createdAt: new Date('2025-09-07T10:00:00.000Z'),
    createdWeekId: '2025-36',
    currentWeekId: '2025-37',
    completedAt: new Date('2025-09-08T15:30:00.000Z'),
    actionHistory: [
      {
        id: 'action-3-1',
        taskId: 'task-3',
        type: 'CREATED',
        timestamp: new Date('2025-09-07T10:00:00.000Z'),
        weekId: '2025-36',
        metadata: {},
      },
      {
        id: 'action-3-2',
        taskId: 'task-3',
        type: 'COMPLETED',
        timestamp: new Date('2025-09-08T15:30:00.000Z'),
        weekId: '2025-38',
        metadata: {},
      }
    ],
    subtaskIds: [],
    goalIds: ['goal-2'],
  },
  {
    id: 'task-4',
    title: 'Complete project documentation',
    description: 'Finalize API documentation and user guides',
    status: TaskStatus.PENDING,
    createdAt: new Date('2025-08-25T09:00:00.000Z'),
    createdWeekId: '2025-34',
    currentWeekId: '2025-37',
    actionHistory: [
      {
        id: 'action-4-1',
        taskId: 'task-4',
        type: 'CREATED',
        timestamp: new Date('2025-08-25T09:00:00.000Z'),
        weekId: '2025-34',
        metadata: {},
      }
    ],
    subtaskIds: ['task-5', 'task-6'],
    goalIds: ['goal-3'],
  },
  {
    id: 'task-5',
    title: 'Write API documentation',
    status: TaskStatus.COMPLETED,
    createdAt: new Date('2025-08-25T09:15:00.000Z'),
    createdWeekId: '2025-34',
    currentWeekId: '2025-37',
    completedAt: new Date('2025-09-01T14:00:00.000Z'),
    parentTaskId: 'task-4',
    actionHistory: [
      {
        id: 'action-5-1',
        taskId: 'task-5',
        type: 'CREATED',
        timestamp: new Date('2025-08-25T09:15:00.000Z'),
        weekId: '2025-34',
        metadata: {},
      },
      {
        id: 'action-5-2',
        taskId: 'task-5',
        type: 'COMPLETED',
        timestamp: new Date('2025-09-01T14:00:00.000Z'),
        weekId: '2025-35',
        metadata: {},
      }
    ],
    subtaskIds: [],
    goalIds: ['goal-3'],
  },
  {
    id: 'task-6',
    title: 'Create user guides',
    status: TaskStatus.PENDING,
    createdAt: new Date('2025-08-25T09:30:00.000Z'),
    createdWeekId: '2025-34',
    currentWeekId: '2025-37',
    parentTaskId: 'task-4',
    actionHistory: [
      {
        id: 'action-6-1',
        taskId: 'task-6',
        type: 'CREATED',
        timestamp: new Date('2025-08-25T09:30:00.000Z'),
        weekId: '2025-34',
        metadata: {},
      }
    ],
    subtaskIds: [],
    goalIds: ['goal-3'],
  },
];

// Create some sample recurrence templates
export const mockRecurrenceTemplates: RecurrenceTemplate[] = [
  {
    id: 'template-biceps',
    pattern: 'WEEKLY',
    interval: 1,
    startWeekId: '2025-38',
    daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
    isActive: true,
    createdAt: new Date('2025-09-09T22:00:00.000Z'),
    updatedAt: new Date('2025-09-09T22:00:00.000Z'),
  },
  {
    id: 'template-run',
    pattern: 'WEEKLY',
    interval: 1,
    startWeekId: '2025-38',
    daysOfWeek: [2, 4, 6], // Tuesday, Thursday, Saturday
    isActive: true,
    createdAt: new Date('2025-09-09T22:00:00.000Z'),
    updatedAt: new Date('2025-09-09T22:00:00.000Z'),
  },
];

// Create sample goals
export const mockGoals: Goal[] = [
  {
    id: 'goal-1',
    title: 'Achieve 16.5% body fat',
    year: 2025,
    completed: false,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    description: 'Reach target body fat percentage through consistent exercise and nutrition',
    targetDate: new Date('2025-12-31T23:59:59.000Z'),
  },
  {
    id: 'goal-2',
    title: 'Be a great father',
    year: 2025,
    completed: false,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    description: 'Focus on quality time and positive parenting',
  },
  {
    id: 'goal-3',
    title: 'Deliver Hartingstraat',
    year: 2025,
    completed: false,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    description: 'Successfully complete the Hartingstraat project',
  },
];

// Create current week data
const currentWeekStart = new Date(2025, 8, 15); // Week 38 start
const currentWeekEnd = new Date(2025, 8, 21); // Week 38 end

export const mockCurrentWeek: Week = {
  id: '2025-38',
  startDate: currentWeekStart,
  endDate: currentWeekEnd,
  status: WeekStatus.ACTIVE,
  goals: mockGoals.map(g => g.title),
  tasks: mockTasks,
  projects: [], // No projects for now
  stats: {
    totalTasks: mockTasks.length,
    completedTasks: mockTasks.filter((t) => t.status === TaskStatus.COMPLETED).length,
    totalProjects: 0,
    completedProjects: 0,
    totalTimeSpent: 0,
    completionRate: Math.round((mockTasks.filter((t) => t.status === TaskStatus.COMPLETED).length / mockTasks.length) * 100),
    streakCount: 0,
  },
  createdAt: currentWeekStart,
};

// Export all mock data
export {
  mockTasks as tasks,
  mockRecurrenceTemplates as recurrenceTemplates,
  mockGoals as goals,
  mockCurrentWeek as currentWeek,
};
