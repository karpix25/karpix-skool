import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { Plus, Search, BookOpen, Image as ImageIcon } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { AdminCourseCard } from '../../admin/components/courses/AdminCourseCard';
import { cn } from '../../lib/utils';
import { Dialog, DialogContent } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { CharCounter } from '../../components/CharCounter';
import { Switch } from '../../components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import { useRef } from 'react';

type FilterType = 'All' | 'Published' | 'Draft' | 'Archived';

export const Courses: React.FC = () => {
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterType>('All');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [newCourse, setNewCourse] = useState({
        title: '',
        description: '',
        cover_url: '',
        unlock_type: 'open',
        unlock_value: '1',
        is_published: false,
        is_vip: false
    });

    const navigate = useNavigate();

    useEffect(() => {
        fetchCourses();
    }, []);

    useEffect(() => {
        const handleOpenCreate = () => setIsCreateModalOpen(true);
        window.addEventListener('open-create-course', handleOpenCreate);
        return () => window.removeEventListener('open-create-course', handleOpenCreate);
    }, []);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const res = await api.get('/courses');
            setCourses(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCourse = async () => {
        if (!newCourse.title) return;
        try {
            const res = await api.post('/courses', newCourse);
            setCourses([res.data, ...courses]);
            closeModal();
            navigate(`/courses/${res.data.id}`);
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateCourse = async () => {
        if (!newCourse.title || !editingCourseId) return;
        try {
            const res = await api.patch(`/courses/${editingCourseId}`, newCourse);
            setCourses(prev => prev.map(c => c.id === editingCourseId ? res.data : c));
            closeModal();
        } catch (err) {
            console.error(err);
        }
    };

    const closeModal = () => {
        setIsCreateModalOpen(false);
        setEditingCourseId(null);
        setNewCourse({
            title: '',
            description: '',
            cover_url: '',
            unlock_type: 'open',
            unlock_value: '1',
            is_published: false,
            is_vip: false
        });
    };

    const handleOpenEditModal = (course: any) => {
        setEditingCourseId(course.id);
        setNewCourse({
            title: course.title,
            description: course.description || '',
            cover_url: course.cover_url || '',
            unlock_type: course.unlock_type || 'open',
            unlock_value: (course.unlock_value || '1').toString(),
            is_published: course.is_published,
            is_vip: course.is_vip || false
        });
        setIsCreateModalOpen(true);
    };

    const handleSubmit = () => {
        if (editingCourseId) {
            handleUpdateCourse();
        } else {
            handleCreateCourse();
        }
    };

    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('file', file);

            const res = await api.post('/upload/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.url) {
                setNewCourse(prev => ({ ...prev, cover_url: res.data.url }));
            }
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteCourse = async (id: string) => {
        if (!confirm('Удалить курс? Это действие нельзя отменить.')) return;
        try {
            await api.delete(`/courses/${id}`);
            setCourses(courses.filter(c => c.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const handleDuplicateCourse = async (id: string) => {
        try {
            const res = await api.post(`/courses/${id}/duplicate`);
            setCourses([res.data, ...courses]);
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggleStatus = async (id: string, published: boolean) => {
        try {
            const res = await api.patch(`/courses/${id}`, { is_published: published });
            setCourses(prev => prev.map(c => c.id === id ? { ...c, is_published: res.data.is_published } : c));
        } catch (err) {
            console.error(err);
        }
    };

    const filteredCourses = useMemo(() => {
        return courses.filter(course => {
            const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (course.description || '').toLowerCase().includes(searchQuery.toLowerCase());

            if (activeFilter === 'All') return matchesSearch;
            if (activeFilter === 'Published') return matchesSearch && course.is_published;
            if (activeFilter === 'Draft') return matchesSearch && !course.is_published;
            return matchesSearch; // For 'Archived' until implemented in backend
        });
    }, [courses, searchQuery, activeFilter]);

    const filters: FilterType[] = ['All', 'Published', 'Draft', 'Archived'];

    return (
        <div className="flex flex-col min-h-screen animate-in fade-in duration-500">
            {/* Header Area */}
            <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/40 px-6 pt-8 pb-5">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Курсы</h1>
                        <p className="text-xs text-muted-foreground">Управление учебным планом</p>
                    </div>
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-white rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-primary/20 h-10 px-5"
                    >
                        <Plus className="w-5 h-5" />
                        Добавить курс
                    </Button>
                </div>

                {/* Search Bar */}
                <div className="relative group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        placeholder="Поиск по курсам..."
                        className="w-full bg-secondary/50 border-none rounded-2xl py-3.5 pl-11 pr-5 text-[15px] focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/60 transition-all font-medium"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </header>

            {/* Filters Bar */}
            <div className="px-6 py-4 flex gap-2.5 overflow-x-auto no-scrollbar scroll-smooth">
                {filters.map((f) => (
                    <button
                        key={f}
                        onClick={() => setActiveFilter(f)}
                        className={cn(
                            "px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                            activeFilter === f
                                ? "bg-primary text-white shadow-md shadow-primary/20"
                                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                        )}
                    >
                        {f === 'All' ? 'Все курсы' : f === 'Published' ? 'Опубликованные' : f === 'Draft' ? 'Черновики' : 'Архив'}
                    </button>
                ))}
            </div>

            {/* Course Grid */}
            <main className="flex-1 px-6 pb-24 space-y-6">
                {loading ? (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-card rounded-2xl p-4 border border-border space-y-4">
                                <Skeleton className="aspect-video w-full rounded-xl" />
                                <div className="space-y-2">
                                    <Skeleton className="h-5 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                        <div className="bg-secondary p-6 rounded-full mb-4">
                            <BookOpen size={48} className="text-muted-foreground/40" />
                        </div>
                        <h3 className="text-lg font-bold">Курсы не найдены</h3>
                        <p className="text-sm text-muted-foreground max-w-[250px] mt-1">
                            {searchQuery ? "Попробуйте изменить запрос" : "Добавьте первый курс в учебный план."}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredCourses.map(course => (
                            <AdminCourseCard
                                key={course.id}
                                course={course}
                                onToggleStatus={handleToggleStatus}
                                onDelete={handleDeleteCourse}
                                onDuplicate={handleDuplicateCourse}
                                onEdit={handleOpenEditModal}
                                onClick={(id: string) => navigate(`/courses/${id}`)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Create Modal - Refined Design */}
            <Dialog open={isCreateModalOpen} onOpenChange={(open) => !open && closeModal()}>
                <DialogContent className="dark max-w-md p-0 overflow-hidden rounded-[32px] sm:rounded-[32px] border-none shadow-2xl bg-[#09090b] text-slate-100 flex flex-col h-[90vh] sm:h-[85vh]">
                    {/* Header */}
                    <div className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between font-sans">
                        <button
                            onClick={closeModal}
                            className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Отмена
                        </button>
                        <h2 className="text-base font-black uppercase tracking-widest text-foreground">
                            {editingCourseId ? 'Редактирование курса' : 'Новый курс'}
                        </h2>
                        <button
                            onClick={handleSubmit}
                            disabled={!newCourse.title || isUploading}
                            className="text-sm font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors disabled:opacity-30"
                        >
                            {editingCourseId ? 'Сохр.' : 'Создать'}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-8 space-y-10 pb-32">
                        {/* Thumbnail Upload */}
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Обложка курса</Label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    "group relative aspect-video w-full rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-3",
                                    newCourse.cover_url
                                        ? "border-transparent"
                                        : "border-border hover:border-primary/50 bg-muted/30"
                                )}
                            >
                                {newCourse.cover_url ? (
                                    <img src={newCourse.cover_url} className="w-full h-full object-cover" alt="Course Thumbnail" />
                                ) : (
                                    <>
                                        <div className="w-12 h-12 rounded-2xl bg-[#18181b] flex items-center justify-center text-muted-foreground group-hover:text-primary transition-all group-hover:scale-110 shadow-sm border border-white/5">
                                            {isUploading ? (
                                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                                            ) : (
                                                <ImageIcon size={24} />
                                            )}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Загрузить изображение</p>
                                            <p className="text-[8px] font-bold text-muted-foreground/40 mt-1 uppercase tracking-wider">Рекомендуем 16:9</p>
                                        </div>
                                    </>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleThumbnailUpload}
                                />

                                {newCourse.cover_url && (
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-[10px] font-black uppercase tracking-widest text-white">
                                            Изменить
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Title Input */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Название</Label>
                                <CharCounter current={newCourse.title.length} max={50} />
                            </div>
                            <Input
                                className="h-12 w-full rounded-2xl border-border/60 bg-muted/20 px-4 text-sm font-bold transition-all focus:ring-2 focus:ring-primary/20"
                                value={newCourse.title}
                                onChange={(e) => setNewCourse(prev => ({ ...prev, title: e.target.value.slice(0, 50) }))}
                                placeholder="Напр. Мастер технического анализа"
                            />
                        </div>

                        {/* Description Textarea */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Описание</Label>
                                <CharCounter current={(newCourse.description || '').length} max={500} />
                            </div>
                            <Textarea
                                className="min-h-[120px] w-full rounded-2xl border-border/60 bg-muted/20 px-4 py-3 text-sm font-medium transition-all focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
                                value={newCourse.description}
                                onChange={(e) => setNewCourse(prev => ({ ...prev, description: e.target.value.slice(0, 500) }))}
                                placeholder="Кратко опишите, чему научатся студенты..."
                            />
                        </div>

                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Стратегия доступа</Label>
                            <div className="grid grid-cols-3 items-center justify-center rounded-2xl bg-muted/30 p-1.5 text-muted-foreground border border-border/40">
                                {[
                                    { id: 'open', label: 'Открытый' },
                                    { id: 'level_based', label: 'Уровень' },
                                    { id: 'time_relative', label: 'Время' },
                                ].map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => setNewCourse(prev => ({ ...prev, unlock_type: type.id }))}
                                        className={cn(
                                            "inline-flex items-center justify-center whitespace-nowrap rounded-xl px-2 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all",
                                            newCourse.unlock_type === type.id
                                                ? 'bg-white text-primary shadow-sm ring-1 ring-black/5'
                                                : 'hover:text-foreground/80 opacity-60'
                                        )}
                                        type="button"
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* VIP Access Toggle */}
                        <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/40 rounded-2xl">
                            <div className="space-y-0.5">
                                <Label className="text-xs font-black uppercase tracking-tight text-foreground">Только VIP</Label>
                                <p className="text-[9px] font-bold text-muted-foreground opacity-60 uppercase tracking-tighter">Доступ для платной группы</p>
                            </div>
                            <Switch
                                checked={newCourse.is_vip}
                                onCheckedChange={(checked) => setNewCourse(prev => ({ ...prev, is_vip: checked }))}
                            />
                        </div>

                        {/* Unlock Value Select */}
                        {newCourse.unlock_type !== 'open' && (
                            <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                    {newCourse.unlock_type === 'level_based' ? 'Требуемый уровень' : 'Задержка (дни)'}
                                </Label>
                                <div className="relative group">
                                    <Select
                                        value={newCourse.unlock_value}
                                        onValueChange={(v) => setNewCourse(prev => ({ ...prev, unlock_value: v }))}
                                    >
                                        <SelectTrigger className="h-12 w-full rounded-2xl border-border/60 bg-muted/20 px-4 font-bold">
                                            <SelectValue placeholder="Выбрать" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border/60 shadow-xl p-1">
                                            {[1, 2, 3, 5, 10, 20].map(lv => (
                                                <SelectItem key={lv} value={lv.toString()} className="rounded-xl h-10 font-bold text-xs uppercase tracking-widest">
                                                    {newCourse.unlock_type === 'level_based' ? `Уровень ${lv}` : `${lv} дн.`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        {/* Publishing Status Toggle */}
                        <div className="flex items-center justify-between rounded-3xl border border-border/40 bg-muted/20 p-5">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-black uppercase tracking-tight text-foreground">Опубликован</Label>
                                <p className="text-[10px] font-bold text-muted-foreground opacity-60">Сразу виден студентам</p>
                            </div>
                            <Switch
                                checked={newCourse.is_published}
                                onCheckedChange={(checked) => setNewCourse(prev => ({ ...prev, is_published: checked }))}
                                className="data-[state=checked]:bg-primary"
                            />
                        </div>
                    </div>

                    {/* Footer CTA */}
                    <div className="sticky bottom-0 left-0 right-0 bg-[#09090b]/95 backdrop-blur-xl border-t border-white/10 px-6 pt-5 pb-10 z-50">
                        <Button
                            onClick={handleSubmit}
                            disabled={!newCourse.title || isUploading}
                            className="w-full h-14 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] bg-primary text-white hover:bg-primary/90 shadow-xl shadow-primary/20 active:scale-[0.98] transition-all"
                        >
                            {isUploading ? "Загрузка..." : editingCourseId ? "СОХРАНИТЬ" : "Создать курс"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};