import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/client';
import { ChevronDown, ChevronUp, Edit3, Box, ArrowLeft, CheckCircle, Monitor, Settings, List, Plus } from 'lucide-react';
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
    const [isAddPageModalOpen, setIsAddPageModalOpen] = useState<string | null>(null); // folderId
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

    // Handle click outside to close menus
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            // Check if clicking outside of current menus
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
                // Update
                const res = await api.patch(`/courses/modules/${editingFolderId}`, {
                    title: formTitle,
                    unlock_type: formUnlockType,
                    unlock_value: formUnlockValue
                });
                setFolders(folders.map(f => f.id === editingFolderId ? res.data : f));
            } else {
                // Create
                const res = await api.post(`/courses/${id}/modules`, {
                    title: formTitle,
                    unlock_type: formUnlockType,
                    unlock_value: formUnlockValue,
                    order_index: folders.length
                });
                setFolders([...folders, res.data]);
            }
            setFormTitle('');
            setFormUnlockType('immediate');
            setFormUnlockValue('');
            setIsAddFolderModalOpen(false);
            setEditingFolderId(null);
        } catch (err) {
            alert('Не удалось сохранить папку');
        }
    };

    const handleEditPage = async (folderId: string) => {
        if (!formTitle || !editingPageId) return;
        try {
            await api.patch(`/courses/lessons/${editingPageId}`, { title: formTitle });
            setPages(prev => ({
                ...prev,
                [folderId]: prev[folderId].map(p => p.id === editingPageId ? { ...p, title: formTitle } : p)
            }));
            setFormTitle('');
            setEditingPageId(null);
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
            setFormTitle('');
            setIsAddPageModalOpen(null);
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
            await api.patch(`/courses/lessons/${activePageId}`, {
                content: richContent
            });
            // Update local state
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

    // Filter to get all pages for easier listing
    const allPagesArray = Object.values(pages).flat();
    const currentPage = allPagesArray.find(p => p.id === activePageId);

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

    // --- DND HANDLERS ---
    const findContainer = (id: string) => {
        if (folders.some(f => f.id === id)) return id;
        return Object.keys(pages).find(key => pages[key].some(p => p.id === id));
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        const activeId = active.id as string;
        const overId = over?.id as string;

        if (!overId || activeId === overId) return;

        // Find move type
        const activeContainer = findContainer(activeId);
        const overContainer = findContainer(overId);

        if (!activeContainer || !overContainer || activeContainer === overContainer) return;

        // Only handle cross-folder page movements here
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
                const modifier = isBelowLastItem ? 1 : 0;
                newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length;
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

        // Folders Reordering
        const isActiveFolder = folders.some(f => f.id === activeId);
        if (isActiveFolder) {
            const oldIndex = folders.findIndex(f => f.id === activeId);
            const newIndex = folders.findIndex(f => f.id === overId);

            if (newIndex !== -1 && oldIndex !== newIndex) {
                const newFolders = arrayMove(folders, oldIndex, newIndex);
                setFolders(newFolders);
                try {
                    const reordered = newFolders.map((f, idx) => ({ id: f.id, order_index: idx }));
                    await api.post('/courses/reorder/modules', reordered);
                } catch (err) {
                    console.error('Failed to sync folder reorder', err);
                }
            }
            return;
        }

        // Pages Reordering / Move End
        const activeContainer = findContainer(activeId);
        const overContainer = findContainer(overId);

        if (activeContainer && overContainer) {
            const activeItems = pages[activeContainer];
            const overItems = pages[overContainer];

            const activeIndex = activeItems.findIndex(p => p.id === activeId);
            const overIndex = overItems.findIndex(p => p.id === overId);

            if (activeIndex !== overIndex || activeContainer !== overContainer) {
                // If container changed, update module_id on backend
                if (activeContainer !== overContainer) {
                    try {
                        await api.patch(`/courses/lessons/${activeId}`, { module_id: overContainer });
                    } catch (err) {
                        console.error('Failed to update lesson module_id', err);
                    }
                }

                // Sync new order for both containers
                try {
                    const reordered = pages[overContainer].map((p, idx) => ({ id: p.id, order_index: idx }));
                    await api.post('/courses/reorder/lessons', reordered);

                    if (activeContainer !== overContainer) {
                        const reorderedOld = pages[activeContainer].map((p, idx) => ({ id: p.id, order_index: idx }));
                        await api.post('/courses/reorder/lessons', reorderedOld);
                    }
                } catch (err) {
                    console.error('Failed to sync lesson order', err);
                }
            }
        }
    };

    if (!course) return (
        <div className="h-screen flex items-center justify-center bg-gray-50 font-bold text-gray-400 uppercase tracking-widest text-sm">
            Loading...
        </div>
    );

    return (
        <div className="h-screen bg-[#F9F9F9] flex flex-col font-sans overflow-hidden">
            <div className="flex-1 flex overflow-hidden relative pb-[70px] md:pb-0">
                {/* SIDEBAR */}
                <div className={`
                    ${mobileView === 'sidebar' ? 'flex' : 'hidden'} 
                    md:flex w-full md:w-[320px] bg-white md:bg-transparent border-r border-gray-100 flex-col overflow-hidden shrink-0 transition-all duration-300
                `}>
                    {/* Header for Mobile Curriculum */}
                    <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-50 flex-none bg-white sticky top-0 z-50">
                        <Link to="/courses" className="p-2 -ml-2 text-gray-400 hover:text-gray-900">
                            <ArrowLeft size={22} />
                        </Link>
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
                            <Link
                                to="/courses"
                                className="flex items-center gap-2 text-[11px] font-black text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors mb-2"
                            >
                                <ArrowLeft size={14} strokeWidth={3} />
                                Назад к курсам
                            </Link>
                        </div>

                        <div className="space-y-4 md:pr-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl md:text-xl font-bold text-gray-900 tracking-tight">{course.title}</h2>
                                <button className="md:p-1.5 hover:bg-gray-50 rounded-lg transition-colors">
                                    <ChevronDown size={18} className="text-gray-400" />
                                </button>
                            </div>
                            <div className="space-y-2">
                                <div className="w-full h-8 bg-gray-100 rounded-full overflow-hidden relative">
                                    <div className="absolute inset-y-0 left-0 bg-[#00A86B] transition-all duration-700 ease-out" style={{ width: '33%' }} />
                                    <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white uppercase tracking-widest">33%</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCorners}
                                onDragOver={handleDragOver}
                                onDragEnd={handleDragEnd}
                                modifiers={[restrictToVerticalAxis]}
                            >
                                <SortableContext items={folders.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-4">
                                        {folders.map(folder => (
                                            <SortableItem key={folder.id} id={folder.id}>
                                                <div className="space-y-3">
                                                    <div
                                                        onClick={(e) => { e.stopPropagation(); setOpenFolderMenu(openFolderMenu === folder.id ? null : folder.id); }}
                                                        className="px-1 flex items-center justify-between group/folder cursor-pointer transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <ChevronDown size={20} className={`text-gray-400 transition-transform ${openFolderMenu === folder.id ? 'rotate-180' : ''}`} />
                                                            <h3 className="text-[17px] font-bold text-gray-900 tracking-tight">{folder.title}</h3>
                                                        </div>
                                                        <div className="relative">
                                                            <button
                                                                className={`context-menu-trigger p-2 rounded-xl transition-all text-gray-400 hover:text-gray-900 hover:bg-gray-50 ${openFolderMenu === folder.id ? 'opacity-100' : 'opacity-40 group-hover/folder:opacity-100'}`}
                                                            >
                                                                <Monitor size={20} strokeWidth={2.5} className="rotate-90" />
                                                            </button>
                                                            {openFolderMenu === folder.id && (
                                                                <div className="context-menu-content absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setEditingFolderId(folder.id);
                                                                            setFormTitle(folder.title);
                                                                            setFormUnlockType(folder.unlock_type || 'immediate');
                                                                            setFormUnlockValue(folder.unlock_value || '');
                                                                            setIsAddFolderModalOpen(true);
                                                                            setOpenFolderMenu(null);
                                                                        }}
                                                                        className="w-full text-left px-5 py-3 text-[14px] font-bold text-gray-800 hover:bg-gray-50 transition-colors"
                                                                    >
                                                                        Настройки папки
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setIsAddPageModalOpen(folder.id); setFormTitle(''); setOpenFolderMenu(null); }}
                                                                        className="w-full text-left px-5 py-3 text-[14px] font-bold text-gray-800 hover:bg-gray-50 transition-colors border-t border-gray-50"
                                                                    >
                                                                        Добавить страницу
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleDuplicateFolder(folder.id); }}
                                                                        className="w-full text-left px-5 py-3 text-[14px] font-bold text-gray-800 hover:bg-gray-50 transition-colors"
                                                                    >
                                                                        Дублировать
                                                                    </button>
                                                                    <div className="h-px bg-gray-50 my-1 mx-3" />
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                                                                        className="w-full text-left px-5 py-3 text-[14px] font-bold text-red-500 hover:bg-red-50 transition-colors"
                                                                    >
                                                                        Удалить
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <SortableContext
                                                        items={(pages[folder.id] || []).map(p => p.id)}
                                                        strategy={verticalListSortingStrategy}
                                                    >
                                                        <div className="space-y-4 ml-8 border-none min-h-[4px]">
                                                            {(pages[folder.id] || []).map(page => (
                                                                <SortableItem key={page.id} id={page.id}>
                                                                    <div
                                                                        onClick={() => selectPage(page.id)}
                                                                        className={`w-full group/page relative flex items-center justify-between py-2 rounded-xl cursor-pointer transition-all duration-200`}
                                                                    >
                                                                        <span className={`text-[16px] font-medium tracking-tight ${activePageId === page.id ? 'text-blue-600 font-bold' : 'text-gray-800 group-hover/page:text-gray-900'}`}>
                                                                            {page.title}
                                                                        </span>
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="relative">
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); setOpenPageMenu(openPageMenu === page.id ? null : page.id); }}
                                                                                    className={`context-menu-trigger p-2 rounded-lg transition-all text-gray-300 hover:text-gray-900 ${openPageMenu === page.id ? 'opacity-100' : 'opacity-40 group-hover/page:opacity-100'}`}
                                                                                >
                                                                                    <Monitor size={18} className="rotate-90" />
                                                                                </button>
                                                                                {openPageMenu === page.id && (
                                                                                    <div className="context-menu-content absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); setEditingPageId(page.id); setFormTitle(page.title); setOpenPageMenu(null); }}
                                                                                            className="w-full text-left px-5 py-3 text-[14px] font-bold text-gray-800 hover:bg-gray-50 transition-colors"
                                                                                        >
                                                                                            Настройки страницы
                                                                                        </button>
                                                                                        <button onClick={(e) => { e.stopPropagation(); handleDeletePage(folder.id, page.id); setOpenPageMenu(null); }} className="w-full text-left px-5 py-3 text-[14px] font-bold text-red-500 hover:bg-red-50 transition-colors border-t border-gray-50">Удалить</button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className="w-6 h-6 rounded-full bg-[#00A86B] flex items-center justify-center text-white shrink-0 opacity-100">
                                                                                <CheckCircle size={16} strokeWidth={3} />
                                                                            </div>
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

                        {/* Add Menu (Desktop: Dropdown, Mobile: Explicit Icons) */}
                        <div className="mt-8 space-y-3 shrink-0 relative z-[100] pb-24 md:pb-0">
                            <div className="md:hidden grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => {
                                        const firstFolder = folders[0]?.id;
                                        if (firstFolder) { setIsAddPageModalOpen(firstFolder); setFormTitle(''); }
                                        else { setIsAddFolderModalOpen(true); setFormTitle(''); }
                                    }}
                                    className="flex-1 flex flex-col items-center justify-center gap-2 p-6 bg-blue-600 text-white rounded-3xl shadow-xl active:scale-95 transition-all text-[11px] font-black uppercase tracking-widest relative z-[101] border-b-4 border-blue-800"
                                >
                                    <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                                        <Plus size={24} strokeWidth={3} />
                                    </div>
                                    Урок
                                </button>
                                <button
                                    onClick={() => { setIsAddFolderModalOpen(true); setFormTitle(''); }}
                                    className="flex-1 flex flex-col items-center justify-center gap-2 p-6 bg-white text-gray-900 border border-gray-100 rounded-3xl shadow-lg active:scale-95 transition-all text-[11px] font-black uppercase tracking-widest relative z-[101] border-b-4 border-gray-200"
                                >
                                    <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center">
                                        <Box size={24} strokeWidth={2.5} className="text-gray-400" />
                                    </div>
                                    Папка
                                </button>
                            </div>

                            <div className="hidden md:block relative">
                                <button
                                    onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                                    className={`context-menu-trigger w-full flex items-center justify-between p-4 rounded-2xl transition-all ${isAddMenuOpen ? 'bg-blue-600 text-white shadow-lg' : 'bg-[#F3D382] text-[#8E7024] hover:bg-[#EDC561]'}`}
                                >
                                    <span className="text-sm font-bold uppercase tracking-widest">Новая страница</span>
                                    <ChevronUp size={16} className={`transform transition-transform ${isAddMenuOpen ? '' : 'rotate-180'}`} />
                                </button>
                                {isAddMenuOpen && (
                                    <div className="context-menu-content absolute left-0 bottom-full mb-2 w-full bg-white rounded-[24px] shadow-2xl border border-gray-100 py-2 z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                                        <button
                                            onClick={() => {
                                                const firstFolder = folders[0]?.id;
                                                if (firstFolder) { setIsAddPageModalOpen(firstFolder); setFormTitle(''); }
                                                else { setIsAddFolderModalOpen(true); setFormTitle(''); }
                                                setIsAddMenuOpen(false);
                                            }}
                                            className="w-full text-left px-6 py-4 hover:bg-gray-50 text-[15px] font-bold text-gray-900 transition-colors"
                                        >
                                            Добавить страницу
                                        </button>
                                        <button
                                            onClick={() => { setIsAddFolderModalOpen(true); setFormTitle(''); setIsAddMenuOpen(false); }}
                                            className="w-full text-left px-6 py-4 hover:bg-gray-50 text-[15px] font-bold text-gray-900 border-t border-gray-50 transition-colors"
                                        >
                                            Добавить папку
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* EDITOR AREA */}
                    <div className={`
                    ${mobileView === 'editor' ? 'flex' : 'hidden'} 
                    md:flex flex-1 flex-col bg-white overflow-hidden m-0 md:m-6 md:rounded-[40px] border-none md:border border-gray-100 shadow-none md:shadow-sm relative
                `}>
                        {activePageId ? (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="h-20 border-b border-gray-50 px-6 md:px-10 flex items-center justify-between bg-white shrink-0">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setMobileView('sidebar')}
                                            className="md:hidden p-2 text-gray-400 hover:text-gray-900"
                                        >
                                            <List size={22} />
                                        </button>
                                        <h1 className="text-lg md:text-2xl font-black text-gray-900 tracking-tight uppercase truncate max-w-[200px] md:max-w-none">
                                            {currentPage?.title}
                                        </h1>
                                    </div>
                                    <div className="flex items-center gap-2 md:gap-4">
                                        <button className="p-2 text-gray-300 hover:text-gray-900 transition-all rounded-xl hover:bg-gray-50"><Box size={20} /></button>
                                        <button className="p-2 text-gray-300 hover:text-gray-900 transition-all rounded-xl hover:bg-gray-50"><Edit3 size={20} /></button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-10 bg-white scrollbar-hide">
                                    <div className="max-w-4xl mx-auto min-h-[500px]">
                                        <RichTextEditor
                                            key={activePageId}
                                            content={richContent}
                                            onChange={setRichContent}
                                        />
                                    </div>
                                </div>

                                <div className="h-24 border-t border-gray-100 px-6 md:px-10 flex items-center justify-between bg-white shrink-0">
                                    <div className="hidden md:flex items-center gap-4">
                                        <button className="flex items-center gap-2 border-2 border-gray-100 px-6 py-3 rounded-2xl font-black text-gray-400 text-[11px] hover:border-gray-900 hover:text-gray-900 transition-all uppercase tracking-[0.2em]">
                                            ДОБАВИТЬ <ChevronDown size={14} />
                                        </button>
                                    </div>
                                    <div className="flex flex-1 md:flex-initial items-center justify-between md:justify-end gap-4 md:gap-10">
                                        <button onClick={() => selectPage(null)} className="px-4 md:px-6 py-3 text-[11px] font-black text-gray-300 hover:text-gray-900 uppercase tracking-widest transition-all">ОТМЕНА</button>
                                        <button
                                            onClick={handleSaveContent}
                                            className="bg-[#F3D382] text-[#8E7024] px-6 md:px-10 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-[#EDC561] hover:translate-y-[-2px] transition-all active:scale-95 flex-1 md:flex-none text-center"
                                        >
                                            СОХРАНИТЬ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-200 gap-4 p-6 text-center">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                                    <Box size={32} className="opacity-20" />
                                </div>
                                <p className="font-black text-xs uppercase tracking-[0.3em] opacity-30">Выберите страницу или создайте новую</p>
                                <button
                                    onClick={() => setMobileView('sidebar')}
                                    className="md:hidden mt-4 px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl font-black text-[11px] uppercase tracking-widest"
                                >
                                    К списку уроков
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* MODALS (SIMPLE) - MOVED TO TOP LEVEL FOR GLOBAL VISIBILITY */}
                {(isAddFolderModalOpen || isAddPageModalOpen || editingPageId) && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 md:p-6">
                        <div className="bg-white rounded-[32px] md:rounded-[10px] w-full max-w-sm p-8 space-y-6 animate-in zoom-in duration-200 shadow-2xl relative">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                                {isAddFolderModalOpen ? (editingFolderId ? 'Редактировать папку' : 'Новая папка') :
                                    (editingPageId ? 'Редактировать страницу' : 'Новая страница')}
                            </h3>
                            <input
                                autoFocus
                                className="w-full bg-gray-50 border border-gray-100 p-4 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-base font-bold placeholder:text-gray-300"
                                placeholder="Введите заголовок..."
                                value={formTitle}
                                onChange={e => setFormTitle(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        if (isAddFolderModalOpen) handleAddFolder();
                                        else if (editingPageId) {
                                            const allPagesList = Object.values(pages).flat();
                                            const page = allPagesList.find(p => p.id === editingPageId);
                                            if (page) handleEditPage(page.module_id);
                                        }
                                        else handleAddPage(isAddPageModalOpen!);
                                    }
                                }}
                            />

                            {isAddFolderModalOpen && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Тип доступа</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'immediate', label: 'Сразу', icon: CheckCircle },
                                                { id: 'level_based', label: 'По рейтингу', icon: Monitor },
                                                { id: 'time_relative', label: 'По сроку', icon: Settings }
                                            ].map((type) => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => setFormUnlockType(type.id as any)}
                                                    className={`p-3 flex items-center gap-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${formUnlockType === type.id ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                                                >
                                                    <type.icon size={14} />
                                                    {type.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {(formUnlockType === 'level_based' || formUnlockType === 'time_relative') && (
                                        <div className="animate-in fade-in slide-in-from-top-2">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                                                {formUnlockType === 'level_based' ? 'Требуемый Уровень' : 'Дней после вступления'}
                                            </label>
                                            <input
                                                type="number"
                                                placeholder="например: 5"
                                                className="w-full bg-gray-50 border border-gray-100 p-4 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-sm font-bold"
                                                value={formUnlockValue}
                                                onChange={e => setFormUnlockValue(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => { setIsAddFolderModalOpen(false); setIsAddPageModalOpen(null); setEditingFolderId(null); setEditingPageId(null); setFormTitle(''); }}
                                    className="flex-1 py-4 text-[11px] font-black text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={() => {
                                        if (isAddFolderModalOpen) handleAddFolder();
                                        else if (editingPageId) {
                                            const allPagesList = Object.values(pages).flat();
                                            const page = allPagesList.find(p => p.id === editingPageId);
                                            if (page) handleEditPage(page.module_id);
                                        }
                                        else handleAddPage(isAddPageModalOpen!);
                                    }}
                                    className="flex-2 bg-blue-600 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all active:scale-95"
                                >
                                    {isAddFolderModalOpen && editingFolderId || editingPageId ? 'Сохранить' : 'Создать'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            );
};