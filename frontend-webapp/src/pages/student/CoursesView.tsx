import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, Loader2, Search } from 'lucide-react';
import api from '../../api/client';
import { HorizontalRail } from '../../components/ui/horizontal-rail';
import { Input } from '../../components/ui/input';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import type { StudentCourse } from '../../types/course';
import { CourseCard } from './components/CourseCard';
import { StudentStateMessage } from './components/StudentStateMessage';
import { withCourseVipAccessFallback } from './components/courseVipAccess';
import { defaultCatalogFilters, filterStudentCourses, getCourseCategories, getCourseTags, type CatalogAccess, type CatalogFilters } from './catalog/catalogFilters';
import { useStudentFavorites } from './catalog/useStudentFavorites';

interface CoursesLoadState {
    tenantId: string | null;
    courses: StudentCourse[];
    error: string | null;
    status: 'loading' | 'loaded' | 'error';
}

interface FilterTabProps {
    label: string;
    value: CatalogAccess;
    activeFilter: CatalogAccess;
    onSelect: (value: CatalogAccess) => void;
}

const FilterTab: React.FC<FilterTabProps> = ({ label, value, activeFilter, onSelect }) => (
    <button
        type="button"
        aria-pressed={activeFilter === value}
        onClick={() => onSelect(value)}
        className={cn(
            "min-h-10 shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors lg:min-h-12 lg:px-5 lg:text-sm",
            activeFilter === value
                ? "bg-primary text-primary-foreground"
                : "border border-border/70 bg-card text-muted-foreground hover:bg-muted/50"
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
    const [catalogFilters, setCatalogFiltersState] = useState<CatalogFilters>(defaultCatalogFilters);
    const [page, setPage] = useState(1);
    const { memberships, activeTenantId, setActiveTenantId, refreshProfile, tenant } = useAuth();
    const favoriteState = useStudentFavorites(activeTenantId);
    const updateCatalogFilters = (update: React.SetStateAction<CatalogFilters>) => {
        setPage(1);
        setCatalogFiltersState(update);
    };

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
        () => (
            loadState.tenantId === activeTenantId
                ? loadState.courses.map((course) => withCourseVipAccessFallback(course, tenant?.vip_group_link))
                : []
        ),
        [activeTenantId, loadState.courses, loadState.tenantId, tenant?.vip_group_link],
    );
    const loadError = loadState.tenantId === activeTenantId ? loadState.error : null;

    const categories = useMemo(() => getCourseCategories(courses), [courses]);
    const tags = useMemo(() => getCourseTags(courses), [courses]);
    const filteredCourses = useMemo(() => filterStudentCourses(courses, catalogFilters), [catalogFilters, courses]);
    const totalPages = Math.ceil(filteredCourses.length / 6);
    const currentPage = Math.min(page, Math.max(totalPages, 1));
    const handlePageChange = (page: number) => {
        setPage(page);
    };
    const visibleCourses = useMemo(() => {
        const startIndex = (currentPage - 1) * 6;
        return filteredCourses.slice(startIndex, startIndex + 6);
    }, [currentPage, filteredCourses]);

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <section className="space-y-6 overflow-x-clip pb-10 lg:space-y-8">
            <div className="px-1">
                <p className="text-[11px] font-semibold text-muted-foreground lg:text-sm">Обучение</p>
                <h2 className="text-xl font-semibold leading-tight lg:text-[34px] lg:leading-10">Курсы</h2>
            </div>

            {memberships.length > 1 && (
                <div className="grid gap-2 min-[420px]:grid-cols-2">
                    {memberships.map((m) => (
                        <button
                            type="button"
                            key={m.tenant_id}
                            onClick={() => handleSwitchSchool(m.tenant_id)}
                            aria-pressed={activeTenantId === m.tenant_id}
                            className={cn(
                                "flex min-h-12 min-w-0 items-center gap-3 rounded-xl border p-2 pr-3 transition-colors",
                                activeTenantId === m.tenant_id
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border/70 bg-card text-muted-foreground hover:bg-muted/40"
                            )}
                        >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold">
                                {m.tenant_name?.[0]}
                            </span>
                            <span className="min-w-0 text-left">
                                <span className="block text-[10px] font-semibold leading-none opacity-60">Школа</span>
                                <span className="mt-1 block truncate text-xs font-semibold leading-tight">{m.tenant_name}</span>
                            </span>
                        </button>
                    ))}
                </div>
            )}

            <HorizontalRail
                role="group"
                aria-label="Фильтр курсов"
                contentClassName="gap-2"
            >
                <FilterTab label="Все" value="all" activeFilter={catalogFilters.access} onSelect={(access) => updateCatalogFilters((current) => ({ ...current, access }))} />
                <FilterTab label="В процессе" value="in-progress" activeFilter={catalogFilters.access} onSelect={(access) => updateCatalogFilters((current) => ({ ...current, access }))} />
                <FilterTab label="Открытые" value="open" activeFilter={catalogFilters.access} onSelect={(access) => updateCatalogFilters((current) => ({ ...current, access }))} />
                <FilterTab label="VIP" value="vip" activeFilter={catalogFilters.access} onSelect={(access) => updateCatalogFilters((current) => ({ ...current, access }))} />
                <FilterTab label="Заблокированные" value="locked" activeFilter={catalogFilters.access} onSelect={(access) => updateCatalogFilters((current) => ({ ...current, access }))} />
            </HorizontalRail>

            <div className="grid gap-2 rounded-xl border border-border/70 bg-card/60 p-3 min-[520px]:grid-cols-2 lg:grid-cols-4">
                <label className="relative min-w-0 min-[520px]:col-span-2 lg:col-span-1">
                    <Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-muted-foreground" />
                    <Input aria-label="Поиск материалов" value={catalogFilters.query} onChange={(event) => updateCatalogFilters((current) => ({ ...current, query: event.target.value }))} placeholder="Поиск" className="pl-9" />
                </label>
                <select aria-label="Тип материала" value={catalogFilters.contentType} onChange={(event) => updateCatalogFilters((current) => ({ ...current, contentType: event.target.value as CatalogFilters['contentType'] }))} className="h-11 rounded-lg border border-input bg-card px-3 text-sm">
                    <option value="all">Все типы</option>
                    <option value="course">Курсы</option>
                    <option value="guide">Гайды</option>
                    <option value="prompt">Промпты</option>
                    <option value="checklist">Чек-листы</option>
                </select>
                <select aria-label="Категория" value={catalogFilters.category} onChange={(event) => updateCatalogFilters((current) => ({ ...current, category: event.target.value }))} className="h-11 rounded-lg border border-input bg-card px-3 text-sm">
                    <option value="all">Все категории</option>
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
                <select aria-label="Тег" value={catalogFilters.tag} onChange={(event) => updateCatalogFilters((current) => ({ ...current, tag: event.target.value }))} className="h-11 rounded-lg border border-input bg-card px-3 text-sm">
                    <option value="all">Все теги</option>
                    {tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                </select>
                <select aria-label="Сортировка" value={catalogFilters.sort} onChange={(event) => updateCatalogFilters((current) => ({ ...current, sort: event.target.value as CatalogFilters['sort'] }))} className="h-11 rounded-lg border border-input bg-card px-3 text-sm">
                    <option value="newest">Сначала новые</option>
                    <option value="title">По названию</option>
                </select>
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
                <>
                    <div className="grid grid-cols-2 gap-3 min-[900px]:grid-cols-2 min-[900px]:gap-4 min-[1120px]:grid-cols-3">
                        {visibleCourses.map(course => (
                            <CourseCard
                                key={course.id}
                                course={course}
                                isFavorite={favoriteState.isFavorite(course.id)}
                                favoritePending={favoriteState.pendingIds.has(course.id)}
                                favoriteError={favoriteState.errors[course.id]}
                                onFavoriteToggle={() => favoriteState.toggleFavorite(course.id)}
                            />
                        ))}
                    </div>
                    {totalPages > 1 && <div className="flex justify-center gap-2 pt-2">
                        {Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => (
                            <button key={item} type="button" aria-current={item === currentPage ? 'page' : undefined} onClick={() => handlePageChange(item)} className={cn('h-9 min-w-9 rounded-lg border px-2 text-xs font-semibold', item === currentPage ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground')}>
                                {item}
                            </button>
                        ))}
                    </div>}
                </>
            )}
        </section>
    );
};
