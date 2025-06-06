"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onSnapshot, doc, collection, query } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { Board, Task, Subtask } from '@/types';
import { useAuth } from './AuthContext';
import { useParams } from 'next/navigation';
import { toast } from "sonner";

interface RealtimeDataContextType {
  board: Board | null;
  tasks: Task[];
  subtasks: { [taskId: string]: Subtask[] };
  loading: boolean;
}

const { db } = getFirebaseServices();

const RealtimeDataContext = createContext<RealtimeDataContextType | undefined>(undefined);

export const RealtimeDataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const params = useParams();
  const boardId = params.boardId as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<{ [taskId: string]: Subtask[] }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !boardId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribes: (() => void)[] = [];

    // Listener for the board itself
    const boardUnsubscribe = onSnapshot(doc(db, 'boards', boardId), 
      (boardDoc) => { // onNext
        if (boardDoc.exists()) {
          setBoard({ id: boardDoc.id, ...boardDoc.data() } as Board);
        } else {
          setBoard(null);
          toast.error("Board not found.");
        }
        setLoading(false);
      },
      (error) => { // onError
        console.error("Firestore board listener error:", error);
        toast.error("Failed to load board.", { description: "You may not have permission to view this board." });
        setBoard(null);
        setLoading(false);
      }
    );
    unsubscribes.push(boardUnsubscribe);

    // Listener for tasks
    const tasksQuery = query(collection(db, 'boards', boardId, 'tasks'));
    const tasksUnsubscribe = onSnapshot(tasksQuery, 
      (tasksSnapshot) => { // onNext
        const boardTasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        setTasks(boardTasks);
      },
      (error) => { // onError
        console.error("Firestore tasks listener error:", error);
        toast.error("Failed to load tasks for this board.");
        setTasks([]);
      }
    );
    unsubscribes.push(tasksUnsubscribe);

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user, boardId]);

  // Effect for subtask listeners, depends on tasks
  useEffect(() => {
    if (tasks.length === 0) return;

    const allSubtaskUnsubscribes: (() => void)[] = [];
    setSubtasks({}); // Clear old subtasks before setting new listeners

    tasks.forEach(task => {
      const subtasksQuery = query(collection(db, 'boards', boardId, 'tasks', task.id, 'subtasks'));
      const unsubscribe = onSnapshot(subtasksQuery, 
        (subtasksSnapshot) => { // onNext
          const taskSubtasks = subtasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subtask));
          setSubtasks(currentSubtasks => ({
            ...currentSubtasks,
            [task.id]: taskSubtasks
          }));
        },
        (error) => { // onError
          console.error(`Firestore subtasks listener error for task ${task.id}:`, error);
          toast.error(`Failed to load subtasks for task: ${task.title}`);
        }
      );
      allSubtaskUnsubscribes.push(unsubscribe);
    });

    return () => allSubtaskUnsubscribes.forEach(unsub => unsub());
  }, [tasks, boardId]);

  const value = { board, tasks, subtasks, loading };

  return (
    <RealtimeDataContext.Provider value={value}>
      {children}
    </RealtimeDataContext.Provider>
  );
};

export const useRealtimeData = () => {
  const context = useContext(RealtimeDataContext);
  if (context === undefined) {
    throw new Error('useRealtimeData must be used within a RealtimeDataProvider');
  }
  return context;
}; 