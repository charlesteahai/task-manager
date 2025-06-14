"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import { getFirebaseServices } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { AuthGuard } from "@/components/AuthGuard";
import { FolderPlus, Sparkles, ArrowLeft, Save, Plus, Trash, Edit, Palette } from "lucide-react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BoardStatus } from "@/types";

const { db } = getFirebaseServices();

const CreateBoardPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [customStatuses, setCustomStatuses] = useState<BoardStatus[]>([
    { id: 'todo', name: 'To Do', color: 'from-yellow-500 to-orange-600', order: 1 },
    { id: 'in-progress', name: 'In Progress', color: 'from-blue-500 to-cyan-600', order: 2 },
    { id: 'done', name: 'Done', color: 'from-green-500 to-emerald-600', order: 3 }
  ]);
  const [editingStatus, setEditingStatus] = useState<BoardStatus | null>(null);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("from-gray-500 to-gray-600");
  const [editStatusName, setEditStatusName] = useState("");
  const [editStatusColor, setEditStatusColor] = useState("from-gray-500 to-gray-600");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editDialogOpenId, setEditDialogOpenId] = useState<string | null>(null);

  const handleAddStatus = () => {
    if (!newStatusName.trim()) return;
    
    const newStatus: BoardStatus = {
      id: `status-${Date.now()}`,
      name: newStatusName.trim(),
      color: newStatusColor,
      order: customStatuses.length + 1
    };
    
    setCustomStatuses([...customStatuses, newStatus]);
    setNewStatusName("");
    setNewStatusColor("from-gray-500 to-gray-600");
    setIsAddDialogOpen(false); // Close dialog
  };

  const handleEditStatus = (status: BoardStatus) => {
    setEditingStatus(status);
    setEditStatusName(status.name);
    setEditStatusColor(status.color);
    setEditDialogOpenId(status.id); // Open edit dialog for this specific status
  };

  const handleUpdateStatus = () => {
    if (!editingStatus || !editStatusName.trim()) return;
    
    setCustomStatuses(customStatuses.map(status => 
      status.id === editingStatus.id 
        ? { ...status, name: editStatusName.trim(), color: editStatusColor }
        : status
    ));
    
    setEditingStatus(null);
    setEditStatusName("");
    setEditStatusColor("from-gray-500 to-gray-600");
    setEditDialogOpenId(null); // Close dialog
  };

  const handleDeleteStatus = (statusId: string) => {
    setCustomStatuses(customStatuses.filter(status => status.id !== statusId));
  };

  const handleCancelAdd = () => {
    setNewStatusName("");
    setNewStatusColor("from-gray-500 to-gray-600");
    setIsAddDialogOpen(false);
  };

  const handleCancelEdit = () => {
    setEditingStatus(null);
    setEditStatusName("");
    setEditStatusColor("from-gray-500 to-gray-600");
    setEditDialogOpenId(null);
  };

  const availableColors = [
    "from-gray-500 to-gray-600",
    "from-red-500 to-red-600", 
    "from-orange-500 to-orange-600",
    "from-yellow-500 to-yellow-600",
    "from-green-500 to-green-600",
    "from-teal-500 to-teal-600",
    "from-blue-500 to-blue-600",
    "from-indigo-500 to-indigo-600",
    "from-purple-500 to-purple-600",
    "from-pink-500 to-pink-600"
  ];

  const handleCreateBoard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to create a board.");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await addDoc(collection(db, "boards"), {
        name,
        description,
        owner: user.uid,
        members: [user.uid],
        customStatuses: customStatuses,
        createdAt: serverTimestamp(),
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("Error creating board: ", err);
      setError("Failed to create board. Please try again.");
    } finally {
      setIsCreating(false);
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
        {/* Navigation */}
        <div className="mb-8">
          <Button 
            asChild 
            variant="ghost" 
            className="mb-6 text-gray-600 hover:text-gray-900 hover:bg-white/50"
          >
            <Link href="/dashboard" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        {/* Create Board Form */}
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <FolderPlus className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
              Create New Board
            </h1>
            <p className="text-gray-600 text-lg">
              Start organizing your project with a new board
            </p>
          </div>

          <Card className="backdrop-blur-sm bg-white/70 border-0 shadow-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10" />
            <CardHeader className="relative text-center pb-6">
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                Board Details
              </CardTitle>
            </CardHeader>
            <CardContent className="relative p-8 pt-0">
              <form onSubmit={handleCreateBoard} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <FolderPlus className="w-4 h-4" />
                    Board Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    placeholder="Enter your board name..."
                    required
                    className="h-12 backdrop-blur-sm bg-white/50 border-white/20 focus:bg-white/70 transition-all duration-200"
                    disabled={isCreating}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                    placeholder="Describe your board and its purpose..."
                    rows={4}
                    className="backdrop-blur-sm bg-white/50 border-white/20 focus:bg-white/70 transition-all duration-200 resize-none"
                    disabled={isCreating}
                  />
                </div>

                {/* Custom Status Management */}
                <div className="space-y-4 pt-6 border-t border-gray-200/60">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Custom Status Options
                    </Label>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="backdrop-blur-sm bg-white/50 border-white/20 hover:bg-white/70"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Status
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="backdrop-blur-sm bg-white/95">
                        <DialogHeader>
                          <DialogTitle>Add New Status</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="statusName">Status Name</Label>
                            <Input
                              id="statusName"
                              value={newStatusName}
                              onChange={(e) => setNewStatusName(e.target.value)}
                              placeholder="Enter status name..."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Color</Label>
                            <div className="grid grid-cols-5 gap-2">
                              {availableColors.map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => setNewStatusColor(color)}
                                  className={`w-10 h-10 bg-gradient-to-br ${color} rounded-lg border-2 transition-all ${
                                    newStatusColor === color 
                                      ? 'border-gray-900 scale-110' 
                                      : 'border-gray-200 hover:scale-105'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={handleCancelAdd}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              onClick={handleAddStatus}
                              disabled={!newStatusName.trim()}
                            >
                              Add Status
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {customStatuses.map((status) => (
                      <div
                        key={status.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/50 border border-gray-200/60"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${status.color}`} />
                          <span className="text-sm font-medium text-gray-700">{status.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Dialog open={editDialogOpenId === status.id} onOpenChange={(open) => setEditDialogOpenId(open ? status.id : null)}>
                            <DialogTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditStatus(status)}
                                className="h-6 w-6 p-0 hover:bg-gray-100"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="backdrop-blur-sm bg-white/95">
                              <DialogHeader>
                                <DialogTitle>Edit Status</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="editStatusName">Status Name</Label>
                                  <Input
                                    id="editStatusName"
                                    value={editStatusName}
                                    onChange={(e) => setEditStatusName(e.target.value)}
                                    placeholder="Enter status name"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Color</Label>
                                  <div className="grid grid-cols-5 gap-2">
                                    {availableColors.map((color) => (
                                      <button
                                        key={color}
                                        type="button"
                                        onClick={() => setEditStatusColor(color)}
                                        className={`w-10 h-10 bg-gradient-to-br ${color} rounded-lg border-2 transition-all ${
                                          editStatusColor === color 
                                            ? 'border-gray-900 scale-110' 
                                            : 'border-gray-200 hover:scale-105'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleCancelEdit}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={handleUpdateStatus}
                                    disabled={!editStatusName.trim()}
                                  >
                                    Update Status
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStatus(status.id)}
                            className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                          >
                            <Trash className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="submit" 
                    disabled={isCreating || !name.trim()}
                    className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                  >
                    {isCreating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Create Board
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    asChild
                    className="backdrop-blur-sm bg-white/50 border-white/20 hover:bg-white/70 transition-all duration-200"
                    disabled={isCreating}
                  >
                    <Link href="/dashboard">Cancel</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Help Text */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              Your board will be created with you as the owner. You can invite team members later.
            </p>
          </div>
        </div>
      </div>
    </div>
    </AuthGuard>
  );
};

export default CreateBoardPage; 