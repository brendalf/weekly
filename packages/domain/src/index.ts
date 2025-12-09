export type HabitId = string;

export interface Habit {
  id: HabitId;
  name: string;
  weeklyTarget: number;
}

export function computeCompletionRate(
  completed: number,
  target: number
): number {
  if (target <= 0) return 0;
  return Math.min(1, completed / target);
}