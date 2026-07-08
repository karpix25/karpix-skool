import { Card } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';

export const StudentsLoadingGrid = () => (
    <div className="grid auto-rows-fr grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map(i => (
            <Card key={i} className="rounded-xl border-border/80 bg-card/60 shadow-none">
                <div className="space-y-5 p-5 lg:p-6">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
                        <div className="min-w-0 flex-1 space-y-2">
                            <Skeleton className="h-5 w-36 max-w-full" />
                            <Skeleton className="h-3 w-24 max-w-full" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Skeleton className="h-20 w-full rounded-lg" />
                        <Skeleton className="h-20 w-full rounded-lg" />
                    </div>
                </div>
            </Card>
        ))}
    </div>
);
