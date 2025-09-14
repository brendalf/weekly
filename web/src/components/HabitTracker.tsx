import { Button, Chip, Progress } from '@heroui/react';
import { CheckCircle, Circle, Flame } from 'lucide-react';

import { Habit, HabitFrequency } from '@/types';

interface HabitTrackerProps {
  habits: Habit[];
}

export function HabitTracker({ habits }: HabitTrackerProps) {
  const getFrequencyColor = (frequency: HabitFrequency) => {
    switch (frequency) {
      case HabitFrequency.DAILY:
        return 'primary';
      case HabitFrequency.WEEKLY:
        return 'success';
      case HabitFrequency.MONTHLY:
        return 'warning';
      default:
        return 'default';
    }
  };

  const getTodayProgress = (habit: Habit) => {
    // Mock calculation - in real app this would check today's completions
    const today = new Date();
    const todayCompletions = habit.completions.filter(
      completion =>
        completion.completedAt.toDateString() === today.toDateString()
    ).length;

    return Math.min((todayCompletions / habit.targetCount) * 100, 100);
  };

  const isCompletedToday = (habit: Habit) => {
    return getTodayProgress(habit) >= 100;
  };

  if (habits.length === 0) {
    return (
      <div className="text-center py-4 text-default-500">
        <p className="text-sm">No habits tracked yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {habits.map(habit => (
        <div key={habit.id} className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                isIconOnly
                size="sm"
                color={isCompletedToday(habit) ? 'success' : 'default'}
                variant={isCompletedToday(habit) ? 'solid' : 'bordered'}
              >
                {isCompletedToday(habit) ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </Button>

              <div className="flex-1">
                <h4 className="font-medium text-sm">{habit.name}</h4>
                {habit.description && (
                  <p className="text-xs text-default-500 mt-1">
                    {habit.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500" />
                <span className="text-xs font-medium">{habit.streak}</span>
              </div>

              <Chip
                size="sm"
                color={getFrequencyColor(habit.frequency)}
                variant="flat"
              >
                {habit.frequency}
              </Chip>
            </div>
          </div>

          <div className="ml-11">
            <div className="flex justify-between text-xs text-default-500 mb-1">
              <span>Today's Progress</span>
              <span>{Math.round(getTodayProgress(habit))}%</span>
            </div>
            <Progress
              value={getTodayProgress(habit)}
              color={isCompletedToday(habit) ? 'success' : 'primary'}
              size="sm"
              className="max-w-full"
            />
          </div>

          <div className="ml-11 flex justify-between text-xs text-default-500">
            <span>Current streak: {habit.streak} days</span>
            <span>Best: {habit.longestStreak} days</span>
          </div>
        </div>
      ))}
    </div>
  );
}
