import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/client';
import { ChevronDown, ChevronUp, Box, ArrowLeft, CheckCircle, Monitor, Settings, Plus } from 'lucide-react';
import { RichTextEditor } from '../components/RichTextEditor';

// DND Kit Imports
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

interface Course {
    id: string;
    title: string;
    is_published: boolean;
}

interface Folder {
    id: string;
    title: string;
    unlock_type: 'immediate' | 'level_based' | 'time_relative' | 'time_fixed';
    unlock_value?: string;
    order_index: number;
}

interface Page {
    id: string;
    title: string;
    video_provider?: 'youtube_unlisted' | 'mux' | 'vimeo' | null;
    video_id?: string | null;
    module_id: string;
    content?: string;
    order_index: number;
}

// --- Sortable Item Component ---
interface SortableItemProps {
    id: string;
    children: React.ReactNode;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, children }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 60 : 'auto',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="relative group transition-all duration-200 outline-none"
        >
            {children}
        </div>
    );
};

export const CourseEditor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [course, setCourse] = useState<Course | null>(null);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [pages, setPages] = useState<{ [folderId: string]: Page[] }>({});
    const [activePageId, setActivePageId] = useState<string | null>(null);
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [openPageMenu, setOpenPageMenu] = useState<string | null>(null);
    const [openFolderMenu, setOpenFolderMenu] = useState<string | null>(null);
    const [mobileView, setMobileView] = useState<'sidebar' | 'editor'>('sidebar');

    const [editingPageId, setEditingPageId] = useState<string | null>(null);

    // DND Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Form states for modals (Add/Edit)
    const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [isAddPageModalOpen, setIsAddPageModalOpen] = useState<string | null>(null);
    const [formTitle, setFormTitle] = useState('');
    const [richContent, setRichContent] = useState('');
    const [formUnlockType, setFormUnlockType] = useState<'immediate' | 'level_based' | 'time_relative' | 'time_fixed'>('immediate');
    const [formUnlockValue, setFormUnlockValue] = useState('');

    useEffect(() => {
        if (id) {
            fetchCourse();
            fetchFolders();
        }
    }, [id]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.context-menu-trigger') && !target.closest('.context-menu-content')) {
                setOpenPageMenu(null);
                setOpenFolderMenu(null);
                setIsAddMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchCourse = async () => {
        try {
            const res = await api.get(`/courses/${id}`);
            setCourse(res.data);
        } catch (err) {
            console.error('Не удалось загрузить курс', err);
        }
    };

    const fetchFolders = async () => {
        try {
            const res = await api.get(`/courses/${id}/modules`);
            const sortedFolders = res.data.sort((a: Folder, b: Folder) => a.order_index - b.order_index);
            setFolders(sortedFolders);
            sortedFolders.forEach((m: Folder) => fetchPages(m.id));
        } catch (err) {
            console.error(err);
        }
    };

    const fetchPages = async (folderId: string) => {
        try {
            const res = await api.get(`/courses/modules/${folderId}/lessons`);
            const sortedPages = res.data.sort((a: Page, b: Page) => a.order_index - b.order_index);
            setPages(prev => ({ ...prev, [folderId]: sortedPages }));
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddFolder = async () => {
        if (!formTitle) return;
        try {
            if (editingFolderId) {
                const res = await api.patch(`/courses/modules/${editingFolderId}`, {
                    title: formTitle,
                    unlock_type: formUnlockType,
                    unlock_value: formUnlockValue
                });
                setFolders(folders.map(f => f.id === editingFolderId ? res.data : f));
            } else {
                const res = await api.post(`/courses/${id}/modules`, {
                    title: formTitle,
                    unlock_type: formUnlockType,
                    unlock_value: formUnlockValue,
                    order_index: folders.length
                });
                setFolders([...folders, res.data]);
            }
            resetForm();
        } catch (err) {
            alert('Не удалось сохранить папку');
        }
    };

    const resetForm = () => {
        setFormTitle('');
        setFormUnlockType('immediate');
        setFormUnlockValue('');
        setIsAddFolderModalOpen(false);
        setEditingFolderId(null);
        setIsAddPageModalOpen(null);
        setEditingPageId(null);
    };

    const handleEditPage = async (folderId: string) => {
        if (!formTitle || !editingPageId) return;
        try {
            await api.patch(`/courses/lessons/${editingPageId}`, { title: formTitle });
            setPages(prev => ({
                ...prev,
                [folderId]: prev[folderId].map(p => p.id === editingPageId ? { ...p, title: formTitle } : p)
            }));
            resetForm();
        } catch (err) {
            alert('Не удалось переименовать страницу');
        }
    };

    const handleDuplicateFolder = async (folderId: string) => {
        try {
            const res = await api.post(`/courses/modules/${folderId}/duplicate`);
            const newFolder = res.data;
            setFolders([...folders, newFolder]);
            fetchPages(newFolder.id);
            setOpenFolderMenu(null);
        } catch (err) {
            alert('Не удалось дублировать папку');
        }
    };

    const handleDeleteFolder = async (folderId: string) => {
        if (!window.confirm('Удалить эту папку и все страницы внутри нее?')) return;
        try {
            await api.delete(`/courses/modules/${folderId}`);
            setFolders(folders.filter(f => f.id !== folderId));
            const newPages = { ...pages };
            delete newPages[folderId];
            setPages(newPages);
            setOpenFolderMenu(null);
        } catch (err) {
            alert('Не удалось удалить папку');
        }
    };

    const handleAddPage = async (folderId: string) => {
        if (!formTitle) return;
        try {
            const res = await api.post(`/courses/modules/${folderId}/lessons`, {
                title: formTitle,
                order_index: (pages[folderId] || []).length
            });
            setPages(prev => ({
                ...prev,
                [folderId]: [...(prev[folderId] || []), res.data]
            }));
            resetForm();
            selectPage(res.data.id);
        } catch (err) {
            alert('Не удалось добавить страницу');
        }
    };

    const handleDeletePage = async (folderId: string, pageId: string) => {
        if (!window.confirm('Удалить эту страницу?')) return;
        try {
            await api.delete(`/courses/lessons/${pageId}`);
            setPages(prev => ({
                ...prev,
                [folderId]: prev[folderId].filter(p => p.id !== pageId)
            }));
            if (activePageId === pageId) selectPage(null);
        } catch (err) {
            alert('Не удалось удалить страницу');
        }
    };

    const handleSaveContent = async () => {
        if (!activePageId) return;
        try {
            await api.patch(`/courses/lessons/${activePageId}`, { content: richContent });
            const allPagesList = Object.values(pages).flat();
            const page = allPagesList.find(p => p.id === activePageId);
            if (page) {
                const folderId = page.module_id;
                setPages(prev => ({
                    ...prev,
                    [folderId]: prev[folderId].map(p => p.id === activePageId ? { ...p, content: richContent } : p)
                }));
            }
            alert('Сохранено успешно');
        } catch (err) {
            alert('Не удалось сохранить содержимое');
        }
    };

    const findContainer = (id: string) => {
        if (folders.some(f => f.id === id)) return id;
        return Object.keys(pages).find(key => pages[key].some(p => p.id === id));
    };

    const selectPage = (pageId: string | null) => {
        setActivePageId(pageId);
        if (!pageId) {
            setRichContent('');
            if (window.innerWidth < 768) setMobileView('sidebar');
            return;
        }
        const page = Object.values(pages).flat().find(p => p.id === pageId);
        setRichContent(page?.content || '');
        if (window.innerWidth < 768) setMobileView('editor');
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        const activeId = active.id as string;
        const overId = over?.id as string;
        if (!overId || activeId === overId) return;
        const activeContainer = findContainer(activeId);
        const overContainer = findContainer(overId);
        if (!activeContainer || !overContainer || activeContainer === overContainer) return;
        const isActiveFolder = folders.some(f => f.id === activeId);
        if (isActiveFolder) return;

        setPages(prev => {
            const activeItems = prev[activeContainer];
            const overItems = prev[overContainer] || [];
            const activeIndex = activeItems.findIndex(p => p.id === activeId);
            const overIndex = overItems.findIndex(p => p.id === overId);
            let newIndex;
            if (folders.some(f => f.id === overId)) {
                newIndex = overItems.length;
            } else {
                const isBelowLastItem = over && overIndex === overItems.length - 1;
                newIndex = overIndex >= 0 ? overIndex + (isBelowLastItem ? 1 : 0) : overItems.length;
            }
            const itemToMove = activeItems[activeIndex];
            if (!itemToMove) return prev;
            return {
                ...prev,
                [activeContainer]: activeItems.filter(p => p.id !== activeId),
                [overContainer]: [
                    ...overItems.slice(0, newIndex),
                    { ...itemToMove, module_id: overContainer },
                    ...overItems.slice(newIndex)
                ]
            };
        });
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;
        const activeId = active.id as string;
        const overId = over.id as string;

        const isActiveFolder = folders.some(f => f.id === activeId);
        if (isActiveFolder) {
            const oldIndex = folders.findIndex(f => f.id === activeId);
            const newIndex = folders.findIndex(f => f.id === overId);
            if (newIndex !== -1 && oldIndex !== newIndex) {
                const newFolders = arrayMove(folders, oldIndex, newIndex);
                setFolders(newFolders);
                try {
                    await api.post('/courses/reorder/modules', newFolders.map((f, idx) => ({ id: f.id, order_index: idx })));
                } catch (err) { console.error(err); }
            }
            return;
        }

        const activeCont = findContainer(activeId);
        const overCont = findContainer(overId);
        if (activeCont && overCont) {
            if (activeCont !== overCont) {
                try { await api.patch(`/courses/lessons/${activeId}`, { module_id: overCont }); }
                catch (err) { console.error(err); }
            }
            try {
                const reordered = pages[overCont].map((p, idx) => ({ id: p.id, order_index: idx }));
                await api.post('/courses/reorder/lessons', reordered);
                if (activeCont !== overCont) {
                    const reorderedOld = pages[activeCont].map((p, idx) => ({ id: p.id, order_index: idx }));
                    await api.post('/courses/reorder/lessons', reorderedOld);
                }
            } catch (err) { console.error(err); }
        }
    };

    if (!course) return <div className="h-screen flex items-center justify-center bg-gray-50 uppercase font-black text-gray-300">Loading...</div>;

    const allPagesArray = Object.values(pages).flat();
    const currentPage = allPagesArray.find(p => p.id === activePageId);

    return (
        <div className="h-screen bg-[#F9F9F9] flex flex-col font-sans overflow-hidden">
            {/* ГЛАВНАЯ ОБЛАСТЬ (FLEX ROW) */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* 1. SIDEBAR (ЗАКРЫВАЕТСЯ ТЕПЕРЬ ОТДЕЛЬНО) */}
                <aside className={`
                    ${mobileView === 'sidebar' ? 'flex' : 'hidden'} 
                    md:flex w-full md:w-[320px] bg-white md:bg-transparent border-r border-gray-100 flex-col overflow-hidden shrink-0 transition-all duration-300
                `}>
                    {/* Mobile Header */}
                    <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-50 flex-none bg-white sticky top-0 z-50">
                        <Link to="/courses" className="p-2 -ml-2 text-gray-400 hover:text-gray-900"><ArrowLeft size={22} /></Link>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[#FF4F66] flex items-center justify-center text-white font-black text-sm">K</div>
                            <span className="font-bold text-[15px] tracking-tight text-gray-900">karl</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button className="p-2 text-gray-400"><Monitor size={20} /></button>
                            <button className="p-2 text-gray-400"><Settings size={20} /></button>
                        </div>
                    </div>

                    <div className="p-6 md:p-6 space-y-8 flex-1 overflow-y-auto scrollbar-hide">
                        <div className="md:block hidden">
                            <Link to="/courses" className="flex items-center gap-2 text-[11px] font-black text-gray-400 hover:text-gray-900 uppercase tracking-widest mb-2">
                                <ArrowLeft size={14} strokeWidth={3} /> Назад
                            </Link>
                        </div>

                        <div className="space-y-4 md:pr-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl md:text-xl font-bold text-gray-900 tracking-tight">{course.title}</h2>
                                <button className="md:p-1.5 hover:bg-gray-50 rounded-lg transition-colors"><ChevronDown size={18} className="text-gray-400" /></button>
                            </div>
                            <div className="w-full h-8 bg-gray-100 rounded-full overflow-hidden relative">
                                <div className="absolute inset-y-0 left-0 bg-[#00A86B] transition-all duration-700 ease-out" style={{ width: '33%' }} />
                                <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white uppercase tracking-widest">33%</div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragOver={handleDragOver} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
                                <SortableContext items={folders.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-4">
                                        {folders.map(folder => (
                                            <SortableItem key={folder.id} id={folder.id}>
                                                <div className="space-y-3">
                                                    <div onClick={(e) => { e.stopPropagation(); setOpenFolderMenu(openFolderMenu === folder.id ? null : folder.id); }} className="px-1 flex items-center justify-between group/folder cursor-pointer transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <ChevronDown size={20} className={`text-gray-400 transition-transform ${openFolderMenu === folder.id ? 'rotate-180' : ''}`} />
                                                            <h3 className="text-[17px] font-bold text-gray-900 tracking-tight">{folder.title}</h3>
                                                        </div>
                                                        <div className="relative">
                                                            <button className={`context-menu-trigger p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-50 ${openFolderMenu === folder.id ? 'opacity-100' : 'opacity-40 group-hover/folder:opacity-100'}`}><Monitor size={20} className="rotate-90" /></button>
                                                            {openFolderMenu === folder.id && (
                                                                <div className="context-menu-content absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                                    <button onClick={(e) => { e.stopPropagation(); setEditingFolderId(folder.id); setFormTitle(folder.title); setFormUnlockType(folder.unlock_type || 'immediate'); setFormUnlockValue(folder.unlock_value || ''); setIsAddFolderModalOpen(true); setOpenFolderMenu(null); }} className="w-full text-left px-5 py-3 text-[14px] font-bold text-gray-800 hover:bg-gray-50">Настройки папки</button>
                                                                    <button onClick={(e) => { e.stopPropagation(); setIsAddPageModalOpen(folder.id); setFormTitle(''); setOpenFolderMenu(null); }} className="w-full text-left px-5 py-3 text-[14px] font-bold text-gray-800 hover:bg-gray-50 border-t border-gray-50">Добавить страницу</button>
                                                                    <button onClick={(e) => { e.stopPropagation(); handleDuplicateFolder(folder.id); }} className="w-full text-left px-5 py-3 text-[14px] font-bold text-gray-800 hover:bg-gray-50">Дублировать</button>
                                                                    <div className="h-px bg-gray-50 my-1 mx-3" />
                                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }} className="w-full text-left px-5 py-3 text-[14px] font-bold text-red-500 hover:bg-red-50">Удалить</button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <SortableContext items={(pages[folder.id] || []).map(p => p.id)} strategy={verticalListSortingStrategy}>
                                                        <div className="space-y-4 ml-8 min-h-[4px]">
                                                            {(pages[folder.id] || []).map(page => (
                                                                <SortableItem key={page.id} id={page.id}>
                                                                    <div onClick={() => selectPage(page.id)} className={`w-full group/page relative flex items-center justify-between py-2 rounded-xl cursor-pointer transition-all duration-200`}>
                                                                        <span className={`text-[16px] font-medium tracking-tight ${activePageId === page.id ? 'text-blue-600 font-bold' : 'text-gray-800 group-hover/page:text-gray-900'}`}>{page.title}</span>
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="relative">
                                                                                <button onClick={(e) => { e.stopPropagation(); setOpenPageMenu(openPageMenu === page.id ? null : page.id); }} className={`context-menu-trigger p-2 rounded-lg text-gray-300 hover:text-gray-900 ${openPageMenu === page.id ? 'opacity-100' : 'opacity-40 group-hover/page:opacity-100'}`}><Monitor size={18} className="rotate-90" /></button>
                                                                                {openPageMenu === page.id && (
                                                                                    <div className="context-menu-content absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                                                        <button onClick={(e) => { e.stopPropagation(); setEditingPageId(page.id); setFormTitle(page.title); setOpenPageMenu(null); }} className="w-full text-left px-5 py-3 text-[14px] font-bold text-gray-800 hover:bg-gray-50">Настройки страницы</button>
                                                                                        <button onClick={(e) => { e.stopPropagation(); handleDeletePage(folder.id, page.id); setOpenPageMenu(null); }} className="w-full text-left px-5 py-3 text-[14px] font-bold text-red-500 hover:bg-red-50 border-t border-gray-50">Удалить</button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className="w-6 h-6 rounded-full bg-[#00A86B] flex items-center justify-center text-white shrink-0"><CheckCircle size={16} strokeWidth={3} /></div>
                                                                        </div>
                                                                    </div>
                                                                </SortableItem>
                                                            ))}
                                                        </div>
                                                    </SortableContext>
                                                </div>
                                            </SortableItem>
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>

                        {/* ADD MENU SECTION */}
                        <div className="mt-8 space-y-3 shrink-0 relative z-[100] pb-24 md:pb-0">
                            <div className="md:hidden grid grid-cols-2 gap-3">
                                <button onClick={() => { const firstF = folders[0]?.id; if (firstF) setIsAddPageModalOpen(firstF); else setIsAddFolderModalOpen(true); }} className="flex-1 flex flex-col items-center justify-center gap-2 p-6 bg-blue-600 text-white rounded-3xl shadow-xl border-b-4 border-blue-800"><Plus size={24} strokeWidth={3} />Урок</button>
                                <button onClick={() => setIsAddFolderModalOpen(true)} className="flex-1 flex flex-col items-center justify-center gap-2 p-6 bg-white text-gray-900 border border-gray-100 rounded-3xl shadow-lg border-b-4 border-gray-200"><Box size={24} className="text-gray-400" />Папка</button>
                            </div>
                            <div className="hidden md:block relative">
                                <button onClick={() => setIsAddMenuOpen(!isAddMenuOpen)} className={`context-menu-trigger w-full flex items-center justify-between p-4 rounded-2xl transition-all ${isAddMenuOpen ? 'bg-blue-600 text-white' : 'bg-[#F3D382] text-[#8E7024]'}`}>
                                    <span className="text-sm font-bold uppercase tracking-widest">Новая страница</span>
                                    <ChevronUp size={16} className={`transform transition-transform ${isAddMenuOpen ? '' : 'rotate-180'}`} />
                                </button>
                                {isAddMenuOpen && (
                                    <div className="context-menu-content absolute left-0 bottom-full mb-2 w-full bg-white rounded-[24px] shadow-2xl border border-gray-100 py-2 z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                        <button onClick={() => { const firstF = folders[0]?.id; if (firstF) setIsAddPageModalOpen(firstF); else setIsAddFolderModalOpen(true); setIsAddMenuOpen(false); }} className="w-full text-left px-6 py-4 hover:bg-gray-50 text-[15px] font-bold text-gray-900">Добавить страницу</button>
                                        <button onClick={() => { setIsAddFolderModalOpen(true); setIsAddMenuOpen(false); }} className="w-full text-left px-6 py-4 hover:bg-gray-50 text-[15px] font-bold text-gray-900 border-t border-gray-50">Добавить папку</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* 2. EDITOR AREA (ТЕПЕРЬ СОСЕД, А НЕ РЕБЕНОК СИДБАРА) */}
                <main className={`
                    ${mobileView === 'editor' ? 'flex' : 'hidden'} 
                    md:flex flex-1 flex-col bg-white overflow-hidden m-0 md:m-6 md:rounded-[40px] border-none md:border border-gray-100 shadow-none md:shadow-sm relative
                `}>
                    {activePageId ? (
                        <div className="flex-1 flex flex-col overflow-hidden bg-white">
                            {/* Editor Header - Matches Screenshot */}
                            <div className="flex-1 overflow-y-auto bg-white scrollbar-hide">
                                <div className="max-w-4xl mx-auto px-0 py-0 space-y-0">
                                    <RichTextEditor
                                        key={activePageId}
                                        title={currentPage?.title || 'New page'}
                                        content={richContent}
                                        onChange={setRichContent}
                                    />

                                    {/* Action row: Add and Published */}
                                    <div className="flex items-center justify-between pt-10">
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                                                className="flex items-center gap-2 border border-gray-200 px-4 py-3 rounded-xl text-gray-400 font-medium"
                                            >
                                                ADD <ChevronDown size={14} />
                                            </button>
                                            {isAddMenuOpen && (
                                                <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                                                    <button onClick={() => { const firstF = folders[0]?.id; if (firstF) setIsAddPageModalOpen(firstF); setIsAddMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm font-medium text-gray-900">Add Page</button>
                                                    <button onClick={() => { setIsAddFolderModalOpen(true); setIsAddMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm font-medium text-gray-900 border-t border-gray-50">Add Folder</button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className="text-[#00A86B] font-bold text-sm">Published</span>
                                            <button
                                                onClick={async () => {
                                                    if (!currentPage) return;
                                                    try {
                                                        !course.is_published;
                                                        // Note: This is simplified, usually we'd toggle page status if available, 
                                                        // but the screenshot shows "Published" toggle.
                                                        // Assuming it's for the page or global course for now as per screenshot.
                                                        // For now just local state for UI demonstration if needed, 
                                                        // but better to use existing course published state for UI.
                                                    } catch (err) { }
                                                }}
                                                className={`w-12 h-6 rounded-full transition-colors relative ${course.is_published ? 'bg-[#00A86B]' : 'bg-gray-200'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${course.is_published ? 'right-1' : 'left-1'}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Bottom Buttons - Stacked on Mobile */}
                                    <div className="flex flex-col gap-3 pb-20">
                                        <button
                                            onClick={handleSaveContent}
                                            className="w-full bg-[#E8E8E8] text-gray-500 py-4 rounded-xl font-bold uppercase tracking-wider hover:bg-gray-200 transition-all shadow-sm"
                                        >
                                            SAVE
                                        </button>
                                        <button
                                            onClick={() => selectPage(null)}
                                            className="w-full border border-gray-200 text-gray-400 py-4 rounded-xl font-bold uppercase tracking-wider hover:bg-gray-50 transition-all"
                                        >
                                            CANCEL
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-200 gap-4 p-6 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100"><Box size={32} className="opacity-20" /></div>
                            <p className="font-black text-xs uppercase tracking-[0.3em] opacity-30">Выберите страницу или создайте новую</p>
                            <button onClick={() => setMobileView('sidebar')} className="md:hidden mt-4 px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl font-black text-[11px] uppercase tracking-widest">К списку уроков</button>
                        </div>
                    )}
                </main>
            </div>

            {/* 3. MODALS (ВНЕ ОСНОВНОГО КОНТЕЙНЕРА) */}
            {(isAddFolderModalOpen || isAddPageModalOpen || editingPageId) && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[10000] p-4 transition-all duration-300">
                    <div className="bg-white rounded-[40px] w-full max-w-[360px] p-10 space-y-8 animate-in fade-in zoom-in duration-300 shadow-2xl relative border border-gray-50">
                        <div className="space-y-2 text-center">
                            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                                {isAddFolderModalOpen ? (editingFolderId ? 'Настройки' : 'Новая папка') : (editingPageId ? 'Настройки' : 'Новый урок')}
                            </h3>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] opacity-60">Укажите название</p>
                        </div>
                        <input autoFocus className="w-full bg-gray-50 border-2 border-gray-50 focus:border-blue-600 p-6 rounded-[24px] outline-none text-lg font-bold text-center" placeholder="Название..." value={formTitle} onChange={e => setFormTitle(e.target.value)} onKeyDown={e => {
                            if (e.key === 'Enter') {
                                if (isAddFolderModalOpen) handleAddFolder();
                                else if (editingPageId) {
                                    const page = Object.values(pages).flat().find(p => p.id === editingPageId);
                                    if (page) handleEditPage(page.module_id);
                                } else handleAddPage(isAddPageModalOpen!);
                            }
                        }} />
                        {isAddFolderModalOpen && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-3">
                                    {[{ id: 'immediate', label: 'Сразу', icon: CheckCircle }, { id: 'level_based', label: 'По рейтингу', icon: Monitor }].map((type) => (
                                        <button key={type.id} onClick={() => setFormUnlockType(type.id as any)} className={`p-5 flex flex-col items-center gap-3 rounded-[24px] border-2 transition-all ${formUnlockType === type.id ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'}`}>
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formUnlockType === type.id ? 'bg-white/20' : 'bg-gray-50'}`}><type.icon size={20} /></div>
                                            <span className="text-[9px] font-black uppercase tracking-widest">{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                                {formUnlockType === 'level_based' && (
                                    <input type="number" placeholder="Уровень..." className="w-full bg-gray-50 p-5 rounded-[20px] outline-none text-sm font-bold text-center" value={formUnlockValue} onChange={e => setFormUnlockValue(e.target.value)} />
                                )}
                            </div>
                        )}
                        <div className="flex flex-col gap-3 pt-2">
                            <button onClick={() => {
                                if (isAddFolderModalOpen) handleAddFolder();
                                else if (editingPageId) {
                                    const page = Object.values(pages).flat().find(p => p.id === editingPageId);
                                    if (page) handleEditPage(page.module_id);
                                } else handleAddPage(isAddPageModalOpen!);
                            }} className="w-full bg-blue-600 text-white p-6 rounded-[24px] text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 transition-all">Готово</button>
                            <button onClick={resetForm} className="w-full py-4 text-[10px] font-black text-gray-300 hover:text-gray-900 transition-colors uppercase tracking-[0.3em]">Закрыть</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
