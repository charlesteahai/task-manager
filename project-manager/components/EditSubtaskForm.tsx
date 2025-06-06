"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { doc, updateDoc } from "firebase/firestore";
import { getFirebaseServices } from "@/lib/firebase";
import * as z from "zod";
import { Subtask } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const { db } = getFirebaseServices();

const subtaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  status: z.string(),
});

interface EditSubtaskFormProps {
  boardId: string;
  taskId: string;
  subtask: Subtask;
  onSubtaskUpdated: () => void;
  onClose: () => void;
}

export const EditSubtaskForm = ({ boardId, taskId, subtask, onSubtaskUpdated, onClose }: EditSubtaskFormProps) => {
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<z.infer<typeof subtaskSchema>>({
    resolver: zodResolver(subtaskSchema),
    defaultValues: {
      title: subtask.title,
      status: subtask.status,
    },
  });

  const onSubmit = async (data: z.infer<typeof subtaskSchema>) => {
    try {
      const subtaskRef = doc(db, "boards", boardId, "tasks", taskId, "subtasks", subtask.id);
      await updateDoc(subtaskRef, {
        ...data,
      });
      onSubtaskUpdated();
      onClose();
    } catch (error) {
        console.error("Error updating subtask: ", error);
        toast.error("Failed to update subtask.");
    }
  };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                <Input
                    id="title"
                    {...register("title")}
                    placeholder="Subtask title"
                    aria-invalid={errors.title ? "true" : "false"}
                />
                {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
            </div>

            <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                 <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todo">To Do</SelectItem>
                                <SelectItem value="in-progress">In Progress</SelectItem>
                                <SelectItem value="done">Done</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>

            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Updating..." : "Update Subtask"}
                </Button>
            </div>
        </form>
    );
} 