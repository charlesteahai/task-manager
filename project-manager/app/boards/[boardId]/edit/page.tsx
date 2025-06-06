"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getFirebaseServices } from "@/lib/firebase";
import { Board } from "@/types";
import { useAuth } from "@/app/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Settings, Sparkles, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { Label } from "@/components/ui/label";

const { db } = getFirebaseServices();

const EditBoardPage = () => {
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
      await updateDoc(docRef, { name, description });
      router.push(`/boards/${boardId}`);
    } catch (err: unknown) {
      setError("Failed to update board. Please try again.");
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !board) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <Card className="backdrop-blur-sm bg-white/70 border-0 shadow-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </Card>
      </div>
    );
  }

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
  );
};

export default EditBoardPage; 