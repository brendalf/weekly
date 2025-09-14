import { useEffect } from 'react';
import { Card, CardBody, CardHeader, Divider, Chip } from '@heroui/react';
import { Calendar, Target, TrendingUp, Clock } from 'lucide-react';
import { useWeeklyStore } from '@/stores/useWeeklyStore';
import { mockCurrentWeek, mockHabits } from '@/utils/mockData';
import { TaskList } from './TaskList';
import { HabitTracker } from './HabitTracker';
import { WeekHeader } from './WeekHeader';

export function WeeklyDashboard() {
  const { currentWeek, habits, setCurrentWeek } = useWeeklyStore();

  useEffect(() => {
    // Initialize with mock data
    setCurrentWeek(mockCurrentWeek);
    // Note: We'll add habits to store later
  }, [setCurrentWeek]);

  if (!currentWeek) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <WeekHeader week={currentWeek} />
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardBody className="flex flex-row items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Target className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-default-500">Tasks</p>
              <p className="text-2xl font-bold">
                {currentWeek.stats.completedTasks}/{currentWeek.stats.totalTasks}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-3">
            <div className="p-2 bg-success-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-success-600" />
            </div>
            <div>
              <p className="text-sm text-default-500">Completion Rate</p>
              <p className="text-2xl font-bold">{currentWeek.stats.completionRate}%</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-3">
            <div className="p-2 bg-warning-100 rounded-lg">
              <Clock className="w-6 h-6 text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-default-500">Time Spent</p>
              <p className="text-2xl font-bold">
                {Math.round(currentWeek.stats.totalTimeSpent / 60)}h
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-3">
            <div className="p-2 bg-secondary-100 rounded-lg">
              <Calendar className="w-6 h-6 text-secondary-600" />
            </div>
            <div>
              <p className="text-sm text-default-500">Streak</p>
              <p className="text-2xl font-bold">{currentWeek.stats.streakCount}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tasks Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center w-full">
                <h3 className="text-xl font-semibold">This Week's Tasks</h3>
                <Chip color="primary" variant="flat">
                  {currentWeek.tasks.length} tasks
                </Chip>
              </div>
            </CardHeader>
            <Divider />
            <CardBody>
              <TaskList tasks={currentWeek.tasks} />
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Habits */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Habits</h3>
            </CardHeader>
            <Divider />
            <CardBody>
              <HabitTracker habits={mockHabits} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
