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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useState } from "react";
import { Subtask } from "@/types";

const subtaskFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  status: z.enum(["todo", "in-progress", "done"]),
});

type SubtaskFormValues = z.infer<typeof subtaskFormSchema>;

interface EditSubtaskFormProps {
  boardId: string;
  taskId: string;
  subtask: Subtask;
  onSubtaskUpdated: () => void;
  onClose: () => void;
}

export function EditSubtaskForm({ boardId, taskId, subtask, onSubtaskUpdated, onClose }: EditSubtaskFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SubtaskFormValues>({
    resolver: zodResolver(subtaskFormSchema),
    defaultValues: {
      title: subtask.title,
      status: subtask.status,
    },
  });

  const onSubmit = async (data: SubtaskFormValues) => {
    setIsLoading(true);
    try {
      const subtaskRef = doc(db, "boards", boardId, "tasks", taskId, "subtasks", subtask.id);
      await updateDoc(subtaskRef, {
        title: data.title,
        status: data.status,
      });
      onSubtaskUpdated();
      onClose();
    } catch (error) {
      console.error("Error updating subtask: ", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subtask Title</FormLabel>
              <FormControl>
                <Input placeholder="Subtask title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Update Subtask'}
            </Button>
        </div>
      </form>
    </Form>
  );
} 