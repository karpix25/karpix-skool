import { Skeleton } from '../../../components/ui/skeleton';

export const CourseEditorSkeleton = () => (
    <div className="min-h-dvh bg-background p-6 space-y-8 max-w-xl mx-auto">
        <div className="flex items-center gap-4 pb-8 border-b ios-blur">
            <Skeleton className="h-10 w-10 btn-rounded" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <div className="space-y-4">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl opacity-60" />
            <Skeleton className="h-16 w-full rounded-xl opacity-30" />
        </div>
    </div>
);
