import React, { useEffect, useState, useRef } from 'react';
import api from '../../api/client';
import { Plus, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Monitor, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface Course {
    id: string;
    title: string;
    description: string;
    cover_url: string;
    unlock_type: string;
    unlock_value: string;
    is_published: boolean;
}

export const Courses: React.FC = () => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState<Course[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        unlock_type: 'open',
        unlock_value: '',
        is_published: true,
        cover_url: ''
    });
    const [isUploading, setIsUploading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const fetchCourses = async () => {
        try {
            const res = await api.get('/courses/');
            setCourses(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const localUrl = URL.createObjectURL(file);
            setPreviewUrl(localUrl);

            setIsUploading(true);
            try {
                const formDataUpload = new FormData();
                formDataUpload.append('file', file);

                const res = await api.post('/upload/upload', formDataUpload, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                setFormData({ ...formData, cover_url: res.data.url });
            } catch (err) {
                console.error('Upload failed:', err);
                alert('Не удалось загрузить изображение');
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing && currentCourseId) {
                const res = await api.patch(`/courses/${currentCourseId}`, formData);
                setCourses(courses.map(c => c.id === currentCourseId ? res.data : c));
            } else {
                const res = await api.post('/courses/', formData);
                setCourses([...courses, res.data]);
            }

            resetForm();
        } catch (err) {
            console.error(err);
            alert(`Не удалось ${isEditing ? 'обновить' : 'создать'} курс`);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            unlock_type: 'open',
            unlock_value: '',
            is_published: true,
            cover_url: ''
        });
        setPreviewUrl(null);
        setIsCreating(false);
        setIsEditing(false);
        setCurrentCourseId(null);
    };

    const handleEditCourse = (course: Course, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setFormData({
            title: course.title || '',
            description: course.description || '',
            unlock_type: course.unlock_type || 'open',
            unlock_value: course.unlock_value || '',
            is_published: course.is_published,
            cover_url: course.cover_url || ''
        });
        setPreviewUrl(course.cover_url || null);
        setIsEditing(true);
        setIsCreating(true);
        setCurrentCourseId(course.id);
        setOpenMenuId(null);
    };

    const handleDeleteCourse = async (courseId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('Вы уверены, что хотите удалить этот курс? Все страницы и файлы будут удалены.')) return;

        try {
            await api.delete(`/courses/${courseId}`);
            setCourses(courses.filter(c => c.id !== courseId));
            setOpenMenuId(null);
        } catch (err) {
            alert('Не удалось удалить курс');
        }
    };

    const handleDuplicateCourse = async (courseId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            const res = await api.post(`/courses/${courseId}/duplicate`);
            setCourses([...courses, res.data]);
            setOpenMenuId(null);
        } catch (err) {
            alert('Не удалось дублировать курс');
        }
    };

    return (
        <div className="min-h-screen bg-[#F9FAFB] font-sans pb-32">
            <div className="max-w-7xl mx-auto p-4 md:p-12 space-y-8">
                {/* Header Style Skool */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight uppercase">Курсы</h1>
                        <p className="text-gray-500 font-bold mt-2 text-sm md:text-base italic">Ваша база знаний обучения.</p>
                    </div>
                </div>

                {/* Card Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                    {courses.map((course) => (
                        <div key={course.id} className="relative group">
                            <Link
                                to={`/courses/${course.id}`}
                                className="bg-white rounded-[24px] md:rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full overflow-hidden hover:-translate-y-1"
                            >
                                {/* Card Image */}
                                <div className="aspect-[16/10] w-full overflow-hidden relative bg-[#0056D2]/5">
                                    {course.cover_url ? (
                                        <img src={course.cover_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full bg-[#0056D2] flex items-center justify-center">
                                            <Monitor size={32} className="text-white/20" />
                                        </div>
                                    )}

                                    {/* Settings Button */}
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setOpenMenuId(openMenuId === course.id ? null : course.id);
                                        }}
                                        className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md rounded-xl flex items-center justify-center text-gray-900 shadow-lg opacity-0 group-hover:opacity-100 transition-all z-20 hover:bg-white active:scale-95"
                                    >
                                        <Settings size={18} strokeWidth={2.5} />
                                    </button>

                                    <div className="absolute top-4 left-4">
                                        <div className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm backdrop-blur-md ${course.is_published ? 'bg-green-500/90 text-white' : 'bg-gray-500/90 text-white'}`}>
                                            {course.is_published ? 'Live' : 'Draft'}
                                        </div>
                                    </div>
                                </div>

                                {/* Card Content */}
                                <div className="p-6 md:p-8 flex flex-col flex-1 space-y-3">
                                    <h3 className="text-lg md:text-xl font-black text-gray-900 tracking-tight leading-tight group-hover:text-[#0056D2] transition-colors">
                                        {course.title}
                                    </h3>
                                    <p className="text-sm font-bold text-gray-400 line-clamp-2 leading-relaxed flex-1 italic opacity-80">
                                        {course.description || "Минималистичное описание курса для ваших студентов."}
                                    </p>

                                    <div className="pt-4 space-y-3">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Прогресс обучения</span>
                                            <span className="text-[10px] font-black text-blue-600">0%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#0056D2] w-0 transition-all duration-700" />
                                        </div>
                                    </div>
                                </div>
                            </Link>

                            {/* Context Menu (Geometric Style) */}
                            {openMenuId === course.id && (
                                <div
                                    ref={menuRef}
                                    className="absolute top-16 right-4 w-64 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 py-3 z-30 animate-in fade-in zoom-in duration-200"
                                >
                                    <div className="space-y-1">
                                        <button onClick={(e) => handleEditCourse(course, e)} className="w-full text-left px-6 py-3 text-xs font-black text-gray-900 hover:bg-gray-50 flex items-center gap-3 uppercase tracking-wider">
                                            Настройки курса
                                        </button>
                                        <button onClick={(e) => handleDuplicateCourse(course.id, e)} className="w-full text-left px-6 py-3 text-xs font-black text-gray-900 hover:bg-gray-50 flex items-center gap-3 uppercase tracking-wider">
                                            Дублировать
                                        </button>
                                        <button onClick={() => navigate(`/courses/${course.id}`)} className="w-full text-left px-6 py-3 text-xs font-black text-[#0056D2] hover:bg-blue-50 flex items-center gap-3 uppercase tracking-wider">
                                            Открыть редактор
                                        </button>
                                        <div className="h-px bg-gray-50 mx-4 my-2" />
                                        <button onClick={(e) => handleDeleteCourse(course.id, e)} className="w-full text-left px-6 py-3 text-xs font-black text-red-500 hover:bg-red-50 flex items-center gap-3 uppercase tracking-wider">
                                            Удалить навсегда
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* New Course Tile */}
                    <div
                        onClick={() => setIsCreating(true)}
                        className="bg-white/50 rounded-[24px] md:rounded-[32px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-white hover:border-[#0056D2] hover:shadow-lg transition-all duration-300 group aspect-[1.1/1]"
                    >
                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-50 transition-colors">
                            <Plus size={24} className="text-gray-300 group-hover:text-[#0056D2] transition-colors" strokeWidth={3} />
                        </div>
                        <span className="text-sm font-black text-gray-400 group-hover:text-[#0056D2] transition-colors tracking-widest uppercase">Новый курс</span>
                    </div>
                </div>

                {/* Pagination */}
                <div className="pt-12 flex flex-col md:flex-row items-center justify-between border-t border-gray-100 gap-8">
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-gray-300 hover:text-gray-900 transition-all text-xs font-black uppercase tracking-widest disabled:opacity-30" disabled>
                            <ChevronLeft size={16} /> Назад
                        </button>

                        <div className="flex items-center">
                            <button className="w-10 h-10 rounded-xl bg-[#0056D2] text-white flex items-center justify-center text-xs font-black shadow-lg shadow-blue-100">
                                1
                            </button>
                        </div>

                        <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-gray-300 hover:text-gray-900 transition-all text-xs font-black uppercase tracking-widest">
                            Вперед <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="text-[11px] font-black text-gray-400 tracking-widest uppercase">
                        {courses.length > 0 ? `1-${courses.length} ИЗ ${courses.length}` : '0 ИЗ 0'}
                    </div>
                </div>

                {/* Create/Edit Modal */}
                {isCreating && (
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-start md:items-center justify-center z-50 md:p-6 overflow-y-auto">
                        <div className="bg-white rounded-none md:rounded-[40px] w-full md:max-w-2xl min-h-screen md:min-h-0 shadow-2xl relative overflow-hidden border-x border-b md:border border-white/20 animate-in slide-in-from-bottom-10 md:zoom-in duration-300">
                            {/* Modal Header */}
                            <div className="p-8 md:p-12 pb-4 flex justify-between items-center bg-white">
                                <h3 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tighter uppercase">{isEditing ? 'Настройки курса' : 'Новый курс'}</h3>
                            </div>

                            <form onSubmit={handleSave} className="p-8 md:p-12 pt-0 space-y-8">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Название курса</label>
                                        <input
                                            type="text"
                                            placeholder="например: Мастерство Кройки и Шитья"
                                            className="w-full bg-gray-50 border-transparent border p-5 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all outline-none text-lg font-bold placeholder:text-gray-200"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            maxLength={50}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Краткое описание</label>
                                        <textarea
                                            placeholder="О чем этот курс?"
                                            rows={3}
                                            className="w-full bg-gray-50 border-transparent border p-5 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all outline-none resize-none text-[15px] font-medium placeholder:text-gray-200 italic"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            maxLength={500}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Тип доступа</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: 'open', label: 'Открытый', icon: CheckCircle },
                                            { id: 'private', label: 'Приватный', icon: AlertTriangle }
                                        ].map((type) => (
                                            <label
                                                key={type.id}
                                                className={`p-4 flex items-center gap-3 rounded-2xl cursor-pointer transition-all border ${formData.unlock_type === type.id ? 'bg-blue-50 border-blue-100 ring-2 ring-blue-50' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="unlock_type"
                                                    className="hidden"
                                                    checked={formData.unlock_type === type.id}
                                                    onChange={() => setFormData({ ...formData, unlock_type: type.id })}
                                                />
                                                <type.icon size={18} className={formData.unlock_type === type.id ? 'text-[#0056D2]' : 'text-gray-400'} />
                                                <span className={`text-xs font-black uppercase tracking-wider ${formData.unlock_type === type.id ? 'text-[#0056D2]' : 'text-gray-400'}`}>{type.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-8 items-start md:items-center py-4 border-y border-gray-50">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                    />
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full md:w-48 h-32 bg-gray-50 rounded-[24px] flex items-center justify-center border-2 border-dashed border-gray-100 group hover:border-[#0056D2] hover:bg-blue-50/10 transition-all cursor-pointer overflow-hidden relative"
                                    >
                                        {isUploading ? (
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0056D2]" />
                                        ) : previewUrl ? (
                                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <Plus size={20} className="text-gray-300" />
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <h4 className="font-black text-gray-900 text-xs uppercase tracking-widest">Обложка курса</h4>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase opacity-60">1460 x 752 px (рекомендуем)</p>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-[11px] font-black text-[#0056D2] uppercase tracking-widest hover:underline"
                                        >
                                            Загрузить новое фото
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4">
                                    <label className="flex items-center gap-4 group cursor-pointer w-full md:w-auto" onClick={() => setFormData({ ...formData, is_published: !formData.is_published })}>
                                        <div className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${formData.is_published ? 'bg-green-500' : 'bg-gray-200'}`}>
                                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-all duration-300 ${formData.is_published ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </div>
                                        <span className={`text-[12px] font-black uppercase tracking-widest ${formData.is_published ? 'text-green-600' : 'text-gray-300'}`}>
                                            {formData.is_published ? 'Опубликован' : 'Черновик'}
                                        </span>
                                    </label>

                                    <div className="flex gap-4 w-full md:w-auto">
                                        <button
                                            type="button"
                                            onClick={resetForm}
                                            className="flex-1 md:flex-none px-6 py-4 text-[11px] font-black text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-all"
                                        >
                                            Отмена
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!formData.title || isUploading}
                                            className="flex-1 md:flex-none px-12 py-4 bg-[#0056D2] text-white font-black rounded-xl uppercase tracking-[0.2em] text-[11px] transition-all shadow-xl shadow-blue-100 active:scale-95 disabled:opacity-50"
                                        >
                                            {isEditing ? 'Сохранить' : 'Создать'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
