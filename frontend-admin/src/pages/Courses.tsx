import React, { useEffect, useState, useRef } from 'react';
import api from '../api/client';
import { Plus, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
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
            // Preview locally first
            const localUrl = URL.createObjectURL(file);
            setPreviewUrl(localUrl);

            // Upload to R2
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
                alert('Failed to upload image to storage');
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
            alert(`Failed to ${isEditing ? 'update' : 'create'} course`);
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
        if (!confirm('Are you sure you want to delete this course? All pages and assets will be removed.')) return;

        try {
            await api.delete(`/courses/${courseId}`);
            setCourses(courses.filter(c => c.id !== courseId));
            setOpenMenuId(null);
        } catch (err) {
            alert('Failed to delete course');
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
            alert('Failed to duplicate course');
        }
    };

    return (
        <div className="min-h-screen bg-[#F9F9F9] font-sans">
            <div className="max-w-[1400px] mx-auto p-12 space-y-12">
                {/* Header (Optional) */}
                <div className="hidden">
                    <h1 className="text-3xl font-bold text-gray-900">Courses</h1>
                </div>

                {/* Card Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {courses.map((course) => (
                        <div key={course.id} className="relative group">
                            <Link
                                to={`/courses/${course.id}`}
                                className="bg-white rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full overflow-hidden"
                            >
                                {/* Card Image */}
                                <div className="aspect-[16/10] w-full overflow-hidden transition-all duration-500 rounded-t-[32px] relative bg-gray-50">
                                    {course.cover_url ? (
                                        <img src={course.cover_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full bg-[#E85D7A] flex items-center justify-center relative overflow-hidden">
                                            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    )}

                                    {/* Settings Button */}
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setOpenMenuId(openMenuId === course.id ? null : course.id);
                                        }}
                                        className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-gray-900 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-white active:scale-90"
                                    >
                                        <MoreHorizontal size={20} />
                                    </button>
                                </div>

                                {/* Card Content */}
                                <div className="p-8 flex flex-col flex-1 space-y-2">
                                    <h3 className="text-xl font-bold text-gray-900 tracking-tight transition-colors uppercase">{course.title}</h3>
                                    <p className="text-[15px] font-medium text-gray-400 line-clamp-2 leading-snug flex-1 italic">
                                        {course.description || "No description provided"}
                                    </p>

                                    <div className="pt-4">
                                        <div className="w-full h-8 bg-gray-100 rounded-full relative overflow-hidden">
                                            <div className="absolute inset-y-0 left-0 bg-green-500 w-0 transition-all duration-700" />
                                            <div className="absolute inset-0 flex items-center px-4">
                                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest drop-shadow-sm">0%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className={`pt-2 text-[10px] font-bold uppercase tracking-widest ${course.is_published ? 'text-green-500' : 'text-gray-300'}`}>
                                        {course.is_published ? 'Published' : 'Draft'}
                                    </div>
                                </div>
                            </Link>

                            {/* Context Menu (Geometric Style) */}
                            {openMenuId === course.id && (
                                <div
                                    ref={menuRef}
                                    className="absolute top-16 right-4 w-56 bg-white rounded-3xl shadow-2xl border border-gray-100 py-3 z-30 animate-in fade-in zoom-in duration-200"
                                >
                                    <div className="space-y-1">
                                        <button onClick={(e) => handleEditCourse(course, e)} className="w-full text-left px-6 py-2.5 text-[13px] font-bold text-gray-900 hover:bg-gray-50 flex items-center gap-3">
                                            Edit course
                                        </button>
                                        <button className="w-full text-left px-6 py-2.5 text-[13px] font-bold text-gray-200 cursor-not-allowed flex items-center gap-3">
                                            Move ←
                                        </button>
                                        <button className="w-full text-left px-6 py-2.5 text-[13px] font-bold text-gray-200 cursor-not-allowed flex items-center gap-3">
                                            Move →
                                        </button>
                                        <div className="h-px bg-gray-50 mx-4 my-2" />
                                        <button onClick={(e) => handleDuplicateCourse(course.id, e)} className="w-full text-left px-6 py-2.5 text-[13px] font-bold text-gray-900 hover:bg-gray-50 flex items-center gap-3">
                                            Duplicate course
                                        </button>
                                        <button onClick={() => navigate(`/courses/${course.id}`)} className="w-full text-left px-6 py-2.5 text-[13px] font-bold text-gray-900 hover:bg-gray-50 flex items-center gap-3">
                                            View as member
                                        </button>
                                        <button className="w-full text-left px-6 py-2.5 text-[13px] font-bold text-gray-900 hover:bg-gray-50 flex items-center gap-3">
                                            Share course key
                                        </button>
                                        <div className="h-px bg-gray-50 mx-4 my-2" />
                                        <button onClick={(e) => handleDeleteCourse(course.id, e)} className="w-full text-left px-6 py-2.5 text-[13px] font-bold text-red-500 hover:bg-red-50 flex items-center gap-3">
                                            Delete course
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* New Course Tile */}
                    <div
                        onClick={() => setIsCreating(true)}
                        className="bg-white/50 rounded-[32px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-white hover:border-blue-300 hover:shadow-lg transition-all duration-300 group aspect-[1.1/1]"
                    >
                        <div className="relative mb-4">
                            <Plus size={24} className="text-gray-300 group-hover:text-blue-500 transition-colors" strokeWidth={3} />
                        </div>
                        <span className="text-[15px] font-bold text-gray-400 group-hover:text-blue-500 transition-colors tracking-tight">New course</span>
                    </div>
                </div>

                {/* Pagination */}
                <div className="pt-12 flex flex-col md:flex-row items-center justify-between border-t border-gray-100 gap-8">
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-gray-300 hover:text-gray-900 transition-all text-sm font-bold disabled:opacity-30" disabled>
                            <ChevronLeft size={16} /> Previous
                        </button>

                        <div className="flex items-center">
                            <button className="w-10 h-10 rounded-full bg-[#F3D382] text-gray-900 flex items-center justify-center text-sm font-black shadow-sm ring-4 ring-[#F3D382]/20">
                                1
                            </button>
                        </div>

                        <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-gray-300 hover:text-gray-900 transition-all text-sm font-bold">
                            Next <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="text-[13px] font-bold text-gray-400 tracking-tight">
                        {courses.length > 0 ? `1-${courses.length} of ${courses.length}` : '0 of 0'}
                    </div>
                </div>

                {/* Create/Edit Modal */}
                {isCreating && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6 overflow-y-auto">
                        <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl relative overflow-hidden border border-white/20 animate-in zoom-in duration-300">
                            {/* Modal Header */}
                            <div className="p-10 pb-4 flex justify-between items-center bg-white">
                                <h3 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">{isEditing ? 'Edit course' : 'Add course'}</h3>
                                {!isEditing && <button className="text-blue-600 text-[13px] font-bold hover:underline uppercase tracking-widest">Import with key</button>}
                            </div>

                            <form onSubmit={handleSave} className="p-10 pt-0 space-y-8">
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="Course name"
                                        className="w-full bg-gray-50 border-transparent border p-5 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/20 transition-all outline-none text-lg font-bold placeholder:text-gray-300"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        maxLength={50}
                                        required
                                    />
                                    <div className="text-right text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                        {(formData.title || '').length} / 50
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <textarea
                                        placeholder="Course description"
                                        rows={4}
                                        className="w-full bg-gray-50 border-transparent border p-5 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/20 transition-all outline-none resize-none text-[15px] font-medium placeholder:text-gray-300 italic"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        maxLength={500}
                                    />
                                    <div className="text-right text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                        {(formData.description || '').length} / 500
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-2 bg-gray-50 rounded-2xl border border-gray-100">
                                    {[
                                        { id: 'open', label: 'Open', desc: 'All members' },
                                        { id: 'level_based', label: 'Level', desc: 'Unlock by XP' },
                                        { id: 'time_relative', label: 'Drip', desc: 'Unlock by days' },
                                        { id: 'private', label: 'Private', desc: 'Specific tiers' }
                                    ].map((type) => (
                                        <label
                                            key={type.id}
                                            className={`p-4 flex flex-col rounded-xl cursor-pointer transition-all ${formData.unlock_type === type.id ? 'bg-white shadow-md ring-1 ring-black/5' : 'hover:bg-white/50'}`}
                                        >
                                            <div className="flex items-center mb-1">
                                                <input
                                                    type="radio"
                                                    name="unlock_type"
                                                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                                                    checked={formData.unlock_type === type.id}
                                                    onChange={() => setFormData({ ...formData, unlock_type: type.id })}
                                                />
                                                <span className="ml-2 text-[11px] font-black text-gray-900 uppercase tracking-wider">{type.label}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-bold leading-tight uppercase tracking-tighter opacity-60">{type.desc}</p>
                                        </label>
                                    ))}
                                </div>

                                <div className="flex gap-8 items-center pt-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                    />
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-48 h-32 bg-gray-50 rounded-3xl flex items-center justify-center border-2 border-dashed border-gray-200 group hover:border-blue-400 hover:bg-blue-50/10 transition-all cursor-pointer overflow-hidden relative"
                                    >
                                        {isUploading ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                                                <div className="text-blue-500 font-black text-[10px] tracking-widest uppercase opacity-70">Uploading...</div>
                                            </div>
                                        ) : previewUrl ? (
                                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="text-blue-500 font-black text-[11px] group-hover:scale-110 transition-transform tracking-widest uppercase">Select Cover</div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <h4 className="font-black text-gray-900 text-xs uppercase tracking-widest">Course Cover</h4>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase opacity-60">Recommended: 1460 x 752 px</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="bg-white border-2 border-gray-100 px-6 py-2.5 rounded-xl text-[11px] font-black text-gray-400 hover:text-gray-900 hover:border-gray-900 transition-all uppercase tracking-widest"
                                        >
                                            Change Photo
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                                    <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setFormData({ ...formData, is_published: !formData.is_published })}>
                                        <div className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${formData.is_published ? 'bg-green-500' : 'bg-gray-200'}`}>
                                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-all duration-300 ${formData.is_published ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </div>
                                        <span className={`text-[12px] font-black uppercase tracking-widest transition-colors ${formData.is_published ? 'text-green-600' : 'text-gray-300'}`}>
                                            {formData.is_published ? 'Published' : 'Draft'}
                                        </span>
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            type="button"
                                            onClick={resetForm}
                                            className="px-8 py-3.5 text-[11px] font-black text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!formData.title}
                                            className={`px-12 py-3.5 font-black rounded-2xl uppercase tracking-[0.2em] text-[11px] transition-all shadow-xl active:scale-95 ${formData.title
                                                ? 'bg-[#F3D382] text-[#8E7024] hover:bg-[#EDC561] hover:translate-y-[-2px]'
                                                : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                                                }`}
                                        >
                                            {isEditing ? 'Save Changes' : 'Add Course'}
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
