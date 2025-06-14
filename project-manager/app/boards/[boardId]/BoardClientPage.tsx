"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, deleteDoc, writeBatch, getDoc } from "firebase/firestore";
import { getFirebaseServices } from "@/lib/firebase";
import { Task, Subtask, BoardMember } from "@/types";
import { useAuth } from "@/app/contexts/AuthContext";
import { useRealtimeData } from "@/app/contexts/RealtimeDataContext";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CreateSubtaskForm } from "@/components/CreateSubtaskForm";
import { ChevronDown, Plus, Pencil, Trash, UserPlus, Users, User, Settings, FolderOpen, CheckCircle2, Clock, AlertCircle, Calendar, Target, List, Layout } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { EditTaskForm } from "@/components/EditTaskForm";
import { EditSubtaskForm } from "@/components/EditSubtaskForm";
import { InviteMemberForm } from "@/components/InviteMemberForm";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ManageMembersDialog } from "@/components/ManageMembersDialog";
import { BoardPageSkeleton } from "@/components/BoardPageSkeleton";
import { CreateTaskForm } from "@/components/CreateTaskForm";
import { Header } from "@/components/Header";
import { AuthGuard } from "@/components/AuthGuard";
import { Card, CardContent } from "@/components/ui/card";
import { TrelloBoardView } from "@/components/TrelloBoardView";

const { db } = getFirebaseServices();

const BoardClientPage = () => {
    const router = useRouter();
    const { boardId } = useParams();
    const { user } = useAuth();
    const { board, tasks, subtasks, loading } = useRealtimeData();

    const [openSubtaskForms, setOpenSubtaskForms] = useState<{ [taskId: string]: boolean }>({});
    const [openTasks, setOpenTasks] = useState<{ [taskId: string]: boolean }>({});
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [editingSubtask, setEditingSubtask] = useState<{ task: Task, subtask: Subtask } | null>(null);
    const [deletingTask, setDeletingTask] = useState<Task | null>(null);
    const [deletingSubtask, setDeletingSubtask] = useState<{ task: Task, subtask: Subtask } | null>(null);
    const [isInviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [isManageMembersOpen, setManageMembersOpen] = useState(false);
    const [isCreateTaskOpen, setCreateTaskOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'board'>('board');

    const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
    
    const fetchMembers = useCallback(async () => {
        if (!board) return;
        try {
            // Fetch user details for all board members
            const memberPromises = board.members.map(async (memberId) => {
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
        } catch (error) {
            console.error("Error fetching board members:", error);
        }
    }, [board]);

    useEffect(() => {
        if (board) {
            fetchMembers();
        }
    }, [board, boardId, fetchMembers]);

    useEffect(() => {
        if (!loading && !board) {
            toast.error("Board not found or you don't have access.");
            router.push('/dashboard');
        }
    }, [loading, board, router]);
    
    const handleTaskUpdated = () => {
        setEditingTask(null);
        toast.success("Task updated successfully!");
    };
    
    const handleSubtaskUpdated = () => {
        setEditingSubtask(null);
        toast.success("Subtask updated successfully!");
    };

    const handleSubtaskCreated = () => {
        toast.success("Subtask created!");
    };

    const handleTaskCreated = () => {
        toast.success("Task created successfully!");
    };

    const handleDeleteTask = async () => {
        if (!deletingTask) return;
        try {
            const batch = writeBatch(db);
            const subtasksToDelete = subtasks[deletingTask.id] || [];
            for (const subtask of subtasksToDelete) {
                const subtaskRef = doc(db, "boards", boardId as string, "tasks", deletingTask.id, "subtasks", subtask.id);
                batch.delete(subtaskRef);
            }
            const taskRef = doc(db, "boards", boardId as string, "tasks", deletingTask.id);
            batch.delete(taskRef);
            await batch.commit();
            setDeletingTask(null);
            toast.success("Task and its subtasks deleted successfully!");
        } catch (error) {
            console.error("Error deleting task: ", error);
            toast.error("Failed to delete task.");
        }
    };

    const handleDeleteSubtask = async () => {
        if (!deletingSubtask) return;
        try {
            const subtaskRef = doc(db, "boards", boardId as string, "tasks", deletingSubtask.task.id, "subtasks", deletingSubtask.subtask.id);
            await deleteDoc(subtaskRef);
            setDeletingSubtask(null);
            toast.success("Subtask deleted successfully!");
        } catch (error) {
            console.error("Error deleting subtask: ", error);
            toast.error("Failed to delete subtask.");
        }
    };

    const toggleSubtaskForm = (taskId: string) => {
        setOpenSubtaskForms(prev => ({ ...prev, [taskId]: !prev[taskId] }));
    };
    
    const toggleTaskOpen = (taskId: string) => {
        setOpenTasks(prev => ({...prev, [taskId]: !prev[taskId]}));
    }

    const handleAddSubtask = (taskId: string) => {
        toggleSubtaskForm(taskId);
    };

    if (loading) {
        return <BoardPageSkeleton />;
    }

    if (!board) {
        return <div className="container mx-auto py-8">Board not found or you do not have access.</div>;
    }

    const isOwner = user && user.uid === board.owner;

    const getStatusVariant = (status: string) => {
        switch (status) {
            case "todo": return "secondary";
            case "in-progress": return "default";
            case "done": return "outline";
            default: return "secondary";
        }
    };
    
    const getStatusIcon = (status: string) => {
        switch (status) {
            case "todo": return <Clock className="w-4 h-4" />;
            case "in-progress": return <AlertCircle className="w-4 h-4" />;
            case "done": return <CheckCircle2 className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };
    
    return (
        <AuthGuard>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/10 to-purple-600/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400/10 to-pink-600/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-br from-cyan-400/5 to-blue-600/5 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
            </div>

            <Header />
            
            <div className="relative container mx-auto px-4 py-8">
                {/* Board Header */}
                <div className="mb-8">
                    <Card className="backdrop-blur-sm bg-white/70 border-0 shadow-lg overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10" />
                        <CardContent className="relative p-6">
                            <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                        <FolderOpen className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
                                            {board.name}
                                        </h1>
                                        <p className="text-gray-600 text-lg max-w-2xl">
                                            {board.description || "No description provided"}
                                        </p>
                                        <div className="flex items-center gap-4 mt-3">
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <Users className="w-4 h-4" />
                                                <span>{boardMembers.length} member{boardMembers.length !== 1 ? 's' : ''}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <Calendar className="w-4 h-4" />
                                                <span>
                                                    Created {board.createdAt ? format(
                                                        new Date(board.createdAt.seconds * 1000),
                                                        "MMM d, yyyy"
                                                    ) : "Unknown"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-3">
                                    <Button 
                                        onClick={() => setCreateTaskOpen(true)}
                                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Task
                                    </Button>
                                    
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setInviteDialogOpen(true)}
                                        className="backdrop-blur-sm bg-white/60 border-gray-200 hover:bg-white/80"
                                    >
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Invite Member
                                    </Button>
                                    
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setManageMembersOpen(true)}
                                        className="backdrop-blur-sm bg-white/60 border-gray-200 hover:bg-white/80"
                                    >
                                        <Users className="w-4 h-4 mr-2" />
                                        Members
                                    </Button>
                                    
                                    <Button 
                                        variant="outline" 
                                        asChild
                                        className="backdrop-blur-sm bg-white/60 border-gray-200 hover:bg-white/80"
                                    >
                                        <Link href={`/boards/${boardId}/edit`}>
                                            <Settings className="w-4 h-4 mr-2" />
                                            Settings
                                        </Link>
                                    </Button>
                                </div>
                            </div>

                            {/* Members Section */}
                            <div className="mt-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <User className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm font-medium text-gray-700">Board Members</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {boardMembers.map((member) => (
                                        <div key={member.uid} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 backdrop-blur-sm border border-gray-200">
                                            <Avatar className="w-6 h-6">
                                                <AvatarImage src={member.photoURL || undefined} alt={member.displayName || member.email} />
                                                <AvatarFallback className="text-xs bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                                                    {(member.displayName || member.email).charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium text-gray-700">
                                                {member.displayName || member.email}
                                            </span>
                                            {member.uid === board.owner && (
                                                <Badge variant="secondary" className="text-xs bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-0">
                                                    Owner
                                                </Badge>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tasks Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                            Tasks ({tasks.length})
                        </h2>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Target className="w-4 h-4" />
                                <span>{tasks.filter(task => task.status === 'done').length} completed</span>
                            </div>
                            {/* View Toggle */}
                            <div className="flex items-center gap-1 p-1 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-200">
                                <Button
                                    variant={viewMode === 'board' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('board')}
                                    className="h-8 px-3"
                                >
                                    <Layout className="w-4 h-4 mr-1" />
                                    Board
                                </Button>
                                <Button
                                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('list')}
                                    className="h-8 px-3"
                                >
                                    <List className="w-4 h-4 mr-1" />
                                    List
                                </Button>
                            </div>
                        </div>
                    </div>

                    {tasks.length === 0 ? (
                        <Card className="backdrop-blur-sm bg-white/60 border-0 shadow-lg">
                            <CardContent className="p-12 text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full mx-auto mb-4 flex items-center justify-center">
                                    <Target className="w-8 h-8 text-gray-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No tasks yet</h3>
                                <p className="text-gray-600 mb-6">Get started by creating your first task for this board.</p>
                                <Button 
                                    onClick={() => setCreateTaskOpen(true)}
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create First Task
                                </Button>
                            </CardContent>
                        </Card>
                    ) : viewMode === 'board' ? (
                        <TrelloBoardView
                            boardId={boardId as string}
                            board={board}
                            tasks={tasks}
                            subtasks={subtasks}
                            boardMembers={boardMembers}
                            onEditTask={setEditingTask}
                            onDeleteTask={setDeletingTask}
                            onEditSubtask={(task, subtask) => setEditingSubtask({ task, subtask })}
                            onDeleteSubtask={(task, subtask) => setDeletingSubtask({ task, subtask })}
                            onAddSubtask={handleAddSubtask}
                        />
                    ) : (
                        <div className="space-y-4">
                            {tasks.map((task) => (
                                <Card key={task.id} className="backdrop-blur-sm bg-white/70 border-0 shadow-lg overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-white/20" />
                                    <CardContent className="relative p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Link 
                                        href={`/boards/${boardId}/tasks/${task.id}`}
                                        className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
                                    >
                                        {task.title}
                                    </Link>
                                                    <Badge variant={getStatusVariant(task.status)} className="flex items-center gap-1">
                                                        {getStatusIcon(task.status)}
                                                        {task.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-gray-600 mb-4 leading-relaxed">{task.description}</p>
                                                
                                                {/* Task metadata */}
                                                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>Created {format(new Date(task.createdAt.seconds * 1000), "MMM d, yyyy")}</span>
                                                    </div>
                                                    {task.dueDate && (
                                                        <div className="flex items-center gap-2">
                                                            <AlertCircle className="w-4 h-4" />
                                                            <span>Due {format(new Date(task.dueDate.seconds * 1000), "MMM d, yyyy")}</span>
                                                        </div>
                                                    )}
                                                    {task.assignedTo && (() => {
                                                        const assignedMember = boardMembers.find(m => m.uid === task.assignedTo);
                                                        return assignedMember ? (
                                                            <div className="flex items-center gap-2">
                                                                <User className="w-4 h-4" />
                                                                <span>Assigned to {assignedMember.displayName || assignedMember.email}</span>
                                                            </div>
                                                        ) : null;
                                                    })(                                                    )}
                                                    {task.assignedTo && (() => {
                                                        const assignedMember = boardMembers.find(m => m.uid === task.assignedTo);
                                                        return assignedMember ? (
                                                            <div className="flex items-center gap-2">
                                                                <User className="w-4 h-4" />
                                                                <span>Assigned to {assignedMember.displayName || assignedMember.email}</span>
                                                            </div>
                                                        ) : null;
                                                    })()}
                                                    {subtasks[task.id] && subtasks[task.id].length > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            <span>
                                                                {subtasks[task.id].filter(s => s.status === 'done').length}/{subtasks[task.id].length} subtasks
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 ml-4">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => setEditingTask(task)}
                                                    className="backdrop-blur-sm bg-white/60 border-gray-200 hover:bg-white/80"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => setDeletingTask(task)}
                                                    className="backdrop-blur-sm bg-white/60 border-gray-200 hover:bg-white/80 hover:border-red-300 hover:text-red-600"
                                                >
                                                    <Trash className="w-4 h-4" />
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => toggleTaskOpen(task.id)}
                                                    className="backdrop-blur-sm bg-white/60 border-gray-200 hover:bg-white/80"
                                                >
                                                    <ChevronDown className={`w-4 h-4 transition-transform ${openTasks[task.id] ? 'transform rotate-180' : ''}`} />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Subtasks section */}
                                        {openTasks[task.id] && (
                                            <div className="space-y-4 pt-4 border-t border-gray-200/60">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-lg font-semibold text-gray-900">Subtasks</h4>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        onClick={() => toggleSubtaskForm(task.id)}
                                                        className="backdrop-blur-sm bg-white/60 border-gray-200 hover:bg-white/80"
                                                    >
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Add Subtask
                                                    </Button>
                                                </div>

                                                {/* Create subtask form */}
                                                {openSubtaskForms[task.id] && (
                                                    <div className="p-4 rounded-lg bg-white/60 backdrop-blur-sm border border-gray-200">
                                                        <CreateSubtaskForm 
                                                            boardId={boardId as string}
                                                            taskId={task.id}
                                                            boardMembers={boardMembers}
                                                            boardStatuses={board?.customStatuses && board.customStatuses.length > 0 ? board.customStatuses : [
                                                                { id: 'todo', name: 'To Do', color: 'from-yellow-500 to-orange-600', order: 1 },
                                                                { id: 'in-progress', name: 'In Progress', color: 'from-blue-500 to-cyan-600', order: 2 },
                                                                { id: 'done', name: 'Done', color: 'from-green-500 to-emerald-600', order: 3 }
                                                            ]}
                                                            onSubtaskCreated={handleSubtaskCreated}
                                                            onClose={() => toggleSubtaskForm(task.id)}
                                                        />
                                                    </div>
                                                )}

                                                {/* Subtasks list */}
                                                {subtasks[task.id] && subtasks[task.id].length > 0 ? (
                                                    <div className="space-y-3">
                                                        {subtasks[task.id].map((subtask) => (
                                                            <div key={subtask.id} className="p-4 rounded-lg bg-white/50 backdrop-blur-sm border border-gray-200">
                                                                <div className="flex items-start justify-between">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <h5 className="font-medium text-gray-900">{subtask.title}</h5>
                                                                            <Badge variant={getStatusVariant(subtask.status)} className="flex items-center gap-1 text-xs">
                                                                                {getStatusIcon(subtask.status)}
                                                                                {subtask.status}
                                                                            </Badge>
                                                                        </div>
                                                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                                                            <span>Created {format(new Date(subtask.createdAt.seconds * 1000), "MMM d, yyyy")}</span>
                                                                            {subtask.assignedTo && (() => {
                                                                                const assignedMember = boardMembers.find(m => m.uid === subtask.assignedTo);
                                                                                return assignedMember ? (
                                                                                    <span>Assigned to {assignedMember.displayName || assignedMember.email}</span>
                                                                                ) : null;
                                                                            })()}
                                                                            {subtask.dueDate && (
                                                                                <span>Due {format(new Date(subtask.dueDate.seconds * 1000), "MMM d, yyyy")}</span>
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
                                                                            onClick={() => setEditingSubtask({ task, subtask })}
                                                                            className="backdrop-blur-sm bg-white/60 border-gray-200 hover:bg-white/80"
                                                                        >
                                                                            <Pencil className="w-3 h-3" />
                                                                        </Button>
                                                                        <Button 
                                                                            variant="outline" 
                                                                            size="sm"
                                                                            onClick={() => setDeletingSubtask({ task, subtask })}
                                                                            className="backdrop-blur-sm bg-white/60 border-gray-200 hover:bg-white/80 hover:border-red-300 hover:text-red-600"
                                                                        >
                                                                            <Trash className="w-3 h-3" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8 text-gray-500">
                                                        <p>No subtasks yet. Add one to break down this task.</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Dialogs */}
            <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Task</DialogTitle>
                    </DialogHeader>
                    {editingTask && (
                        <EditTaskForm 
                            task={editingTask}
                            boardId={boardId as string}
                            boardMembers={boardMembers}
                            boardStatuses={board?.customStatuses && board.customStatuses.length > 0 ? board.customStatuses : [
                                { id: 'todo', name: 'To Do', color: 'from-yellow-500 to-orange-600', order: 1 },
                                { id: 'in-progress', name: 'In Progress', color: 'from-blue-500 to-cyan-600', order: 2 },
                                { id: 'done', name: 'Done', color: 'from-green-500 to-emerald-600', order: 3 }
                            ]}
                            onTaskUpdated={handleTaskUpdated}
                            onClose={() => setEditingTask(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!editingSubtask} onOpenChange={(open) => !open && setEditingSubtask(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Subtask</DialogTitle>
                    </DialogHeader>
                    {editingSubtask && (
                        <EditSubtaskForm 
                            subtask={editingSubtask.subtask}
                            boardId={boardId as string}
                            taskId={editingSubtask.task.id}
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

            <Dialog open={isCreateTaskOpen} onOpenChange={setCreateTaskOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Create New Task</DialogTitle>
                    </DialogHeader>
                    <CreateTaskForm 
                        boardId={boardId as string}
                        boardMembers={boardMembers}
                        boardStatuses={board?.customStatuses && board.customStatuses.length > 0 ? board.customStatuses : [
                            { id: 'todo', name: 'To Do', color: 'from-yellow-500 to-orange-600', order: 1 },
                            { id: 'in-progress', name: 'In Progress', color: 'from-blue-500 to-cyan-600', order: 2 },
                            { id: 'done', name: 'Done', color: 'from-green-500 to-emerald-600', order: 3 }
                        ]}
                        onTaskCreated={handleTaskCreated}
                        onClose={() => setCreateTaskOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Add Subtask Dialog for Board View */}
            {Object.entries(openSubtaskForms).map(([taskId, isOpen]) => {
                const task = tasks.find(t => t.id === taskId);
                if (!isOpen || !task) return null;
                
                return (
                    <Dialog key={taskId} open={isOpen} onOpenChange={() => toggleSubtaskForm(taskId)}>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Add Subtask to {task.title}</DialogTitle>
                            </DialogHeader>
                            <CreateSubtaskForm 
                                boardId={boardId as string}
                                taskId={taskId}
                                boardMembers={boardMembers}
                                boardStatuses={board?.customStatuses && board.customStatuses.length > 0 ? board.customStatuses : [
                                    { id: 'todo', name: 'To Do', color: 'from-yellow-500 to-orange-600', order: 1 },
                                    { id: 'in-progress', name: 'In Progress', color: 'from-blue-500 to-cyan-600', order: 2 },
                                    { id: 'done', name: 'Done', color: 'from-green-500 to-emerald-600', order: 3 }
                                ]}
                                onSubtaskCreated={() => {
                                    handleSubtaskCreated();
                                    toggleSubtaskForm(taskId);
                                }}
                                onClose={() => toggleSubtaskForm(taskId)}
                            />
                        </DialogContent>
                    </Dialog>
                );
            })}

            <Dialog open={isInviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invite Member to Board</DialogTitle>
                    </DialogHeader>
                    <InviteMemberForm 
                        boardId={boardId as string}
                        onInviteSent={fetchMembers}
                        onClose={() => setInviteDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            <ManageMembersDialog 
                isOpen={isManageMembersOpen}
                onClose={() => setManageMembersOpen(false)}
                boardId={boardId as string}
                isOwner={isOwner || false}
            />

            <ConfirmationDialog
                open={!!deletingTask}
                onOpenChange={(open) => !open && setDeletingTask(null)}
                title="Delete Task"
                description={`Are you sure you want to delete '${deletingTask?.title}'? This will also delete all subtasks and cannot be undone.`}
                onConfirm={handleDeleteTask}
            />

            <ConfirmationDialog
                open={!!deletingSubtask}
                onOpenChange={(open) => !open && setDeletingSubtask(null)}
                title="Delete Subtask"
                description={`Are you sure you want to delete '${deletingSubtask?.subtask.title}'? This cannot be undone.`}
                onConfirm={handleDeleteSubtask}
            />
        </div>
        </AuthGuard>
    );
};

export default BoardClientPage; 