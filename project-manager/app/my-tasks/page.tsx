"use client";

import { useEffect, useState, useMemo } from 'react';
import { collectionGroup, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { useAuth } from '@/app/contexts/AuthContext';
import { Subtask, Task, TaskStatus } from '@/types';
import { toast } from 'sonner';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MyTasksSkeleton } from '@/components/MyTasksSkeleton';
import { Header } from '@/components/Header';
import { AuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

const { db } = getFirebaseServices();

interface AssignedSubtask extends Subtask {
  boardId: string;
  boardName: string;
  taskId: string;
  taskTitle: string;
  type: 'subtask';
}

interface AssignedTask extends Task {
  boardId: string;
  boardName: string;
  type: 'task';
}

type AssignedItem = AssignedSubtask | AssignedTask;

const MyTasksPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [assignedItems, setAssignedItems] = useState<AssignedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // Listen for assigned subtasks
    const subtasksQuery = query(
      collectionGroup(db, 'subtasks'),
      where('assignedTo', '==', user.uid)
    );

    // Listen for assigned tasks
    const tasksQuery = query(
      collectionGroup(db, 'tasks'),
      where('assignedTo', '==', user.uid)
    );

    let subtasksLoaded = false;
    let tasksLoaded = false;

    const unsubscribeSubtasks = onSnapshot(subtasksQuery, async (snapshot) => {
      const newSubtasks: AssignedSubtask[] = [];
      
      for (const subtaskDoc of snapshot.docs) {
        const subtask = { id: subtaskDoc.id, ...subtaskDoc.data() } as Subtask;
        const taskRef = subtaskDoc.ref.parent.parent;
        const boardRef = taskRef?.parent.parent;

        if (taskRef && boardRef) {
          try {
            const taskDoc = await getDoc(taskRef);
            const boardDoc = await getDoc(boardRef);
            if (taskDoc.exists() && boardDoc.exists()) {
              newSubtasks.push({
                ...subtask,
                boardId: boardRef.id,
                boardName: boardDoc.data().name,
                taskId: taskRef.id,
                taskTitle: taskDoc.data().title,
                type: 'subtask',
              });
            }
          } catch (error) {
            console.error("Error fetching subtask details:", error);
          }
        }
      }
      
      // Update items array - remove old subtasks and add new ones
      setAssignedItems(prevItems => {
        const tasksOnly = prevItems.filter(item => item.type === 'task');
        return [...tasksOnly, ...newSubtasks];
      });
      
      subtasksLoaded = true;
      if (tasksLoaded) {
        setLoading(false);
      }
    }, (error) => {
      console.error("Error with subtasks listener:", error);
      toast.error("Could not listen for subtask updates.");
      subtasksLoaded = true;
      if (tasksLoaded) {
        setLoading(false);
      }
    });

    const unsubscribeTasks = onSnapshot(tasksQuery, async (snapshot) => {
      const newTasks: AssignedTask[] = [];
      
      for (const taskDoc of snapshot.docs) {
        const task = { id: taskDoc.id, ...taskDoc.data() } as Task;
        const boardRef = taskDoc.ref.parent.parent;

        if (boardRef) {
          try {
            const boardDoc = await getDoc(boardRef);
            if (boardDoc.exists()) {
              newTasks.push({
                ...task,
                boardId: boardRef.id,
                boardName: boardDoc.data().name,
                type: 'task',
              });
            }
          } catch (error) {
            console.error("Error fetching task details:", error);
          }
        }
      }
      
      // Update items array - remove old tasks and add new ones
      setAssignedItems(prevItems => {
        const subtasksOnly = prevItems.filter(item => item.type === 'subtask');
        return [...subtasksOnly, ...newTasks];
      });
      
      tasksLoaded = true;
      if (subtasksLoaded) {
        setLoading(false);
      }
    }, (error) => {
      console.error("Error with tasks listener:", error);
      toast.error("Could not listen for task updates.");
      tasksLoaded = true;
      if (subtasksLoaded) {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeSubtasks();
      unsubscribeTasks();
    };
  }, [user]);

  const handleStatusChange = async (item: AssignedItem, newStatus: string) => {
    try {
      let itemRef;
      if (item.type === 'subtask') {
        itemRef = doc(db, "boards", item.boardId, "tasks", item.taskId, "subtasks", item.id);
      } else {
        itemRef = doc(db, "boards", item.boardId, "tasks", item.id);
      }
      
      await updateDoc(itemRef, { status: newStatus });
      
      setAssignedItems(prevItems => 
        prevItems.map(t => t.id === item.id ? { ...t, status: newStatus as TaskStatus } : t)
      );
      toast.success("Task status updated!");
    } catch (error) {
      console.log("Error updating task status:", error)
      toast.error("Failed to update status.");
    }
  };

  const filteredAndSortedItems = useMemo(() => {
    let items = [...assignedItems];

    if (filterStatus !== 'all') {
      items = items.filter(item => item.status === filterStatus);
    }

    items.sort((a, b) => {
      const valA = a.type === 'subtask' ? a.taskTitle.toLowerCase() : a.title.toLowerCase();
      const valB = b.type === 'subtask' ? b.taskTitle.toLowerCase() : b.title.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return items;
  }, [assignedItems, filterStatus, sortOrder]);

  if (loading) {
    return <MyTasksSkeleton />;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">My Tasks</h1>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <Select value={filterStatus} onValueChange={setFilterStatus as (value: string) => void}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={setSortOrder as (value: string) => void}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="asc">Oldest First</SelectItem>
                      <SelectItem value="desc">Newest First</SelectItem>
                  </SelectContent>
              </Select>
          </div>
        </div>
        
        {filteredAndSortedItems.length === 0 ? (
          <div className="text-center py-12">
              <p className="text-muted-foreground">{filterStatus === 'all' ? 'You have no tasks assigned to you. Great job!' : 'No tasks match the current filter.'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedItems.map(item => (
              <div key={`${item.type}-${item.id}`} className="p-4 bg-white border rounded-lg flex flex-col sm:flex-row justify-between items-start gap-4 shadow-sm">
                <Link href={`/boards/${item.boardId}`} className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-500" />
                    <span className="text-xs text-gray-500 uppercase tracking-wider">
                      {item.type === 'subtask' ? 'Subtask' : 'Task'}
                    </span>
                  </div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-muted-foreground">
                    From board: <span className="font-medium text-primary">{item.boardName}</span>
                    {item.type === 'subtask' && (
                      <> / Task: <span className="font-medium">{item.taskTitle}</span></>
                    )}
                  </p>
                  {item.dueDate && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      Due: {format(item.dueDate.toDate(), 'MMM d, yyyy')}
                    </div>
                  )}
                </Link>
                <div className="w-full sm:w-40 flex-shrink-0">
                  <Select value={item.status} onValueChange={(newStatus) => handleStatusChange(item, newStatus)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Change status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </AuthGuard>
  );
};

export default MyTasksPage; 