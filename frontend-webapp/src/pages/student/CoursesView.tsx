import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, Loader2 } from 'lucide-react';
import api from '../../api/client';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import type { StudentCourse } from '../../types/course';
import { StudentCourseListCard } from './components/StudentCourseListCard';
import { StudentStateMessage } from './components/StudentStateMessage';

type CourseFilter = 'all' | 'in-progress' | 'open' | 'vip';

interface CoursesLoadState {
    tenantId: string | null;
    courses: StudentCourse[];
    error: string | null;
    status: 'loading' | 'loaded' | 'error';
}

interface FilterTabProps {
    label: string;
    value: CourseFilter;
    activeFilter: CourseFilter;
    onSelect: (value: CourseFilter) => void;
}

const FilterTab: React.FC<FilterTabProps> = ({ label, value, activeFilter, onSelect }) => (
    <button
        type="button"
        aria-pressed={activeFilter === value}
        onClick={() => onSelect(value)}
        className={cn(
            "shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-colors",
            activeFilter === value
                ? "bg-primary text-primary-foreground"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
        )}
    >
        {label}
    </button>
);

export const CoursesView: React.FC = () => {
    const [loadState, setLoadState] = useState<CoursesLoadState>({
        tenantId: null,
        courses: [],
        error: null,
        status: 'loading',
    });
    const [activeFilter, setActiveFilter] = useState<CourseFilter>('all');
    const { memberships, activeTenantId, setActiveTenantId, refreshProfile } = useAuth();

    useEffect(() => {
        let isMounted = true;
        const params = activeTenantId ? { tenant_id: activeTenantId } : {};

        api.get('/webapp/courses', { params })
            .then(res => {
                if (isMounted) {
                    setLoadState({
                        tenantId: activeTenantId,
                        courses: Array.isArray(res.data) ? res.data : [],
                        error: null,
                        status: 'loaded',
                    });
                }
            })
            .catch(err => {
                console.error(err);
                if (isMounted) {
                    setLoadState({
                        tenantId: activeTenantId,
                        courses: [],
                        error: 'Не удалось загрузить курсы. Попробуйте обновить экран.',
                        status: 'error',
                    });
                }
            });

        return () => {
            isMounted = false;
        };
    }, [activeTenantId]);

    const handleSwitchSchool = async (tenantId: string) => {
        if (tenantId === activeTenantId) return;
        setActiveTenantId(tenantId);
        await refreshProfile(tenantId);
    };

    const isLoading = loadState.status === 'loading' || loadState.tenantId !== activeTenantId;
    const courses = useMemo(
        () => (loadState.tenantId === activeTenantId ? loadState.courses : []),
        [activeTenantId, loadState.courses, loadState.tenantId],
    );
    const loadError = loadState.tenantId === activeTenantId ? loadState.error : null;

    const filteredCourses = useMemo(() => courses.filter(course => {
        const progress = course.progress_percent || 0;
        const isUnlocked = course.is_unlocked !== false;

        if (activeFilter === 'all') return true;
        if (activeFilter === 'in-progress') return progress > 0 && progress < 100;
        if (activeFilter === 'open') return isUnlocked && !course.is_vip;
        if (activeFilter === 'vip') return course.is_vip;
        return true;
    }), [activeFilter, courses]);

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <section className="space-y-6 pb-10">
            <div className="px-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Обучение</p>
                <h2 className="text-xl font-bold tracking-tight">Курсы</h2>
            </div>

            {memberships.length > 1 && (
                <div className="flex gap-3 overflow-x-auto px-1 pb-2 scrollbar-hide">
                    {memberships.map((m) => (
                        <button
                            type="button"
                            key={m.tenant_id}
                            onClick={() => handleSwitchSchool(m.tenant_id)}
                            aria-pressed={activeTenantId === m.tenant_id}
                            className={cn(
                                "flex shrink-0 items-center gap-3 rounded-xl border p-2 pr-4 transition-colors",
                                activeTenantId === m.tenant_id
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border/70 bg-card/60 text-muted-foreground hover:bg-muted/40"
                            )}
                        >
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold">
                                {m.tenant_name?.[0]}
                            </span>
                            <span className="text-left">
                                <span className="block text-[10px] font-bold uppercase leading-none opacity-60">Школа</span>
                                <span className="mt-1 block text-xs font-bold leading-tight">{m.tenant_name}</span>
                            </span>
                        </button>
                    ))}
                </div>
            )}

            <div
                role="group"
                aria-label="Фильтр курсов"
                className="flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                <style>{`
                    .scrollbar-hide::-webkit-scrollbar {
                        display: none;
                    }
                `}</style>
                <FilterTab label="Все" value="all" activeFilter={activeFilter} onSelect={setActiveFilter} />
                <FilterTab label="В процессе" value="in-progress" activeFilter={activeFilter} onSelect={setActiveFilter} />
                <FilterTab label="Открытые" value="open" activeFilter={activeFilter} onSelect={setActiveFilter} />
                <FilterTab label="VIP" value="vip" activeFilter={activeFilter} onSelect={setActiveFilter} />
            </div>

            {loadError ? (
                <StudentStateMessage
                    icon={AlertCircle}
                    title="Курсы не загрузились"
                    description={loadError}
                />
            ) : filteredCourses.length === 0 ? (
                <StudentStateMessage
                    icon={BookOpen}
                    title="Курсы не найдены"
                    description="Попробуйте другой фильтр или вернитесь позже."
                />
            ) : (
                <div className="grid gap-4">
                    {filteredCourses.map(course => (
                        <StudentCourseListCard key={course.id} course={course} />
                    ))}
                </div>
            )}
        </section>
    );
};
