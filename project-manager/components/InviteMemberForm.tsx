import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, Mail, Loader2 } from "lucide-react";
import { getFirebaseServices } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { useAuth } from "@/app/contexts/AuthContext";

const { db } = getFirebaseServices();

const inviteFormSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface InviteMemberFormProps {
  boardId: string;
  onInviteSent: () => void;
  onClose: () => void;
}

export function InviteMemberForm({
  boardId,
  onInviteSent,
  onClose,
}: InviteMemberFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: InviteFormValues) => {
    setIsSubmitting(true);
    try {
      console.log("🔍 Starting invite process...");
      console.log("📧 Email to invite:", data.email);
      console.log("🏁 Board ID:", boardId);
      console.log("👤 Current user:", user?.uid, user?.email);
      
      // Check if user is authenticated
      if (!user) {
        console.error("❌ User not authenticated");
        toast.error("Authentication error", {
          description: "You must be logged in to invite members.",
        });
        return;
      }

      // Check if board exists and user has access
      console.log("🔍 Checking board access...");
      const boardRef = doc(db, 'boards', boardId);
      const boardSnap = await getDoc(boardRef);
      
      if (!boardSnap.exists()) {
        console.error("❌ Board does not exist");
        toast.error("Board not found");
        return;
      }
      
      const boardData = boardSnap.data();
      console.log("📋 Board data:", boardData);
      console.log("👥 Current members:", boardData.members);
      console.log("👑 Board owner:", boardData.owner);

      // Find user by email
      console.log("🔍 Searching for user by email...");
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', data.email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.error("❌ User not found in database");
        toast.error("User not found", {
          description: "No user found with this email address. They need to create an account first.",
        });
        return;
      }
      
      const userDoc = querySnapshot.docs[0];
      const userId = userDoc.id;
      const userData = userDoc.data();
      console.log("✅ Found user:", userId, userData);
      
      // Check if user is already a member
      if (boardData.members?.includes(userId)) {
        console.log("ℹ️ User is already a member");
        toast.error("User is already a member of this board");
        return;
      }
      
      // Add user to board members
      console.log("🔄 Adding user to board members...");
      await updateDoc(boardRef, {
        members: arrayUnion(userId)
      });
      
      console.log("✅ Successfully added user to board");
      toast.success(`${data.email} has been added to the board!`);
      onInviteSent();
      onClose();
    } catch (error: unknown) {
      console.error("❌ Error inviting user: ", error);
      
      // Enhanced error logging
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        
        toast.error("Failed to invite user.", {
          description: error.message,
        });
      } else {
        console.error("Unknown error type:", typeof error, error);
        toast.error("An unknown error occurred while inviting the user.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 rounded-xl -z-10" />
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <UserPlus className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Invite Member
            </h3>
          </div>
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Email Address</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="Enter email to invite"
                      {...field}
                      className="pl-10 backdrop-blur-sm bg-white/80 border-white/20 focus:border-blue-300 focus:ring-2 focus:ring-blue-200/50 transition-all duration-200"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="backdrop-blur-sm bg-white/50 border-white/20 hover:bg-white/70 transition-all duration-200"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add to Board
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
} 