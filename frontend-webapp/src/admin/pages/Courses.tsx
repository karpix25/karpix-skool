import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { Plus, Search, BookOpen } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { AdminCourseCard } from '../components/courses/AdminCourseCard';
import { cn } from '../../lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '../../components/ui/dialog';
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

type FilterType = 'All' | 'Published' | 'Draft' | 'Archived';

export const Courses: React.FC = () => {
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterType>('All');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const [newCourse, setNewCourse] = useState({
        title: '',
        description: '',
        cover_url: '',
        unlock_type: 'open',
        unlock_value: '1',
        is_published: false
    });

    const navigate = useNavigate();

    useEffect(() => {
        fetchCourses();
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
            setIsCreateModalOpen(false);
            setNewCourse({
                title: '',
                description: '',
                cover_url: '',
                unlock_type: 'open',
                unlock_value: '1',
                is_published: false
            });
            navigate(`/courses/${res.data.id}`);
        } catch (err) {
            console.error(err);
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
                        <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
                        <p className="text-xs text-muted-foreground">Manage your curriculum</p>
                    </div>
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-white rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-primary/20 h-10 px-5"
                    >
                        <Plus className="w-5 h-5" />
                        Add Course
                    </Button>
                </div>

                {/* Search Bar */}
                <div className="relative group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        placeholder="Search your curriculum..."
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
                        {f === 'All' ? 'All Courses' : f}
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
                        <h3 className="text-lg font-bold">No courses found</h3>
                        <p className="text-sm text-muted-foreground max-w-[250px] mt-1">
                            {searchQuery ? "Try adjusting your search query" : "Start by adding your first course to the curriculum."}
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
                                onClick={(id) => navigate(`/courses/${id}`)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Create Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Create New Course</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-8 py-4 text-card-foreground">
                        {/* Title & Desc */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Title</Label>
                                <Input
                                    placeholder="Enter course title"
                                    value={newCourse.title}
                                    onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value.slice(0, 50) })}
                                />
                                <div className="flex justify-end pr-1">
                                    <CharCounter current={newCourse.title.length} max={50} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Description</Label>
                                <Textarea
                                    placeholder="Short summary of what students will learn"
                                    className="min-h-[100px]"
                                    value={newCourse.description}
                                    onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value.slice(0, 500) })}
                                />
                                <div className="flex justify-end pr-1">
                                    <CharCounter current={(newCourse.description || '').length} max={500} />
                                </div>
                            </div>
                        </div>

                        {/* Access Rules */}
                        <div className="space-y-4 pt-4 border-t">
                            <Label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Access Rules</Label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[
                                    { id: 'open', label: 'Open', desc: 'All members access' },
                                    { id: 'level_based', label: 'Level Unlock', desc: 'Unlock at level X' },
                                    { id: 'payment_based', label: 'Buy Now', desc: 'One-time price' },
                                    { id: 'time_relative', label: 'Time Unlock', desc: 'Unlock after X days' },
                                ].map((type) => (
                                    <div
                                        key={type.id}
                                        className={cn(
                                            "cursor-pointer border rounded-xl p-4 transition-all hover:bg-muted/30 flex items-center gap-3",
                                            newCourse.unlock_type === type.id ? "border-primary bg-primary/[0.02]" : "border-border"
                                        )}
                                        onClick={() => setNewCourse({ ...newCourse, unlock_type: type.id })}
                                    >
                                        <div className={cn(
                                            "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                                            newCourse.unlock_type === type.id ? "border-primary border-4" : "border-muted-foreground/30"
                                        )} />
                                        <div>
                                            <p className="text-sm font-bold">{type.label}</p>
                                            <p className="text-[10px] text-muted-foreground">{type.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {newCourse.unlock_type === 'level_based' && (
                                <div className="pt-2 animate-in slide-in-from-top-2 duration-300">
                                    <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2 block">Starting Level</Label>
                                    <Select
                                        value={newCourse.unlock_value}
                                        onValueChange={(v) => setNewCourse({ ...newCourse, unlock_value: v })}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select level" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[1, 2, 3, 5, 10, 20].map(lv => (
                                                <SelectItem key={lv} value={lv.toString()}>Level {lv}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {/* Publish State */}
                        <div className="pt-6 border-t flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="font-bold">Published</Label>
                                <p className="text-[11px] text-muted-foreground italic">Visible to all eligible students immediately.</p>
                            </div>
                            <Switch
                                checked={newCourse.is_published}
                                onCheckedChange={(checked) => setNewCourse({ ...newCourse, is_published: checked })}
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-6 border-t">
                        <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateCourse}>Create Course</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};