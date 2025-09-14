import { Checkbox, Chip, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { MoreVertical, Flame } from 'lucide-react';
import { Task, TaskStatus } from '@/types';
import { useWeeklyStore } from '@/stores/useWeeklyStore';

interface TaskListProps {
  tasks: Task[];
}

export function TaskList({ tasks }: TaskListProps) {
  const { updateTask } = useWeeklyStore();

  const getWeekLabelColor = (weeksOpen: number) => {
    if (weeksOpen <= 2) return 'warning'; // yellow
    if (weeksOpen <= 5) return 'danger'; // orange
    if (weeksOpen <= 10) return 'danger'; // red
    return 'danger'; // dark red for 10+
  };

  const getWeekLabelIntensity = (weeksOpen: number) => {
    if (weeksOpen <= 2) return 'flat';
    if (weeksOpen <= 5) return 'solid';
    if (weeksOpen <= 10) return 'solid';
    return 'solid'; // most intense for 10+
  };

  const handleTaskToggle = (task: Task) => {
    const newStatus = task.status === TaskStatus.COMPLETED 
      ? TaskStatus.PENDING 
      : TaskStatus.COMPLETED;
    
    updateTask(task.id, { 
      status: newStatus,
      completedAt: newStatus === TaskStatus.COMPLETED ? new Date() : undefined
    });
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    // Sort by status (incomplete first), then by creation date
    if (a.status === TaskStatus.COMPLETED && b.status !== TaskStatus.COMPLETED) return 1;
    if (a.status !== TaskStatus.COMPLETED && b.status === TaskStatus.COMPLETED) return -1;
    
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-default-500">
        <p>No tasks for this week yet.</p>
        <p className="text-sm mt-2">Click "Add Task" to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedTasks.map((task) => (
        <div
          key={task.id}
          className={`p-3 border rounded-lg transition-all ${
            task.status === TaskStatus.COMPLETED 
              ? 'bg-default-50 border-default-200' 
              : 'bg-background border-default-300 hover:border-default-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <Checkbox
              isSelected={task.status === TaskStatus.COMPLETED}
              onValueChange={() => handleTaskToggle(task)}
            />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <h4 className={`font-medium ${
                    task.status === TaskStatus.COMPLETED 
                      ? 'line-through text-default-500' 
                      : 'text-foreground'
                  }`}>
                    {task.title}
                  </h4>
                  
                  {/* Week label for old tasks */}
                  {task.createdWeek && task.weeksOpen && task.weeksOpen > 0 && (
                    <Chip
                      size="sm"
                      color={getWeekLabelColor(task.weeksOpen)}
                      variant={getWeekLabelIntensity(task.weeksOpen) as any}
                      className="text-xs"
                    >
                      Week {task.createdWeek}
                    </Chip>
                  )}
                  
                  {/* Streak fire icon for completed tasks */}
                  {task.weekStreak && task.weekStreak > 1 && task.status === TaskStatus.COMPLETED && (
                    <Chip
                      size="sm"
                      color="warning"
                      variant="flat"
                      startContent={<Flame className="w-3 h-3" />}
                      className="text-xs"
                    >
                      {task.weekStreak}
                    </Chip>
                  )}
                </div>
                
                <Dropdown>
                  <DropdownTrigger>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu>
                    <DropdownItem key="edit">Edit</DropdownItem>
                    <DropdownItem key="duplicate">Duplicate</DropdownItem>
                    <DropdownItem key="move">Move to Next Week</DropdownItem>
                    <DropdownItem key="delete" className="text-danger" color="danger">
                      Delete
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
