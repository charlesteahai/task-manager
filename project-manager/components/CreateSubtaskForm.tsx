"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getFirebaseServices } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/app/contexts/AuthContext";

const { db } = getFirebaseServices();

const subtaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
});

interface CreateSubtaskFormProps {
  boardId: string;
  taskId: string;
  onSubtaskCreated: () => void;
  onClose: () => void;
}

export const CreateSubtaskForm = ({ boardId, taskId, onSubtaskCreated, onClose }: CreateSubtaskFormProps) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof subtaskSchema>>({
    resolver: zodResolver(subtaskSchema),
  });

  const { user } = useAuth();

  const onSubmit = async (data: z.infer<typeof subtaskSchema>) => {
    if (!user) return;

    const subtaskData = {
      ...data,
      status: "pending",
      createdAt: serverTimestamp(),
      boardId: boardId,
    };

    const taskRef = doc(db, "boards", boardId, "tasks", taskId);
    await addDoc(collection(taskRef, "subtasks"), subtaskData);
    onSubtaskCreated();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        {...register("title")}
        placeholder="Subtask title"
        aria-invalid={errors.title ? "true" : "false"}
      />
      {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Subtask"}
        </Button>
      </div>
    </form>
  );
} 