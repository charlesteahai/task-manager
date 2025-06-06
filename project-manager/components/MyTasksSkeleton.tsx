import { Skeleton } from "@/components/ui/skeleton";

export const MyTasksSkeleton = () => {
  return (
    <div className="container mx-auto p-4">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <Skeleton className="h-9 w-48" />
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <Skeleton className="h-10 w-full sm:w-[180px]" />
          <Skeleton className="h-10 w-full sm:w-[180px]" />
        </div>
      </div>

      {/* Task List Skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="h-10 w-full sm:w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}; 