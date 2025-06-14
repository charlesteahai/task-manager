"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getFirebaseServices } from "@/lib/firebase";
import { Board, BoardStatus } from "@/types";
import { useAuth } from "@/app/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { AuthGuard } from "@/components/AuthGuard";
import { Settings, Sparkles, ArrowLeft, Save, Plus, Trash, Edit, Palette } from "lucide-react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const { db } = getFirebaseServices();

const EditBoardClientPage = () => {
  const params = useParams();
  const router = useRouter();
  const { boardId } = params;
  const { user } = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [customStatuses, setCustomStatuses] = useState<BoardStatus[]>([]);
  const [editingStatus, setEditingStatus] = useState<BoardStatus | null>(null);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("from-gray-500 to-gray-600");
  const [editStatusName, setEditStatusName] = useState("");
  const [editStatusColor, setEditStatusColor] = useState("from-gray-500 to-gray-600");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editDialogOpenId, setEditDialogOpenId] = useState<string | null>(null);

  useEffect(() => {
    const fetchBoard = async () => {
      if (boardId) {
        try {
          const docRef = doc(db, "boards", boardId as string);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const boardData = { id: docSnap.id, ...docSnap.data() } as Board;
            setBoard(boardData);
            setName(boardData.name);
            setDescription(boardData.description || "");
            setCustomStatuses(boardData.customStatuses || []);
          } else {
            setError("Board not found.");
          }
        } catch (err: unknown) {
          setError("Failed to fetch board data.");
          console.error(err);
        }
      }
      setLoading(false);
    };

    fetchBoard();
  }, [boardId]);

  const handleUpdateBoard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user || (board && user.uid !== board.owner)) {
      setError("You do not have permission to edit this board.");
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const docRef = doc(db, "boards", boardId as string);
      await updateDoc(docRef, { 
        name, 
        description, 
        customStatuses: customStatuses.length > 0 ? customStatuses : null 
      });
      router.push(`/boards/${boardId}`);
    } catch (err: unknown) {
      setError("Failed to update board. Please try again.");
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddStatus = () => {
    if (!newStatusName.trim()) return;
    
    const newStatus: BoardStatus = {
      id: `custom-${Date.now()}`,
      name: newStatusName.trim(),
      color: newStatusColor,
      order: customStatuses.length
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

  return (
    <AuthGuard>
      {loading ? (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error && !board ? (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
          <Card className="backdrop-blur-sm bg-white/70 border-0 shadow-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button asChild>
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </Card>
        </div>
      ) : (
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
            <Link href={`/boards/${boardId}`} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to {board?.name || 'Board'}
            </Link>
          </Button>
        </div>

        {/* Edit Board Form */}
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
              Edit Board
            </h1>
            <p className="text-gray-600 text-lg">
              Update your board details and settings
            </p>
          </div>

          <Card className="backdrop-blur-sm bg-white/70 border-0 shadow-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10" />
            <CardHeader className="relative text-center pb-6">
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                Board Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="relative p-8 pt-0">
              <form onSubmit={handleUpdateBoard} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Board Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    placeholder="Enter your board name..."
                    required
                    className="h-12 backdrop-blur-sm bg-white/50 border-white/20 focus:bg-white/70 transition-all duration-200"
                    disabled={isUpdating}
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
                    disabled={isUpdating}
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
                  
                  {/* Current Statuses */}
                  <div className="space-y-2">
                    {/* Default Statuses - Show only when no custom statuses */}
                    {customStatuses.length === 0 && (
                      <div className="space-y-2 mb-4">
                        <h4 className="text-sm font-medium text-gray-600">Default Statuses</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {[
                            { id: 'todo', name: 'To Do', color: 'from-yellow-500 to-orange-600' },
                            { id: 'in-progress', name: 'In Progress', color: 'from-blue-500 to-cyan-600' },
                            { id: 'done', name: 'Done', color: 'from-green-500 to-emerald-600' }
                          ].map((status) => (
                            <div
                              key={status.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-white/40 border border-gray-200/40"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 bg-gradient-to-br ${status.color} rounded-lg`} />
                                <span className="text-sm font-medium text-gray-700">{status.name}</span>
                              </div>
                              <span className="text-xs text-gray-500">Default</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Custom Statuses */}
                    {customStatuses.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-600">Custom Statuses</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {customStatuses.map((status) => (
                            <div
                              key={status.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-white/60 border border-gray-200/60"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 bg-gradient-to-br ${status.color} rounded-lg`} />
                                <span className="text-sm font-medium text-gray-900">{status.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Dialog open={editDialogOpenId === status.id} onOpenChange={(open) => setEditDialogOpenId(open ? status.id : null)}>
                                  <DialogTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleEditStatus(status)}
                                    >
                                      <Edit className="h-3 w-3" />
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
                                  size="icon"
                                  className="h-6 w-6 text-red-500 hover:text-red-700"
                                  onClick={() => handleDeleteStatus(status.id)}
                                >
                                  <Trash className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500 bg-gray-50/50 rounded-lg border border-dashed border-gray-300">
                        <Plus className="w-6 h-6 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No custom statuses yet</p>
                        <p className="text-xs">Click Add Status to create custom workflow states</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Default Statuses Info */}
                  <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200/60">
                    <p className="text-xs text-blue-700">
                      <strong>Note:</strong> The default statuses To Do, In Progress, and Done will always be available alongside your custom statuses.
                    </p>
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
                    disabled={isUpdating || !name.trim()}
                    className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Update Board
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    asChild
                    className="backdrop-blur-sm bg-white/50 border-white/20 hover:bg-white/70 transition-all duration-200"
                    disabled={isUpdating}
                  >
                    <Link href={`/boards/${boardId}`}>Cancel</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Help Text */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              Changes will be visible to all board members immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
      )}
    </AuthGuard>
  );
};

export default EditBoardClientPage; 