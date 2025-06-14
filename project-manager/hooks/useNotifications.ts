import { useState, useEffect } from 'react';
import { collectionGroup, query, where, onSnapshot, doc, getDoc, Timestamp } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { useAuth } from '@/app/contexts/AuthContext';
import { Task, Subtask } from '@/types';

const { db } = getFirebaseServices();

export interface Notification {
  id: string;
  type: 'task_due' | 'subtask_due' | 'task_assigned';
  title: string;
  message: string;
  boardId: string;
  boardName: string;
  taskId: string;
  taskTitle: string;
  subtaskId?: string;
  subtaskTitle?: string;
  dueDate?: Date;
  createdAt: Date;
  isRead?: boolean;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    console.log('Setting up notification listeners for user:', user.uid);
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);

    // Query for assigned subtasks
    const subtasksQuery = query(
      collectionGroup(db, 'subtasks'),
      where('assignedTo', '==', user.uid)
    );

    // Query for tasks owned by user
    const tasksOwnedQuery = query(
      collectionGroup(db, 'tasks'),
      where('owner', '==', user.uid)
    );

    // Query for tasks assigned to user
    const tasksAssignedQuery = query(
      collectionGroup(db, 'tasks'),
      where('assignedTo', '==', user.uid)
    );

    const unsubscribeSubtasks = onSnapshot(
      subtasksQuery, 
      async (snapshot) => {
        console.log('Subtasks snapshot received:', snapshot.docs.length, 'documents');
        const subtaskNotifications: Notification[] = [];
        
        for (const subtaskDoc of snapshot.docs) {
          const subtask = { id: subtaskDoc.id, ...subtaskDoc.data() } as Subtask;
          const taskRef = subtaskDoc.ref.parent.parent;
          const boardRef = taskRef?.parent.parent;

          if (taskRef && boardRef && subtask.status !== 'done') {
            try {
              const taskDoc = await getDoc(taskRef);
              const boardDoc = await getDoc(boardRef);
              
              if (taskDoc.exists() && boardDoc.exists()) {
                const task = taskDoc.data() as Task;
                const boardName = (boardDoc.data() as any).name;

                // Check if task has due date and is approaching or overdue
                if (task.dueDate) {
                  const dueDate = task.dueDate.toDate();
                  console.log('Checking subtask due date:', subtask.title, 'due:', dueDate, 'threshold:', threeDaysFromNow);
                  
                  if (dueDate <= threeDaysFromNow) {
                    const isOverdue = dueDate < today;
                    console.log('Adding subtask notification:', subtask.title, 'isOverdue:', isOverdue);
                    
                    subtaskNotifications.push({
                      id: `subtask_due_${subtask.id}`,
                      type: 'subtask_due',
                      title: isOverdue ? 'Overdue Task' : 'Task Due Soon',
                      message: `"${subtask.title}" in "${task.title}" is ${isOverdue ? 'overdue' : 'due soon'}`,
                      boardId: boardRef.id,
                      boardName,
                      taskId: taskRef.id,
                      taskTitle: task.title,
                      subtaskId: subtask.id,
                      subtaskTitle: subtask.title,
                      dueDate,
                      createdAt: new Date(),
                      isRead: false,
                    });
                  }
                }
              }
            } catch (error) {
              console.error('Error fetching task/board for subtask notification:', error);
            }
          }
        }
        
        console.log('Generated subtask notifications:', subtaskNotifications.length);
        setNotifications(prev => {
          const taskNotifications = prev.filter(n => n.type === 'task_due');
          return [...taskNotifications, ...subtaskNotifications];
        });
      },
      (error) => {
        console.error('Error in subtasks snapshot listener:', error);
        setLoading(false);
      }
    );

    // Function to handle task notifications for both owned and assigned tasks
    const handleTaskSnapshot = async (snapshot: any, taskType: 'owned' | 'assigned') => {
      console.log(`${taskType} tasks snapshot received:`, snapshot.docs.length, 'documents');
      const taskNotifications: Notification[] = [];
      
      for (const taskDoc of snapshot.docs) {
        const task = { id: taskDoc.id, ...taskDoc.data() } as Task;
        const boardRef = taskDoc.ref.parent.parent;

        if (boardRef && task.status !== 'done' && task.dueDate) {
          try {
            const boardDoc = await getDoc(boardRef);
            
            if (boardDoc.exists()) {
              const boardName = (boardDoc.data() as any).name;
              const dueDate = task.dueDate.toDate();
              console.log(`Checking ${taskType} task due date:`, task.title, 'due:', dueDate, 'threshold:', threeDaysFromNow);
              
              if (dueDate <= threeDaysFromNow) {
                const isOverdue = dueDate < today;
                console.log(`Adding ${taskType} task notification:`, task.title, 'isOverdue:', isOverdue);
                
                taskNotifications.push({
                  id: `task_due_${task.id}_${taskType}`,
                  type: 'task_due',
                  title: isOverdue ? 'Overdue Task' : 'Task Due Soon',
                  message: `"${task.title}" is ${isOverdue ? 'overdue' : 'due soon'}`,
                  boardId: boardRef.id,
                  boardName,
                  taskId: task.id,
                  taskTitle: task.title,
                  dueDate,
                  createdAt: new Date(),
                  isRead: false,
                });
              }
            }
          } catch (error) {
            console.error(`Error fetching board for ${taskType} task notification:`, error);
          }
        }
      }
      
      console.log(`Generated ${taskType} task notifications:`, taskNotifications.length);
      return taskNotifications;
    };

    const unsubscribeTasksOwned = onSnapshot(
      tasksOwnedQuery, 
      async (snapshot) => {
        const ownedTaskNotifications = await handleTaskSnapshot(snapshot, 'owned');
        setNotifications(prev => {
          // Remove old owned task notifications and add new ones
          const filtered = prev.filter(n => !n.id.includes('_owned'));
          return [...filtered, ...ownedTaskNotifications];
        });
        setLoading(false);
      },
      (error: any) => {
        console.error('Error in owned tasks snapshot listener:', error);
        setLoading(false);
      }
    );

    const unsubscribeTasksAssigned = onSnapshot(
      tasksAssignedQuery, 
      async (snapshot) => {
        const assignedTaskNotifications = await handleTaskSnapshot(snapshot, 'assigned');
        setNotifications(prev => {
          // Remove old assigned task notifications and add new ones
          const filtered = prev.filter(n => !n.id.includes('_assigned'));
          return [...filtered, ...assignedTaskNotifications];
        });
      },
      (error: any) => {
        console.error('Error in assigned tasks snapshot listener:', error);
      }
    );

    return () => {
      unsubscribeSubtasks();
      unsubscribeTasksOwned();
      unsubscribeTasksAssigned();
    };
  }, [user]);

  // Update unread count whenever notifications change
  useEffect(() => {
    const unread = notifications.filter(n => !n.isRead).length;
    setUnreadCount(unread);
  }, [notifications]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, isRead: true }))
    );
  };

  const clearNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    clearNotification,
  };
}; 