"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Board } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/Header";
import { AuthGuard } from "@/components/AuthGuard";
import { 
  Plus, 
  Calendar, 
  Users, 
  FolderOpen,
  TrendingUp,
  Target
} from "lucide-react";
import { format } from "date-fns";

const { db } = getFirebaseServices();

const DashboardPage = () => {
  const { user } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBoards = async () => {
      if (user) {
        try {
          const q = query(collection(db, "boards"), where("members", "array-contains", user.uid));
          const querySnapshot = await getDocs(q);
          const userBoards = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board));
          setBoards(userBoards);
        } catch (error) {
          console.error("Error fetching boards: ", error);
        }
      }
      setLoading(false);
    };

    fetchBoards();
  }, [user]);

  const stats = [
    { 
      title: "Total Boards", 
      value: boards.length, 
      icon: FolderOpen, 
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50 to-cyan-50"
    },
    { 
      title: "Active Projects", 
      value: boards.length, 
      icon: Target, 
      gradient: "from-green-500 to-emerald-500",
      bgGradient: "from-green-50 to-emerald-50"
    },
    { 
      title: "Team Members", 
      value: boards.reduce((acc, board) => acc + (board.members?.length || 0), 0), 
      icon: Users, 
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-50 to-pink-50"
    },
    { 
      title: "This Month", 
      value: boards.filter(board => {
        if (!board.createdAt) return false;
        const boardDate = board.createdAt?.toDate ? board.createdAt.toDate() : new Date(board.createdAt as unknown as string);
        const now = new Date();
        return boardDate.getMonth() === now.getMonth() && boardDate.getFullYear() === now.getFullYear();
      }).length, 
      icon: TrendingUp, 
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-50 to-red-50"
    }
  ];

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
        {/* Welcome Header */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
                Welcome back, {user?.displayName || user?.email?.split('@')[0] || 'there'}! 👋
              </h1>
              <p className="text-gray-600 text-lg">
                Manage your projects and collaborate with your team
              </p>
            </div>
            <Button 
              asChild 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-6"
            >
              <Link href="/boards/create" className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Board
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, index) => (
            <Card key={index} className="backdrop-blur-sm bg-white/70 border-0 shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden group">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-50 group-hover:opacity-70 transition-opacity duration-200`} />
              <CardContent className="relative p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Boards Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Your Boards
            </h2>
          </div>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="backdrop-blur-sm bg-white/70 border-0 shadow-lg">
                <CardHeader className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {boards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {boards.map((board, index) => (
                  <Link href={`/boards/${board.id}`} key={board.id}>
                    <Card className="backdrop-blur-sm bg-white/70 border-0 shadow-lg hover:shadow-xl transition-all duration-200 group cursor-pointer overflow-hidden h-full">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      <CardHeader className="relative p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                            index % 4 === 0 ? 'from-blue-500 to-cyan-500' :
                            index % 4 === 1 ? 'from-green-500 to-emerald-500' :
                            index % 4 === 2 ? 'from-purple-500 to-pink-500' :
                            'from-orange-500 to-red-500'
                          } flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                            <FolderOpen className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Users className="w-4 h-4" />
                            <span>{board.members?.length || 0}</span>
                          </div>
                        </div>
                        
                        <CardTitle className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-200">
                          {board.name}
                        </CardTitle>
                        
                        <CardDescription className="text-gray-600 mb-4 line-clamp-2">
                          {board.description || "No description provided"}
                        </CardDescription>
                        
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                                                         <span>
                               {board.createdAt ? format(
                                 board.createdAt?.toDate ? board.createdAt.toDate() : new Date(board.createdAt as unknown as string), 
                                 'MMM dd'
                               ) : 'Recently'}
                             </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Active</span>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="col-span-full">
                <Card className="backdrop-blur-sm bg-white/70 border-0 shadow-lg text-center py-16">
                  <CardContent>
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FolderOpen className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No boards yet</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Create your first board to start organizing your projects and collaborating with your team.
                    </p>
                    <Button 
                      asChild 
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <Link href="/boards/create" className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Create Your First Board
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </AuthGuard>
  );
};

export default DashboardPage; 