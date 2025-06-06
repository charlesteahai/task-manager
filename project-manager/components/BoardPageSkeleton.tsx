import { Skeleton } from "@/components/ui/skeleton";

export const BoardPageSkeleton = () => {
  return (
    <div className="container mx-auto py-8">
      {/* Header Skeleton */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-80" />
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Tasks Section Skeleton */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold mb-4 mt-8">Tasks</h2>
        {Array.from({ length: 2 }).map((_, taskIndex) => (
          <div key={taskIndex} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-7 w-48" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-28" />
              </div>
            </div>
            <Skeleton className="h-4 w-3/4 mt-1 mb-4 ml-12" />
            
            <div className="ml-8 mt-4 space-y-2">
              {Array.from({ length: 3 }).map((_, subtaskIndex) => (
                <div key={subtaskIndex} className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-5 w-56" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 