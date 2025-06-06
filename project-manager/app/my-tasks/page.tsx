"use client";

import { useEffect, useState, useMemo } from 'react';
import { collectionGroup, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { useAuth } from '@/app/contexts/AuthContext';
import { Subtask, TaskStatus } from '@/types';
import { toast } from 'sonner';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MyTasksSkeleton } from '@/components/MyTasksSkeleton';

const { db } = getFirebaseServices();

interface AssignedSubtask extends Subtask {
  boardId: string;
  boardName: string;
  taskId: string;
  taskTitle: string;
}

const MyTasksPage = () => {
  const { user } = useAuth();
  const [assignedSubtasks, setAssignedSubtasks] = useState<AssignedSubtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const subtasksQuery = query(
      collectionGroup(db, 'subtasks'),
      where('assignedTo', '==', user.uid)
    );

    const unsubscribe = onSnapshot(subtasksQuery, async (snapshot) => {
      const tasks: AssignedSubtask[] = [];
      for (const subtaskDoc of snapshot.docs) {
        const subtask = { id: subtaskDoc.id, ...subtaskDoc.data() } as Subtask;
        const taskRef = subtaskDoc.ref.parent.parent;
        const boardRef = taskRef?.parent.parent;

        if (taskRef && boardRef) {
          const taskDoc = await getDoc(taskRef);
          const boardDoc = await getDoc(boardRef);
          if (taskDoc.exists() && boardDoc.exists()) {
            tasks.push({
              ...subtask,
              boardId: boardRef.id,
              boardName: boardDoc.data().name,
              taskId: taskRef.id,
              taskTitle: taskDoc.data().title,
            });
          }
        }
      }
      setAssignedSubtasks(tasks);
      setLoading(false);
    }, (error) => {
      console.error("Error with real-time listener:", error);
      toast.error("Could not listen for task updates.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleStatusChange = async (subtask: AssignedSubtask, newStatus: string) => {
    try {
      const subtaskRef = doc(db, "boards", subtask.boardId, "tasks", subtask.taskId, "subtasks", subtask.id);
      await updateDoc(subtaskRef, { status: newStatus });
      
      setAssignedSubtasks(prevTasks => 
        prevTasks.map(t => t.id === subtask.id ? { ...t, status: newStatus as TaskStatus } : t)
      );
      toast.success("Task status updated!");
    } catch (error) {
      console.log("Error updating subtask status:", error)
      toast.error("Failed to update status.");
    }
  };

  const filteredAndSortedSubtasks = useMemo(() => {
    let tasks = [...assignedSubtasks];

    if (filterStatus !== 'all') {
      tasks = tasks.filter(task => task.status === filterStatus);
    }

    tasks.sort((a, b) => {
      const valA = a.taskTitle.toLowerCase();
      const valB = b.taskTitle.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return tasks;
  }, [assignedSubtasks, filterStatus, sortOrder]);

  if (loading) {
    return <MyTasksSkeleton />;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">My Tasks</h1>
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
      {filteredAndSortedSubtasks.length === 0 ? (
        <div className="text-center py-12">
            <p className="text-muted-foreground">{filterStatus === 'all' ? 'You have no tasks assigned to you. Great job!' : 'No tasks match the current filter.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedSubtasks.map(subtask => (
            <div key={subtask.id} className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-start gap-4">
              <Link href={`/boards/${subtask.boardId}`} className="flex-1 space-y-1">
                <p className="font-semibold">{subtask.title}</p>
                <p className="text-sm text-muted-foreground">
                  From board: <span className="font-medium text-primary">{subtask.boardName}</span> / Task: <span className="font-medium">{subtask.taskTitle}</span>
                </p>
              </Link>
              <div className="w-full sm:w-40 flex-shrink-0">
                <Select value={subtask.status} onValueChange={(newStatus) => handleStatusChange(subtask, newStatus)}>
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
  );
};

export default MyTasksPage; 