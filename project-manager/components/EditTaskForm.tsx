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
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Edit3, Loader2, Save } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Timestamp, doc, updateDoc, collection, query, getDocs } from "firebase/firestore";
import { getFirebaseServices } from "@/lib/firebase";
import { useState } from "react";
import { Task, Subtask } from "@/types";
import { toast } from "sonner";

const { db } = getFirebaseServices();

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["todo", "in-progress", "done", "pending"]),
  dueDate: z.date().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface EditTaskFormProps {
  boardId: string;
  task: Task;
  onTaskUpdated: () => void;
  onClose: () => void;
}

export function EditTaskForm({
  boardId,
  task,
  onTaskUpdated,
  onClose,
}: EditTaskFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task.title,
      description: task.description || "",
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.toDate() : undefined,
    },
  });

  const onSubmit = async (data: TaskFormValues) => {
    setIsSubmitting(true);
    
    // Validation: Prevent setting task to 'done' if subtasks are not 'done'
    if (data.status === 'done') {
        try {
            const subtasksQuery = query(collection(db, "boards", boardId, "tasks", task.id, "subtasks"));
            const subtasksSnapshot = await getDocs(subtasksQuery);
            const subtasks = subtasksSnapshot.docs.map(doc => doc.data() as Subtask);
            const incompleteSubtasks = subtasks.filter(st => st.status !== 'done');

            if (incompleteSubtasks.length > 0) {
                toast.error("Cannot mark task as done.", {
                    description: "All subtasks must be completed first."
                });
                setIsSubmitting(false);
                return;
            }
        } catch (error) {
            console.error("Error fetching subtasks for validation:", error);
            toast.error("Failed to validate subtask status. Please try again.");
            setIsSubmitting(false);
            return;
        }
    }


    try {
      const taskRef = doc(db, "boards", boardId, "tasks", task.id);
      await updateDoc(taskRef, {
        ...data,
        dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : null,
      });
      onTaskUpdated();
    } catch (error) {
      console.error("Error updating task: ", error);
      toast.error("Failed to update the task. Please try again.");
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
              <Edit3 className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Edit Task
            </h3>
          </div>

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Title</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g. Implement feature" 
                    {...field} 
                    className="backdrop-blur-sm bg-white/80 border-white/20 focus:border-blue-300 focus:ring-2 focus:ring-blue-200/50 transition-all duration-200"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Add a more detailed description..."
                    className="resize-none backdrop-blur-sm bg-white/80 border-white/20 focus:border-blue-300 focus:ring-2 focus:ring-blue-200/50 transition-all duration-200 min-h-[80px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="backdrop-blur-sm bg-white/80 border-white/20 focus:border-blue-300 focus:ring-2 focus:ring-blue-200/50 transition-all duration-200">
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="backdrop-blur-sm bg-white/95 border-white/20">
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-sm font-medium text-gray-700">Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal backdrop-blur-sm bg-white/80 border-white/20 hover:bg-white/90 focus:border-blue-300 focus:ring-2 focus:ring-blue-200/50 transition-all duration-200",
                            !field.value && "text-gray-500"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 backdrop-blur-sm bg-white/95 border-white/20" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
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
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
} 