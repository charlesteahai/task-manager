"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, deleteDoc, writeBatch, getDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseServices } from "@/lib/firebase";
import { Task, Subtask, BoardMember, Board } from "@/types";
import { useAuth } from "@/app/contexts/AuthContext";
import { useRealtimeData } from "@/app/contexts/RealtimeDataContext";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CreateSubtaskForm } from "@/components/CreateSubtaskForm";
import { ChevronDown, Plus, Pencil, Trash, UserPlus, Users, User, Settings, FolderOpen, CheckCircle2, Clock, AlertCircle, Calendar, Target } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const { db } = getFirebaseServices();

const BoardDetailPage = () => {
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

    const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
    useEffect(() => {
        if (board) {
            const fetchMembers = async () => {
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
            };
            fetchMembers();
        }
    }, [board, boardId]);

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
    
    return (
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
                                                        board.createdAt?.toDate ? board.createdAt.toDate() : new Date(board.createdAt as any), 
                                                        'MMM dd, yyyy'
                                                    ) : 'Recently'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3 flex-wrap">
                                    <Button 
                                        onClick={() => setCreateTaskOpen(true)}
                                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create Task
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setManageMembersOpen(true)}
                                        className="backdrop-blur-sm bg-white/50 border-white/20 hover:bg-white/70 transition-all duration-200"
                                    >
                                        <Users className="mr-2 h-4 w-4" /> 
                                        Members
                                    </Button>
                                    {isOwner && (
                                        <>
                                            <Button 
                                                variant="outline" 
                                                onClick={() => setInviteDialogOpen(true)}
                                                className="backdrop-blur-sm bg-white/50 border-white/20 hover:bg-white/70 transition-all duration-200"
                                            >
                                                <UserPlus className="mr-2 h-4 w-4" /> 
                                                Invite
                                            </Button>
                                            <Button 
                                                asChild 
                                                variant="outline"
                                                className="backdrop-blur-sm bg-white/50 border-white/20 hover:bg-white/70 transition-all duration-200"
                                            >
                                                <Link href={`/boards/${boardId}/edit`}>
                                                    <Settings className="mr-2 h-4 w-4" />
                                                    Edit
                                                </Link>
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Task Statistics */}
                <div className="mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            {
                                title: "Total Tasks",
                                value: tasks.length,
                                icon: Target,
                                gradient: "from-blue-600 to-indigo-600"
                            },
                            {
                                title: "Todo",
                                value: tasks.filter(t => t.status === 'todo').length,
                                icon: AlertCircle,
                                gradient: "from-yellow-500 to-orange-600"
                            },
                            {
                                title: "In Progress",
                                value: tasks.filter(t => t.status === 'in-progress').length,
                                icon: Clock,
                                gradient: "from-blue-500 to-cyan-600"
                            },
                            {
                                title: "Completed",
                                value: tasks.filter(t => t.status === 'done').length,
                                icon: CheckCircle2,
                                gradient: "from-green-500 to-emerald-600"
                            }
                        ].map((stat, index) => (
                            <Card key={index} className="backdrop-blur-sm bg-white/70 border-0 shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden group cursor-pointer">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10" />
                                <CardContent className="relative p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                                            <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                                                {stat.value}
                                            </div>
                                        </div>
                                        <div className={`w-12 h-12 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                                            <stat.icon className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Tasks Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                            <Target className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                            Tasks
                        </h2>
                    </div>
                    
                    {tasks.length > 0 ? tasks.map(task => {
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
                            <Card key={task.id} className="backdrop-blur-sm bg-white/70 border-0 shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10" />
                                <CardContent className="relative p-6">
                                    <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => toggleTaskOpen(task.id)} 
                                                className="mt-1 hover:bg-white/50 transition-colors duration-200"
                                                aria-label={openTasks[task.id] ? "Collapse task details" : "Expand task details"}
                                            >
                                                <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${openTasks[task.id] ? 'rotate-180' : ''}`} />
                                            </Button>
                                            <div className={`w-10 h-10 bg-gradient-to-br ${statusConfig.color} rounded-xl flex items-center justify-center shadow-lg`}>
                                                <statusConfig.icon className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
                                                    {task.title}
                                                </h3>
                                                <p className="text-gray-600 mb-3">{task.description}</p>
                                                <div className="flex items-center gap-4 flex-wrap">
                                                    <Badge 
                                                        variant={getStatusVariant(task.status)}
                                                        className="capitalize"
                                                    >
                                                        {task.status.replace('-', ' ')}
                                                    </Badge>
                                                    {task.dueDate && (
                                                        <div className="flex items-center gap-1 text-sm text-gray-500">
                                                            <Calendar className="w-4 h-4" />
                                                            <span>Due {format(task.dueDate.toDate(), "MMM d, yyyy")}</span>
                                                        </div>
                                                    )}
                                                    {subtasks[task.id] && subtasks[task.id].length > 0 && (
                                                        <div className="flex items-center gap-1 text-sm text-gray-500">
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            <span>{subtasks[task.id].filter(s => s.status === 'done').length}/{subtasks[task.id].length} subtasks</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2 flex-wrap">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => setEditingTask(task)}
                                                className="backdrop-blur-sm bg-white/50 border-white/20 hover:bg-white/70 transition-all duration-200"
                                            >
                                                <Pencil className="h-4 w-4 mr-2" /> 
                                                Edit
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => toggleSubtaskForm(task.id)}
                                                className="backdrop-blur-sm bg-white/50 border-white/20 hover:bg-white/70 transition-all duration-200"
                                            >
                                                <Plus className="h-4 w-4 mr-2" /> 
                                                Add Subtask
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => setDeletingTask(task)}
                                                className="backdrop-blur-sm bg-red-500/10 border-red-200/20 hover:bg-red-500/20 text-red-600 transition-all duration-200"
                                            >
                                                <Trash className="h-4 w-4 mr-2" /> 
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    {openSubtaskForms[task.id] && (
                                        <div className="mt-6 pl-14">
                                            <div className="backdrop-blur-sm bg-white/60 rounded-xl p-4 border border-white/30">
                                                <CreateSubtaskForm
                                                    boardId={boardId as string}
                                                    taskId={task.id}
                                                    onSubtaskCreated={handleSubtaskCreated}
                                                    onClose={() => toggleSubtaskForm(task.id)}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {openTasks[task.id] && (
                                        <div className="mt-6 pl-14 space-y-3">
                                            {subtasks[task.id] && subtasks[task.id].length > 0 ? subtasks[task.id].map(subtask => {
                                                const assignedMember = boardMembers.find(m => m.uid === subtask.assignedTo);
                                                const subtaskStatusConfig = getStatusIcon(subtask.status);
                                                
                                                return (
                                                    <div key={subtask.id} className="backdrop-blur-sm bg-white/60 rounded-xl p-4 border border-white/30 hover:bg-white/70 transition-all duration-200">
                                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                                            <div className="flex items-center gap-3 flex-1">
                                                                <div className={`w-8 h-8 bg-gradient-to-br ${subtaskStatusConfig.color} rounded-lg flex items-center justify-center shadow-md`}>
                                                                    <subtaskStatusConfig.icon className="w-4 h-4 text-white" />
                                                                </div>
                                                                {assignedMember ? (
                                                                    <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
                                                                        <AvatarImage src={assignedMember.photoURL || undefined} />
                                                                        <AvatarFallback className="text-xs bg-gradient-to-br from-gray-100 to-gray-200">
                                                                            {assignedMember.displayName?.[0] || assignedMember.email?.[0]?.toUpperCase()}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                ) : (
                                                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-2 border-white shadow-sm">
                                                                        <User className="h-4 w-4 text-gray-500" />
                                                                    </div>
                                                                )}
                                                                                                                                 <div>
                                                                     <span className="font-medium text-gray-900">{subtask.title}</span>
                                                                 </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                                <Badge variant={getStatusVariant(subtask.status)} className="capitalize">
                                                                    {subtask.status.replace('-', ' ')}
                                                                </Badge>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    onClick={() => setEditingSubtask({ task, subtask })} 
                                                                    className="hover:bg-white/50 transition-colors duration-200"
                                                                    aria-label={`Edit subtask ${subtask.title}`}
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    onClick={() => setDeletingSubtask({ task, subtask })} 
                                                                    className="hover:bg-red-500/10 text-red-600 transition-colors duration-200"
                                                                    aria-label={`Delete subtask ${subtask.title}`}
                                                                >
                                                                    <Trash className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }) : (
                                                <div className="backdrop-blur-sm bg-white/40 rounded-xl p-6 text-center border border-white/30">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                                                        <Plus className="w-6 h-6 text-white" />
                                                    </div>
                                                    <p className="text-gray-600 font-medium mb-2">No subtasks yet</p>
                                                    <p className="text-sm text-gray-500">Create subtasks to break down this task into smaller pieces</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    }) : (
                        <Card className="backdrop-blur-sm bg-white/70 border-0 shadow-lg overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10" />
                            <CardContent className="relative p-12 text-center">
                                <div className="max-w-md mx-auto">
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                                        <Target className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-3">
                                        No tasks yet
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        Get started by creating your first task for this board
                                    </p>
                                    <Button 
                                        onClick={() => setCreateTaskOpen(true)} 
                                        size="lg"
                                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                                    >
                                        <Plus className="w-5 h-5 mr-2" />
                                        Create First Task
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
                
                <Dialog open={isCreateTaskOpen} onOpenChange={setCreateTaskOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create a new task</DialogTitle>
                        </DialogHeader>
                        <CreateTaskForm 
                            boardId={boardId as string}
                            onTaskCreated={handleTaskCreated}
                            onClose={() => setCreateTaskOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
                
                {editingTask && (
                    <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit Task</DialogTitle>
                            </DialogHeader>
                            <EditTaskForm 
                                boardId={boardId as string}
                                task={editingTask}
                                onTaskUpdated={handleTaskUpdated}
                                onClose={() => setEditingTask(null)}
                            />
                        </DialogContent>
                    </Dialog>
                )}

            {editingSubtask && (
                <Dialog open={!!editingSubtask} onOpenChange={(open) => !open && setEditingSubtask(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Subtask</DialogTitle>
                        </DialogHeader>
                        <EditSubtaskForm
                            boardId={boardId as string}
                            taskId={editingSubtask.task.id}
                            subtask={editingSubtask.subtask}
                            onSubtaskUpdated={handleSubtaskUpdated}
                            onClose={() => setEditingSubtask(null)}
                        />
                    </DialogContent>
                </Dialog>
            )}

            <ConfirmationDialog
                open={!!deletingTask}
                onOpenChange={(open) => !open && setDeletingTask(null)}
                onConfirm={handleDeleteTask}
                title="Are you absolutely sure?"
                description={<>This action cannot be undone. This will permanently delete the task: <strong>{deletingTask?.title}</strong> and all its subtasks.</>}
            />
            
            <ConfirmationDialog
                open={!!deletingSubtask}
                onOpenChange={(open) => !open && setDeletingSubtask(null)}
                onConfirm={handleDeleteSubtask}
                title="Are you absolutely sure?"
                description={<>This action cannot be undone. This will permanently delete the subtask: <strong>{deletingSubtask?.subtask.title}</strong>.</>}
            />

            <Dialog open={isInviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invite a member</DialogTitle>
                    </DialogHeader>
                    <InviteMemberForm
                        boardId={boardId as string}
                        onInviteSent={() => {
                            setInviteDialogOpen(false);
                        }}
                        onClose={() => setInviteDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            <ManageMembersDialog 
                isOpen={isManageMembersOpen}
                onClose={() => setManageMembersOpen(false)}
                boardId={boardId as string}
                isOwner={!!isOwner}
            />
            </div>
        </div>
    );
};

export default BoardDetailPage; 