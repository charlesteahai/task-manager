"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, onSnapshot, deleteDoc } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { useAuth } from '@/app/contexts/AuthContext';
import { Task, Subtask, BoardMember, Board } from '@/types';
import { Header } from '@/components/Header';
import { AuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, User, Clock, FileText, Edit, Trash, Plus, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { EditTaskForm } from '@/components/EditTaskForm';
import { EditSubtaskForm } from '@/components/EditSubtaskForm';
import { CreateSubtaskForm } from '@/components/CreateSubtaskForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { toast } from 'sonner';

const { db } = getFirebaseServices();

const TaskDetailPage = () => {
  const { user } = useAuth();
  console.log(user); // Prevent linting error
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;
  const taskId = params.taskId as string;

  const [task, setTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);
  const [isCreateSubtaskOpen, setIsCreateSubtaskOpen] = useState(false);
  const [deletingSubtask, setDeletingSubtask] = useState<Subtask | null>(null);

  useEffect(() => {
    if (!boardId || !taskId) return;

    const fetchTaskAndBoard = async () => {
      try {
        // Fetch task
        const taskRef = doc(db, "boards", boardId, "tasks", taskId);
        const taskDoc = await getDoc(taskRef);
        
        if (!taskDoc.exists()) {
          toast.error("Task not found");
          router.push(`/boards/${boardId}`);
          return;
        }

        setTask({ id: taskDoc.id, ...taskDoc.data() } as Task);

        // Fetch board info and members
        const boardRef = doc(db, "boards", boardId);
        const boardDoc = await getDoc(boardRef);
        
        if (boardDoc.exists()) {
          const boardData = boardDoc.data();
          setBoard({ id: boardDoc.id, ...boardData } as Board);
          
          // Fetch user details for all board members
          const memberIds = boardData.members || [];
          const memberPromises = memberIds.map(async (memberId: string) => {
            const userDoc = await getDoc(doc(db, 'users', memberId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              return {
                uid: memberId,
                email: userData.email,
                displayName: userData.displayName,
                photoURL: userData.photoURL,
              } as BoardMember;
            }
            return null;
          });
          
          const members = await Promise.all(memberPromises);
          setBoardMembers(members.filter((member): member is BoardMember => member !== null));
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching task:", error);
        toast.error("Failed to load task details");
        setLoading(false);
      }
    };

    fetchTaskAndBoard();

    // Listen for subtasks
    const subtasksQuery = query(collection(db, "boards", boardId, "tasks", taskId, "subtasks"));
    const unsubscribeSubtasks = onSnapshot(subtasksQuery, (snapshot) => {
      const newSubtasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Subtask[];
      setSubtasks(newSubtasks);
    });

    return () => {
      unsubscribeSubtasks();
    };
  }, [boardId, taskId, router]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'todo': return 'secondary';
      case 'in-progress': return 'default';
      case 'done': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'todo': return '⏸️';
      case 'in-progress': return '⏱️';
      case 'done': return '✅';
      default: return '📋';
    }
  };

  const handleTaskUpdated = () => {
    // Refresh task data
    const fetchTask = async () => {
      const taskRef = doc(db, "boards", boardId, "tasks", taskId);
      const taskDoc = await getDoc(taskRef);
      if (taskDoc.exists()) {
        setTask({ id: taskDoc.id, ...taskDoc.data() } as Task);
      }
    };
    fetchTask();
    setIsEditingTask(false);
  };

  const handleSubtaskUpdated = () => {
    // Subtasks are updated via real-time listener
    setEditingSubtask(null);
  };

  const handleSubtaskCreated = () => {
    // Subtasks are updated via real-time listener
    setIsCreateSubtaskOpen(false);
  };

  const handleDeleteSubtask = async () => {
    if (!deletingSubtask) return;

    try {
      const subtaskRef = doc(db, "boards", boardId, "tasks", taskId, "subtasks", deletingSubtask.id);
      await deleteDoc(subtaskRef);
      toast.success("Subtask deleted successfully");
    } catch (error) {
      console.error("Error deleting subtask:", error);
      toast.error("Failed to delete subtask");
    } finally {
      setDeletingSubtask(null);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="container mx-auto p-6">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!task) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="container mx-auto p-6">
            <div className="text-center py-12">
              <p className="text-gray-500">Task not found</p>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const assignedMember = task.assignedTo ? boardMembers.find(m => m.uid === task.assignedTo) : null;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="container mx-auto p-6 max-w-5xl">
          {/* Breadcrumb */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              onClick={() => router.push(`/boards/${boardId}`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {board?.name || 'Board'}
            </Button>
          </div>

          {/* Task Header */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{task.title}</CardTitle>
                  <div className="flex items-center gap-4">
                    <Badge variant={getStatusVariant(task.status)} className="flex items-center gap-1">
                      {getStatusIcon(task.status)}
                      {task.status}
                    </Badge>
                    {task.dueDate && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        Due {format(task.dueDate.toDate(), 'MMM d, yyyy')}
                      </div>
                    )}
                    {assignedMember && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        {assignedMember.displayName || assignedMember.email}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    Created {format(task.createdAt.toDate(), 'MMM d, yyyy')}
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setIsEditingTask(true)}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Task
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.description && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Description
                  </h4>
                  <p className="text-gray-600 whitespace-pre-wrap">{task.description}</p>
                </div>
              )}
              {task.remark && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Remark / Notes</h4>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-600 whitespace-pre-wrap">{task.remark}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subtasks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Subtasks ({subtasks.length})
                </CardTitle>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateSubtaskOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Subtask
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {subtasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No subtasks yet. Add one to break down this task.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {subtasks.map((subtask) => {
                    const subtaskAssignedMember = subtask.assignedTo ? 
                      boardMembers.find(m => m.uid === subtask.assignedTo) : null;
                    
                    return (
                      <div key={subtask.id} className="p-4 border rounded-lg bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h5 className="font-medium text-gray-900">{subtask.title}</h5>
                              <Badge variant={getStatusVariant(subtask.status)} className="flex items-center gap-1 text-xs">
                                {getStatusIcon(subtask.status)}
                                {subtask.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                              <span>Created {format(subtask.createdAt.toDate(), "MMM d, yyyy")}</span>
                              {subtaskAssignedMember && (
                                <span>Assigned to {subtaskAssignedMember.displayName || subtaskAssignedMember.email}</span>
                              )}
                              {subtask.dueDate && (
                                <span>Due {format(subtask.dueDate.toDate(), "MMM d, yyyy")}</span>
                              )}
                            </div>
                            {subtask.remark && (
                              <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                <strong>Note:</strong> {subtask.remark}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setEditingSubtask(subtask)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setDeletingSubtask(subtask)}
                              className="hover:border-red-300 hover:text-red-600"
                            >
                              <Trash className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dialogs */}
        <Dialog open={isEditingTask} onOpenChange={setIsEditingTask}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
            </DialogHeader>
            <EditTaskForm 
              task={task}
              boardId={boardId}
              boardMembers={boardMembers}
              boardStatuses={board?.customStatuses && board.customStatuses.length > 0 ? board.customStatuses : [
                { id: 'todo', name: 'To Do', color: 'from-yellow-500 to-orange-600', order: 1 },
                { id: 'in-progress', name: 'In Progress', color: 'from-blue-500 to-cyan-600', order: 2 },
                { id: 'done', name: 'Done', color: 'from-green-500 to-emerald-600', order: 3 }
              ]}
              onTaskUpdated={handleTaskUpdated}
              onClose={() => setIsEditingTask(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingSubtask} onOpenChange={(open) => !open && setEditingSubtask(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Subtask</DialogTitle>
            </DialogHeader>
            {editingSubtask && (
              <EditSubtaskForm 
                subtask={editingSubtask}
                boardId={boardId}
                taskId={taskId}
                boardMembers={boardMembers}
                boardStatuses={board?.customStatuses && board.customStatuses.length > 0 ? board.customStatuses : [
                  { id: 'todo', name: 'To Do', color: 'from-yellow-500 to-orange-600', order: 1 },
                  { id: 'in-progress', name: 'In Progress', color: 'from-blue-500 to-cyan-600', order: 2 },
                  { id: 'done', name: 'Done', color: 'from-green-500 to-emerald-600', order: 3 }
                ]}
                onSubtaskUpdated={handleSubtaskUpdated}
                onClose={() => setEditingSubtask(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isCreateSubtaskOpen} onOpenChange={setIsCreateSubtaskOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Subtask</DialogTitle>
            </DialogHeader>
            <CreateSubtaskForm 
              boardId={boardId}
              taskId={taskId}
              boardMembers={boardMembers}
              boardStatuses={board?.customStatuses && board.customStatuses.length > 0 ? board.customStatuses : [
                { id: 'todo', name: 'To Do', color: 'from-yellow-500 to-orange-600', order: 1 },
                { id: 'in-progress', name: 'In Progress', color: 'from-blue-500 to-cyan-600', order: 2 },
                { id: 'done', name: 'Done', color: 'from-green-500 to-emerald-600', order: 3 }
              ]}
              onSubtaskCreated={handleSubtaskCreated}
              onClose={() => setIsCreateSubtaskOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <ConfirmationDialog
          open={!!deletingSubtask}
          onOpenChange={(open) => !open && setDeletingSubtask(null)}
          title="Delete Subtask"
          description={`Are you sure you want to delete '${deletingSubtask?.title}'? This cannot be undone.`}
          onConfirm={handleDeleteSubtask}
        />
      </div>
    </AuthGuard>
  );
};

export default TaskDetailPage;
