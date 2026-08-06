import { useCallback, useEffect, useState } from 'react';

import { getStudentFavorites, setStudentFavorite } from '../../../services/courseFavorites';
import type { StudentCourse } from '../../../types/course';

export const useStudentFavorites = (tenantId: string | null) => {
    const [favorites, setFavorites] = useState<StudentCourse[]>([]);
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
    const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        if (!tenantId) {
            setFavorites([]);
            setFavoriteIds(new Set());
            setLoadError(null);
            setIsLoading(false);
            return () => { mounted = false; };
        }

        setIsLoading(true);
        setLoadError(null);
        getStudentFavorites(tenantId)
            .then((nextFavorites) => {
                if (!mounted) return;
                setFavorites(nextFavorites);
                setFavoriteIds(new Set(nextFavorites.map((course) => course.id)));
            })
            .catch((error) => {
                console.error(error);
                if (mounted) setLoadError('Не удалось загрузить избранное. Попробуйте обновить экран.');
            })
            .finally(() => {
                if (mounted) setIsLoading(false);
            });

        return () => { mounted = false; };
    }, [tenantId]);

    const toggleFavorite = useCallback(async (courseId: string) => {
        if (pendingIds.has(courseId)) return;
        const nextFavorite = !favoriteIds.has(courseId);
        const removedFavorite = nextFavorite ? undefined : favorites.find((course) => course.id === courseId);
        setPendingIds((current) => new Set(current).add(courseId));
        setErrors((current) => {
            const next = { ...current };
            delete next[courseId];
            return next;
        });
        setFavoriteIds((current) => {
            const next = new Set(current);
            if (nextFavorite) next.add(courseId);
            else next.delete(courseId);
            return next;
        });
        if (!nextFavorite) setFavorites((current) => current.filter((course) => course.id !== courseId));

        try {
            await setStudentFavorite(courseId, nextFavorite);
        } catch (error) {
            console.error(error);
            setFavoriteIds((current) => {
                const next = new Set(current);
                if (nextFavorite) next.delete(courseId);
                else next.add(courseId);
                return next;
            });
            if (removedFavorite) {
                setFavorites((current) => current.some((course) => course.id === courseId)
                    ? current
                    : [removedFavorite, ...current]);
            }
            setErrors((current) => ({ ...current, [courseId]: 'Не удалось обновить избранное.' }));
        } finally {
            setPendingIds((current) => {
                const next = new Set(current);
                next.delete(courseId);
                return next;
            });
        }
    }, [favoriteIds, favorites, pendingIds]);

    return {
        favorites,
        favoriteIds,
        pendingIds,
        errors,
        isLoading,
        loadError,
        toggleFavorite,
        isFavorite: (courseId: string) => favoriteIds.has(courseId),
    };
};
