"use client";

import { useState, useEffect, useCallback } from "react";
import { getFirebaseServices } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayRemove } from "firebase/firestore";
import { BoardMember } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Crown, UserMinus, Loader2 } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const { db } = getFirebaseServices();

interface ManageMembersDialogProps {
    isOpen: boolean;
    onClose: () => void;
    boardId: string;
    isOwner: boolean;
}
  
export const ManageMembersDialog = ({ isOpen, onClose, boardId, isOwner }: ManageMembersDialogProps) => {
    const [members, setMembers] = useState<BoardMember[]>([]);
    const [owner, setOwner] = useState<BoardMember | null>(null);
    const [loading, setLoading] = useState(false);
    const [removingMember, setRemovingMember] = useState<BoardMember | null>(null);

    const fetchMembers = useCallback(async () => {
        if (!isOpen) return;
        setLoading(true);
        try {
            // Get board data
            const boardDoc = await getDoc(doc(db, 'boards', boardId));
            if (!boardDoc.exists()) {
                toast.error("Board not found.");
                return;
            }
            
            const boardData = boardDoc.data();
            const memberIds = boardData.members || [];
            const ownerId = boardData.owner;
            
            // Fetch user details for all members
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
            
            const membersList = await Promise.all(memberPromises);
            const validMembers = membersList.filter((member): member is BoardMember => member !== null);
            
            // Get owner details
            const ownerDoc = await getDoc(doc(db, 'users', ownerId));
            if (ownerDoc.exists()) {
                const ownerData = ownerDoc.data();
                setOwner({
                    uid: ownerId,
                    email: ownerData.email,
                    displayName: ownerData.displayName,
                    photoURL: ownerData.photoURL,
                } as BoardMember);
            }
            
            setMembers(validMembers);
        } catch (error) {
            console.error("Error fetching board members:", error);
            toast.error("Failed to fetch members.");
        } finally {
            setLoading(false);
        }
    }, [isOpen, boardId]);
  
    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    const handleRemoveMember = async () => {
        if (!removingMember) return;
        try {
            // Remove user from board members array
            const boardRef = doc(db, 'boards', boardId);
            await updateDoc(boardRef, {
                members: arrayRemove(removingMember.uid)
            });
            
            toast.success(`Removed ${removingMember.displayName || removingMember.email} from the board.`);
            setRemovingMember(null);
            fetchMembers(); // Refresh the list
        } catch (error: unknown) {
            console.error("Error removing member:", error);
            if (error instanceof Error) {
                toast.error("Failed to remove member.", { description: error.message });
            } else {
                toast.error("An unknown error occurred while removing the member.");
            }
        }
    };
  
    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="backdrop-blur-sm bg-white/95 border-0 shadow-2xl max-w-md">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 rounded-lg" />
                    <DialogHeader className="relative">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                                Manage Board Members
                            </DialogTitle>
                        </div>
                    </DialogHeader>
                    <div className="relative">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="flex items-center gap-3 text-gray-600">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Loading members...</span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {members.map(member => (
                                    <div key={member.uid} className="backdrop-blur-sm bg-white/60 rounded-xl p-4 border border-white/30 hover:bg-white/70 transition-all duration-200">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 border-2 border-white shadow-md">
                                                    <AvatarImage src={member.photoURL ?? undefined} alt={member.displayName ?? member.email} />
                                                    <AvatarFallback className="bg-gradient-to-br from-gray-100 to-gray-200 text-sm font-medium">
                                                        {member.displayName?.charAt(0) ?? member.email?.charAt(0)?.toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900">{member.displayName ?? 'No Name'}</p>
                                                    <p className="text-sm text-gray-600">{member.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {member.uid === owner?.uid ? (
                                                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white border-0 shadow-md">
                                                        <Crown className="w-3 h-3 mr-1" />
                                                        Owner
                                                    </Badge>
                                                ) : isOwner ? (
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => setRemovingMember(member)}
                                                        className="backdrop-blur-sm bg-red-500/10 border-red-200/20 hover:bg-red-500/20 text-red-600 transition-all duration-200"
                                                    >
                                                        <UserMinus className="w-4 h-4 mr-1" />
                                                        Remove
                                                    </Button>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-white/50 text-gray-600">
                                                        Member
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {members.length === 0 && (
                                    <div className="text-center py-6">
                                        <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                                            <Users className="w-6 h-6 text-white" />
                                        </div>
                                        <p className="text-gray-600 font-medium">No members found</p>
                                        <p className="text-sm text-gray-500 mt-1">Invite members to collaborate on this board</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            {removingMember && (
                <AlertDialog open={!!removingMember} onOpenChange={(open) => !open && setRemovingMember(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently remove <strong>{removingMember.displayName || removingMember.email}</strong> from the board.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleRemoveMember}>Confirm</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}; 