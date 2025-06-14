"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getFirebaseServices } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, Timestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/app/contexts/AuthContext";
import { TaskAssignDropdown } from "@/components/TaskAssignDropdown";
import { BoardMember, BoardStatus } from "@/types";
import { format } from "date-fns";

const { db } = getFirebaseServices();

const subtaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
  remark: z.string().optional(),
});

interface CreateSubtaskFormProps {
  boardId: string;
  taskId: string;
  onSubtaskCreated: () => void;
  onClose: () => void;
  boardMembers: BoardMember[];
  boardStatuses: BoardStatus[];
}

export const CreateSubtaskForm = ({ boardId, taskId, onSubtaskCreated, onClose, boardMembers, boardStatuses }: CreateSubtaskFormProps) => {
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<z.infer<typeof subtaskSchema>>({
    resolver: zodResolver(subtaskSchema),
  });

  const { user } = useAuth();

  const onSubmit = async (data: z.infer<typeof subtaskSchema>) => {
    if (!user) return;

    const subtaskData: {
      title: string;
      status: string;
      createdAt: ReturnType<typeof serverTimestamp>;
      boardId: string;
      assignedTo?: string;
      dueDate?: Timestamp;
      remark?: string;
    } = {
      title: data.title,
      status: boardStatuses[0]?.id || "todo", // Use first status as default
      createdAt: serverTimestamp(),
      boardId: boardId,
    };

    // Add assignedTo if provided
    if (data.assignedTo) {
      subtaskData.assignedTo = data.assignedTo;
    }

    // Add dueDate if provided
    if (data.dueDate) {
      const dueDate = new Date(data.dueDate);
      subtaskData.dueDate = Timestamp.fromDate(dueDate);
    }

    // Add remark if provided
    if (data.remark) {
      subtaskData.remark = data.remark;
    }

    const taskRef = doc(db, "boards", boardId, "tasks", taskId);
    await addDoc(collection(taskRef, "subtasks"), subtaskData);
    onSubtaskCreated();
    onClose();
  };

  return (
    <div className="relative">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 rounded-xl -z-10" />
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium text-gray-700">Subtask Title *</Label>
          <Input
            id="title"
            {...register("title")}
            placeholder="Enter subtask title"
            aria-invalid={errors.title ? "true" : "false"}
            className="backdrop-blur-sm bg-white/80 border-white/20 focus:border-blue-300 focus:ring-2 focus:ring-blue-200/50 transition-all duration-200"
          />
          {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dueDate" className="text-sm font-medium text-gray-700">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              {...register("dueDate")}
              min={format(new Date(), "yyyy-MM-dd")}
              className="backdrop-blur-sm bg-white/80 border-white/20 focus:border-blue-300 focus:ring-2 focus:ring-blue-200/50 transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedTo" className="text-sm font-medium text-gray-700">Assigned To</Label>
            <Controller
              name="assignedTo"
              control={control}
              render={({ field }) => (
                <TaskAssignDropdown
                  selectedMemberId={field.value}
                  boardMembers={boardMembers}
                  onSelect={field.onChange}
                  placeholder="Assign subtask to member"
                />
              )}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="remark" className="text-sm font-medium text-gray-700">Remark / Notes</Label>
          <Textarea
            id="remark"
            {...register("remark")}
            placeholder="Add any additional notes or comments..."
            rows={3}
            className="backdrop-blur-sm bg-white/80 border-white/20 focus:border-blue-300 focus:ring-2 focus:ring-blue-200/50 transition-all duration-200 min-h-[80px] resize-none"
          />
        </div>

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
            {isSubmitting ? "Creating..." : "Create Subtask"}
          </Button>
        </div>
      </form>
    </div>
  );
} 