import { addWeeks, format, startOfWeek, endOfWeek } from 'date-fns';

import { Week, WeekStatus } from '@/types';

/**
 * Generate a week ID in format YYYY-WW
 */
export function generateWeekId(date: Date): string {
  const year = date.getFullYear();
  const weekNumber = parseInt(format(date, 'w'));
  return `${year}-${weekNumber.toString().padStart(2, '0')}`;
}

/**
 * Parse a week ID to get the year and week number
 */
export function parseWeekId(weekId: string): { year: number; week: number } {
  const [year, week] = weekId.split('-').map(Number);
  return { year, week };
}

/**
 * Get the start and end dates for a given week ID
 */
export function getWeekDates(weekId: string): { startDate: Date; endDate: Date } {
  const { year, week } = parseWeekId(weekId);
  
  // Create a date in the target year and find the week
  const yearStart = new Date(year, 0, 1);
  const targetDate = addWeeks(yearStart, week - 1);
  
  const startDate = startOfWeek(targetDate, { weekStartsOn: 1 }); // Monday
  const endDate = endOfWeek(targetDate, { weekStartsOn: 1 }); // Sunday
  
  return { startDate, endDate };
}

/**
 * Create a new Week object for a given week ID
 */
export function createWeek(weekId: string, status: WeekStatus = WeekStatus.PLANNING): Week {
  const { startDate, endDate } = getWeekDates(weekId);
  
  return {
    id: weekId,
    startDate,
    endDate,
    status,
    goals: [],
    tasks: [],
    projects: [],
    stats: {
      totalTasks: 0,
      completedTasks: 0,
      totalProjects: 0,
      completedProjects: 0,
      totalTimeSpent: 0,
      completionRate: 0,
      streakCount: 0,
    },
    createdAt: new Date(),
  };
}

/**
 * Get the previous week ID
 */
export function getPreviousWeekId(weekId: string): string {
  const { startDate } = getWeekDates(weekId);
  const previousWeek = addWeeks(startDate, -1);
  return generateWeekId(previousWeek);
}

/**
 * Get the next week ID
 */
export function getNextWeekId(weekId: string): string {
  const { startDate } = getWeekDates(weekId);
  const nextWeek = addWeeks(startDate, 1);
  return generateWeekId(nextWeek);
}

/**
 * Get the current week ID
 */
export function getCurrentWeekId(): string {
  return generateWeekId(new Date());
}

/**
 * Check if a week ID represents the current week
 */
export function isCurrentWeek(weekId: string): boolean {
  return weekId === getCurrentWeekId();
}

/**
 * Get a range of week IDs around a target week
 */
export function getWeekRange(centerWeekId: string, range: number = 5): string[] {
  const weeks: string[] = [];
  let currentWeekId = centerWeekId;
  
  // Go back to get previous weeks
  for (let i = 0; i < range; i++) {
    currentWeekId = getPreviousWeekId(currentWeekId);
  }
  
  // Add weeks in range
  for (let i = 0; i < range * 2 + 1; i++) {
    weeks.push(currentWeekId);
    currentWeekId = getNextWeekId(currentWeekId);
  }
  
  return weeks;
}
