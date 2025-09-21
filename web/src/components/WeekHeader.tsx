import { Button, Card, CardBody, Chip } from '@heroui/react';
import { format } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

import { useWeeklyStore } from '@/stores/useWeeklyStore';
import { Week, WeekStatus } from '@/types';
import { isCurrentWeek } from '@/utils/weekUtils';

interface WeekHeaderProps {
  week: Week;
}

export function WeekHeader({ week }: WeekHeaderProps) {
  const { goToPreviousWeek, goToNextWeek, goToCurrentWeek } = useWeeklyStore();
  const getStatusColor = (status: WeekStatus) => {
    switch (status) {
      case WeekStatus.PLANNING:
        return 'warning';
      case WeekStatus.ACTIVE:
        return 'success';
      case WeekStatus.CLOSED:
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Card className="mb-8">
      <CardBody>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              isIconOnly 
              variant="light" 
              size="sm"
              onPress={goToPreviousWeek}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-primary-500" />
              <div>
                <h1 className="text-2xl font-bold">
                  {format(week.startDate, 'MMM d')} -{' '}
                  {format(week.endDate, 'MMM d, yyyy')}
                </h1>
                <p className="text-sm text-default-500">
                  Week {format(week.startDate, 'w')} of{' '}
                  {format(week.startDate, 'yyyy')}
                </p>
              </div>
            </div>

            <Button 
              isIconOnly 
              variant="light" 
              size="sm"
              onPress={goToNextWeek}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Chip color={getStatusColor(week.status)} variant="flat" size="sm">
              {week.status.replace('_', ' ').toUpperCase()}
            </Chip>

            {!isCurrentWeek(week.id) && (
              <Button
                variant="bordered"
                size="sm"
                onPress={goToCurrentWeek}
              >
                Today
              </Button>
            )}

            <Button
              color="primary"
              startContent={<Plus className="w-4 h-4" />}
              size="sm"
            >
              Add Task
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
