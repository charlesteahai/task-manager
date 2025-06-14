"use client";

import { useCallback } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Task, Subtask, BoardMember, Board, BoardStatus } from "@/types";
import { format } from "date-fns";
import { 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Pencil, 
  Trash,
  MoreHorizontal
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { getFirebaseServices } from "@/lib/firebase";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";

const { db } = getFirebaseServices();

interface TrelloBoardViewProps {
  boardId: string;
  board: Board;
  tasks: Task[];
  subtasks: { [taskId: string]: Subtask[] };
  boardMembers: BoardMember[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onEditSubtask: (task: Task, subtask: Subtask) => void;
  onDeleteSubtask: (task: Task, subtask: Subtask) => void;
  onAddSubtask: (taskId: string) => void;
}

// Default statuses for fallback
const DEFAULT_STATUSES = [
  { id: 'todo', name: 'To Do', color: 'from-yellow-500 to-orange-600', order: 1 },
  { id: 'in-progress', name: 'In Progress', color: 'from-blue-500 to-cyan-600', order: 2 },
  { id: 'done', name: 'Done', color: 'from-green-500 to-emerald-600', order: 3 },
] as BoardStatus[];

const ItemTypes = {
  TASK: 'task',
  SUBTASK: 'subtask',
};

interface DragItem {
  type: string;
  id: string;
  status: string;
  taskId?: string; // For subtasks
}

interface TaskCardProps {
  boardId: string;
  task: Task;
  subtasks: Subtask[];
  boardMembers: BoardMember[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onEditSubtask: (task: Task, subtask: Subtask) => void;
  onDeleteSubtask: (task: Task, subtask: Subtask) => void;
  onAddSubtask: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  boardId,
  task,
  subtasks,
  boardMembers,
  onEditTask,
  onDeleteTask,
  onEditSubtask,
  onDeleteSubtask,
  onAddSubtask,
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.TASK,
    item: { type: ItemTypes.TASK, id: task.id, status: task.status },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'todo': return { icon: AlertCircle, color: 'from-yellow-500 to-orange-600' };
      case 'in-progress': return { icon: Clock, color: 'from-blue-500 to-cyan-600' };
      case 'done': return { icon: CheckCircle2, color: 'from-green-500 to-emerald-600' };
      default: return { icon: AlertCircle, color: 'from-gray-500 to-gray-600' };
    }
  };

  const statusConfig = getStatusIcon(task.status);

  return (
    <Card
      ref={drag as unknown as React.Ref<HTMLDivElement>}
      className={`mb-3 cursor-move transition-all duration-200 hover:shadow-lg ${
        isDragging ? 'opacity-50 rotate-2 scale-105' : 'opacity-100'
      } backdrop-blur-sm bg-white/90 border-0 shadow-md`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1">
            <div className={`w-8 h-8 bg-gradient-to-br ${statusConfig.color} rounded-lg flex items-center justify-center shadow-sm flex-shrink-0`}>
              <statusConfig.icon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <Link 
                href={`/boards/${boardId}/tasks/${task.id}`}
                className="font-semibold text-gray-900 mb-1 line-clamp-2 text-sm hover:text-blue-600 transition-colors cursor-pointer block"
              >
                {task.title}
              </Link>
              {task.description && (
                <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                  {task.description}
                </p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditTask(task)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddSubtask(task.id)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Subtask
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDeleteTask(task)} 
                className="text-red-600 focus:text-red-600"
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            {task.dueDate && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>Due {format(task.dueDate.toDate(), "MMM d")}</span>
              </div>
            )}
            {task.assignedTo && (() => {
              const assignedMember = boardMembers.find(m => m.uid === task.assignedTo);
              return assignedMember ? (
                <div className="flex items-center gap-1">
                  <Avatar className="h-5 w-5 border border-white">
                    <AvatarImage src={assignedMember.photoURL || undefined} />
                    <AvatarFallback className="text-[10px] bg-gradient-to-br from-blue-100 to-purple-100">
                      {assignedMember.displayName?.[0] || assignedMember.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-gray-600 font-medium">{assignedMember.displayName || assignedMember.email}</span>
                </div>
              ) : null;
            })()}
          </div>
          
          {subtasks && subtasks.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>Subtasks</span>
                <span>{subtasks.filter(s => s.status === 'done').length}/{subtasks.length}</span>
              </div>
              {subtasks.slice(0, 3).map(subtask => (
                <SubtaskItem
                  key={subtask.id}
                  subtask={subtask}
                  task={task}
                  boardMembers={boardMembers}
                  onEditSubtask={onEditSubtask}
                  onDeleteSubtask={onDeleteSubtask}
                />
              ))}
              {subtasks.length > 3 && (
                <div className="text-xs text-gray-500 text-center py-1">
                  +{subtasks.length - 3} more subtasks
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface SubtaskItemProps {
  subtask: Subtask;
  task: Task;
  boardMembers: BoardMember[];
  onEditSubtask: (task: Task, subtask: Subtask) => void;
  onDeleteSubtask: (task: Task, subtask: Subtask) => void;
}

const SubtaskItem: React.FC<SubtaskItemProps> = ({
  subtask,
  task,
  boardMembers,
  onEditSubtask,
  onDeleteSubtask,
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.SUBTASK,
    item: { 
      type: ItemTypes.SUBTASK, 
      id: subtask.id, 
      status: subtask.status,
      taskId: task.id 
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  const assignedMember = boardMembers.find(m => m.uid === subtask.assignedTo);
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'todo': return { icon: AlertCircle, color: 'from-yellow-500 to-orange-600' };
      case 'in-progress': return { icon: Clock, color: 'from-blue-500 to-cyan-600' };
      case 'done': return { icon: CheckCircle2, color: 'from-green-500 to-emerald-600' };
      default: return { icon: AlertCircle, color: 'from-gray-500 to-gray-600' };
    }
  };

  const statusConfig = getStatusIcon(subtask.status);

  return (
    <div
      ref={drag as unknown as React.Ref<HTMLDivElement>}
      className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-50/80 hover:bg-gray-100/80 transition-all duration-200 cursor-move ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className={`w-4 h-4 bg-gradient-to-br ${statusConfig.color} rounded flex items-center justify-center flex-shrink-0`}>
          <statusConfig.icon className="w-2.5 h-2.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-gray-900 truncate block">
            {subtask.title}
          </span>
          {subtask.dueDate && (
            <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5">
              <Calendar className="w-2 h-2" />
              <span>Due {format(subtask.dueDate.toDate(), "MMM d")}</span>
            </div>
          )}
        </div>
        {assignedMember && (
          <Avatar className="h-4 w-4 border border-white flex-shrink-0">
            <AvatarImage src={assignedMember.photoURL || undefined} />
            <AvatarFallback className="text-[8px] bg-gradient-to-br from-gray-100 to-gray-200">
              {assignedMember.displayName?.[0] || assignedMember.email?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0">
            <MoreHorizontal className="h-2.5 w-2.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEditSubtask(task, subtask)}>
            <Pencil className="h-3 w-3 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onDeleteSubtask(task, subtask)} 
            className="text-red-600 focus:text-red-600"
          >
            <Trash className="h-3 w-3 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

interface ColumnProps {
  boardId: string;
  status: BoardStatus;
  tasks: Task[];
  subtasks: { [taskId: string]: Subtask[] };
  boardMembers: BoardMember[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onEditSubtask: (task: Task, subtask: Subtask) => void;
  onDeleteSubtask: (task: Task, subtask: Subtask) => void;
  onAddSubtask: (taskId: string) => void;
  onDropTask: (taskId: string, newStatus: string) => void;
  onDropSubtask: (subtaskId: string, taskId: string, newStatus: string) => void;
}

const Column: React.FC<ColumnProps> = ({
  boardId,
  status,
  tasks,
  subtasks,
  boardMembers,
  onEditTask,
  onDeleteTask,
  onEditSubtask,
  onDeleteSubtask,
  onAddSubtask,
  onDropTask,
  onDropSubtask,
}) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [ItemTypes.TASK, ItemTypes.SUBTASK],
    drop: (item: DragItem) => {
      if (item.status !== status.id) {
        if (item.type === ItemTypes.TASK) {
          onDropTask(item.id, status.id);
        } else if (item.type === ItemTypes.SUBTASK && item.taskId) {
          onDropSubtask(item.id, item.taskId, status.id);
        }
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  });

  const columnTasks = tasks.filter(task => task.status === status.id);

  return (
    <div 
      ref={drop as unknown as React.Ref<HTMLDivElement>}
      className={`flex-1 min-w-80 max-w-sm transition-all duration-200 ${
        isOver && canDrop ? 'bg-blue-50/50 scale-105' : ''
      }`}
    >
      <Card className="h-full backdrop-blur-sm bg-white/60 border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 bg-gradient-to-br ${status.color} rounded-lg flex items-center justify-center shadow-sm`}>
                <div className="w-3 h-3 bg-white rounded-full" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{status.name}</h3>
                <p className="text-sm text-gray-500">{columnTasks.length} tasks</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-gray-100 text-gray-600">
              {columnTasks.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3 min-h-96">
            {columnTasks.map(task => (
              <TaskCard
                key={task.id}
                boardId={boardId}
                task={task}
                subtasks={subtasks[task.id] || []}
                boardMembers={boardMembers}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onEditSubtask={onEditSubtask}
                onDeleteSubtask={onDeleteSubtask}
                onAddSubtask={onAddSubtask}
              />
            ))}
            {columnTasks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-3 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm">No tasks yet</p>
                <p className="text-xs text-gray-400">Drag tasks here</p>
              </div>
            )}
            {isOver && canDrop && (
              <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center text-blue-600 bg-blue-50/50">
                Drop here
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const TrelloBoardView: React.FC<TrelloBoardViewProps> = ({
  boardId,
  board,
  tasks,
  subtasks,
  boardMembers,
  onEditTask,
  onDeleteTask,
  onEditSubtask,
  onDeleteSubtask,
  onAddSubtask,
}) => {
  const handleDropTask = useCallback(async (taskId: string, newStatus: string) => {
    try {
      const taskRef = doc(db, "boards", boardId, "tasks", taskId);
      await updateDoc(taskRef, { status: newStatus });
      toast.success("Task moved successfully!");
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("Failed to move task");
    }
  }, [boardId]);

  const handleDropSubtask = useCallback(async (subtaskId: string, taskId: string, newStatus: string) => {
    try {
      const subtaskRef = doc(db, "boards", boardId, "tasks", taskId, "subtasks", subtaskId);
      await updateDoc(subtaskRef, { status: newStatus });
      toast.success("Subtask moved successfully!");
    } catch (error) {
      console.error("Error updating subtask status:", error);
      toast.error("Failed to move subtask");
    }
  }, [boardId]);

  // Get board statuses, use custom if available, otherwise defaults
  const boardStatuses = board.customStatuses && board.customStatuses.length > 0 
    ? board.customStatuses.sort((a, b) => a.order - b.order)
    : DEFAULT_STATUSES;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="w-full">
        <div className="flex gap-6 overflow-x-auto pb-6">
          {boardStatuses.map(status => (
            <Column
              key={status.id}
              boardId={boardId}
              status={status}
              tasks={tasks}
              subtasks={subtasks}
              boardMembers={boardMembers}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onEditSubtask={onEditSubtask}
              onDeleteSubtask={onDeleteSubtask}
              onAddSubtask={onAddSubtask}
              onDropTask={handleDropTask}
              onDropSubtask={handleDropSubtask}
            />
          ))}
        </div>
      </div>
    </DndProvider>
  );
}; 