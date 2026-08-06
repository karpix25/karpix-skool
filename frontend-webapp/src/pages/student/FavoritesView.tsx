import React, { useMemo } from 'react';
import { AlertCircle, Heart, Loader2 } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { CourseCard } from './components/CourseCard';
import { StudentStateMessage } from './components/StudentStateMessage';
import { withCourseVipAccessFallback } from './components/courseVipAccess';
import { useStudentFavorites } from './catalog/useStudentFavorites';

export const FavoritesView: React.FC = () => {
    const { activeTenantId, tenant } = useAuth();
    const favoriteState = useStudentFavorites(activeTenantId);
    const favorites = useMemo(
        () => favoriteState.favorites.map((course) => withCourseVipAccessFallback(course, tenant?.vip_group_link)),
        [favoriteState.favorites, tenant?.vip_group_link],
    );

    if (favoriteState.isLoading) {
        return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;
    }

    return (
        <section className="space-y-6 pb-10">
            <div className="px-1">
                <p className="text-[11px] font-semibold text-muted-foreground">Сохранённое</p>
                <h2 className="text-xl font-semibold leading-tight lg:text-[34px] lg:leading-10">Избранное</h2>
            </div>
            {favoriteState.loadError ? (
                <StudentStateMessage icon={AlertCircle} title="Избранное не загрузилось" description={favoriteState.loadError} />
            ) : favorites.length === 0 ? (
                <StudentStateMessage icon={Heart} title="Здесь пока пусто" description="Сохраняйте полезные курсы, гайды и промпты кнопкой с сердцем." />
            ) : (
                <div className="grid grid-cols-2 gap-3 min-[900px]:gap-4 min-[1120px]:grid-cols-3">
                    {favorites.map((course) => (
                        <CourseCard
                            key={course.id}
                            course={course}
                            isFavorite
                            favoritePending={favoriteState.pendingIds.has(course.id)}
                            favoriteError={favoriteState.errors[course.id]}
                            onFavoriteToggle={() => favoriteState.toggleFavorite(course.id)}
                        />
                    ))}
                </div>
            )}
        </section>
    );
};
