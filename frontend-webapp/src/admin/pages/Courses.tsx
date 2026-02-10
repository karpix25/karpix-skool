import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { Plus, BookOpen, Search, Trash2, Copy, MoreVertical, Globe, Lock, Clock, CreditCard } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '../../components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { CharCounter } from '../../components/CharCounter';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { cn } from '../../lib/utils';

interface NewCourse {
    title: string;
    description: string;
    cover_url: string;
    unlock_type: string;
    unlock_value: string;
    is_published: boolean;
}

export const Courses: React.FC = () => {
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const [newCourse, setNewCourse] = useState<NewCourse>({
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
            setCourses([...courses, res.data]);
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

    const handleDeleteCourse = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Удалить курс? Это действие нельзя отменить.')) return;
        try {
            await api.delete(`/courses/${id}`);
            setCourses(courses.filter(c => c.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const handleDuplicateCourse = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await api.post(`/courses/${id}/duplicate`);
            setCourses([...courses, res.data]);
        } catch (err) {
            console.error(err);
        }
    };

    const filteredCourses = courses.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const unlockIcons = {
        open: <Globe className="h-3 w-3" />,
        level_based: <Lock className="h-3 w-3" />,
        payment_based: <CreditCard className="h-3 w-3" />,
        time_relative: <Clock className="h-3 w-3" />,
        private: <Lock className="h-3 w-3" />
    };

    return (
        <div className="p-6 md:p-10 space-y-10 max-w-6xl mx-auto pb-24 md:pb-12 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">Courses</h1>
                    <p className="text-muted-foreground text-sm mt-1">Manage your educational content and access rules.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search courses..."
                            className="pl-10 rounded-full bg-muted/50 border-none shadow-none focus-visible:ring-primary/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button onClick={() => setIsCreateModalOpen(true)} className="rounded-full shadow-md shrink-0">
                        <Plus className="mr-2 h-4 w-4" /> Create
                    </Button>
                </div>
            </div>

            {/* Course List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                        All Courses ({filteredCourses.length})
                    </h2>
                </div>

                <div className="grid gap-4">
                    {loading ? (
                        [1, 2, 3].map(i => (
                            <Card key={i} className="border-none shadow-none bg-card/50">
                                <CardContent className="p-6 flex items-center gap-6">
                                    <Skeleton className="h-14 w-14 rounded-xl shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-5 w-1/3" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : filteredCourses.length === 0 ? (
                        <Card className="border-2 border-dashed bg-transparent p-20 text-center flex flex-col items-center justify-center space-y-4 opacity-50">
                            <BookOpen size={64} className="text-muted-foreground/20" />
                            <div className="space-y-1">
                                <h3 className="font-bold text-lg">No courses found</h3>
                                <p className="text-sm">{searchQuery ? "Try a different search" : "Start by creating your first course"}</p>
                            </div>
                        </Card>
                    ) : (
                        filteredCourses.map(course => (
                            <Card
                                key={course.id}
                                className="group overflow-hidden border-none shadow-sm hover:shadow-md transition-all cursor-pointer bg-card"
                                onClick={() => navigate(`/courses/${course.id}`)}
                            >
                                <CardContent className="p-6 md:p-8 flex items-center gap-6">
                                    <Avatar className="h-14 w-14 rounded-xl shrink-0 border border-primary/5">
                                        <AvatarImage src={course.cover_url} />
                                        <AvatarFallback className="bg-primary/5 text-primary">
                                            <BookOpen size={24} />
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                                                {course.title}
                                            </h3>
                                            {!course.is_published && (
                                                <Badge variant="secondary" className="text-[9px] uppercase tracking-widest px-1.5 h-4">
                                                    Draft
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground text-sm truncate mt-1">
                                            {course.description || "No description provided."}
                                        </p>
                                        <div className="flex items-center gap-3 mt-3">
                                            <Badge variant="outline" className="text-[10px] font-medium rounded-full bg-muted/30 border-none px-2.5 h-6 flex items-center gap-1.5">
                                                {(unlockIcons as any)[course.unlock_type] || < Globe className="h-3 w-3" />}
                                                <span className="opacity-80 uppercase tracking-tighter">
                                                    {course.unlock_type.replace('_', ' ')}
                                                </span>
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 text-muted-foreground hover:text-primary"
                                            onClick={(e) => handleDuplicateCourse(course.id, e)}
                                        >
                                            <Copy size={16} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 text-muted-foreground hover:text-destructive"
                                            onClick={(e) => handleDeleteCourse(course.id, e)}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                    <div className="md:hidden">
                                        <MoreVertical size={20} className="text-muted-foreground/40" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            {/* Create Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Create New Course</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-8 py-4">
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
                                    <Card
                                        key={type.id}
                                        className={cn(
                                            "cursor-pointer border transition-all hover:bg-muted/30",
                                            newCourse.unlock_type === type.id ? "border-primary bg-primary/[0.02]" : "border-border"
                                        )}
                                        onClick={() => setNewCourse({ ...newCourse, unlock_type: type.id })}
                                    >
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <div className={cn(
                                                "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                                                newCourse.unlock_type === type.id ? "border-primary border-4" : "border-muted-foreground/30"
                                            )} />
                                            <div>
                                                <p className="text-sm font-bold">{type.label}</p>
                                                <p className="text-[10px] text-muted-foreground">{type.desc}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
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