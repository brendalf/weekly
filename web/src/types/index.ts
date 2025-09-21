export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  
  // Temporal data
  createdAt: Date;
  createdWeekId: string; // Format: "2025-37"
  completedAt?: Date;
  currentWeekId: string;
  
  // Recurrency relationship
  templateId?: string; // Links to RecurrenceTemplate
  templateInstanceId?: string; // Unique per template occurrence
  
  // Audit trail
  actionHistory: TaskAction[];
  
  // Hierarchical relationships (strict hierarchy)
  parentTaskId?: string;
  subtaskIds: string[];
  
  // Goals relationship
  goalIds: string[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  status: ProjectStatus;
  tasks: Task[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Week {
  id: string;
  startDate: Date;
  endDate: Date;
  status: WeekStatus;
  goals: string[];
  tasks: Task[];
  projects: Project[];
  stats: WeekStats;
  createdAt: Date;
  closedAt?: Date;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  frequency: HabitFrequency;
  targetCount: number; // how many times per frequency period
  streak: number;
  longestStreak: number;
  completions: HabitCompletion[];
  isActive: boolean;
  createdAt: Date;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  completedAt: Date;
  notes?: string;
}

export interface RoutineConfig {
  frequency: RoutineFrequency;
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  dayOfMonth?: number; // 1-31
  interval?: number; // every N days/weeks/months
}

export interface WeekStats {
  totalTasks: number;
  completedTasks: number;
  totalProjects: number;
  completedProjects: number;
  totalTimeSpent: number; // in minutes
  completionRate: number; // percentage
  streakCount: number;
}

// Enums
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  MOVED_TO_NEXT_WEEK = 'moved_to_next_week',
  MOVED_TO_BACKLOG = 'moved_to_backlog',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum ProjectStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold',
  CANCELLED = 'cancelled',
}

export enum WeekStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  CLOSED = 'closed',
}

export enum HabitFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum RoutineFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  ANNUALLY = 'annually',
}

// New interfaces for enhanced data structure
export interface RecurrenceTemplate {
  id: string;
  pattern: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';
  interval: number;
  startWeekId: string; // "2025-37"
  endWeekId?: string;
  daysOfWeek?: number[]; // For weekly patterns
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskAction {
  id: string;
  taskId: string;
  type: 'CREATED' | 'COMPLETED' | 'UNCOMPLETED' | 'MOVED_TO_WEEK' | 'MOVED_TO_BACKLOG' | 'TITLE_CHANGED' | 'TEMPLATE_UPDATED';
  timestamp: Date;
  weekId?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: {
    templateUpdateScope?: 'THIS_ONLY' | 'FUTURE_ONLY' | 'ALL';
    [key: string]: any;
  };
}

export interface Goal {
  id: string;
  title: string;
  year: number;
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  description?: string;
  targetDate?: Date;
}
