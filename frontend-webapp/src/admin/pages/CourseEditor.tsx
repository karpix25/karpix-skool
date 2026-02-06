import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/client';
import { ChevronDown, ChevronUp, Edit3, Box, ArrowLeft } from 'lucide-react';
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
                // Rename
                const res = await api.patch(`/courses/modules/${editingFolderId}`, { title: formTitle });
                setFolders(folders.map(f => f.id === editingFolderId ? res.data : f));
            } else {
                // Create
                const res = await api.post(`/courses/${id}/modules`, {
                    title: formTitle,
                    unlock_type: 'immediate',
                    order_index: folders.length
                });
                setFolders([...folders, res.data]);
            }
            setFormTitle('');
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
            return;
        }
        const page = Object.values(pages).flat().find(p => p.id === pageId);
        setRichContent(page?.content || '');
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
            <div className="flex-1 flex overflow-hidden">
                {/* SIDEBAR */}
                <div className="w-[300px] bg-transparent border-r border-gray-100 flex flex-col p-6 space-y-8">
                    <Link
                        to="/courses"
                        className="flex items-center gap-2 text-[11px] font-black text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors mb-2"
                    >
                        <ArrowLeft size={14} strokeWidth={3} />
                        Назад к курсам
                    </Link>

                    <div className="space-y-4 pr-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">{course.title}</h2>
                            <button className="p-1.5 hover:bg-white rounded-lg transition-colors">
                                <ChevronDown size={18} className="text-gray-400" />
                            </button>
                        </div>
                        <div className="space-y-1.5">
                            <div className="w-full h-8 bg-[#EAEAEA] rounded-full overflow-hidden relative border border-gray-100/50">
                                <div className="absolute inset-y-0 left-0 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-700 ease-out" style={{ width: '0%' }} />
                                <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-gray-500 uppercase tracking-widest">Прогресс 0%</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
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
                                            <div className="space-y-1">
                                                <div
                                                    onClick={(e) => { e.stopPropagation(); setOpenFolderMenu(openFolderMenu === folder.id ? null : folder.id); }}
                                                    className="px-3 pb-2 flex items-center justify-between group/folder cursor-pointer"
                                                >
                                                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">{folder.title}</h3>
                                                    <div className="relative">
                                                        <button
                                                            className={`context-menu-trigger p-1 rounded-md transition-opacity text-gray-400 hover:text-gray-900 ${openFolderMenu === folder.id ? 'opacity-100' : 'opacity-0 group-hover/folder:opacity-100'}`}
                                                        >
                                                            <ChevronDown size={14} />
                                                        </button>
                                                        {openFolderMenu === folder.id && (
                                                            <div className="context-menu-content absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-[100] overflow-hidden">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setEditingFolderId(folder.id); setFormTitle(folder.title); setIsAddFolderModalOpen(true); setOpenFolderMenu(null); }}
                                                                    className="w-full text-left px-5 py-2.5 text-[13px] font-bold text-gray-800 hover:bg-gray-50 transition-colors"
                                                                >
                                                                    Редактировать папку
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setIsAddPageModalOpen(folder.id); setFormTitle(''); setOpenFolderMenu(null); }}
                                                                    className="w-full text-left px-5 py-2.5 text-[13px] font-bold text-gray-800 hover:bg-gray-50 transition-colors"
                                                                >
                                                                    Добавить страницу в папку
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDuplicateFolder(folder.id); }}
                                                                    className="w-full text-left px-5 py-2.5 text-[13px] font-bold text-gray-800 hover:bg-gray-50 transition-colors"
                                                                >
                                                                    Дублировать папку
                                                                </button>
                                                                <div className="h-px bg-gray-50 my-1 mx-3" />
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                                                                    className="w-full text-left px-5 py-2.5 text-[13px] font-bold text-red-500 hover:bg-red-50 transition-colors"
                                                                >
                                                                    Удалить папку
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <SortableContext
                                                    items={(pages[folder.id] || []).map(p => p.id)}
                                                    strategy={verticalListSortingStrategy}
                                                >
                                                    <div className="space-y-1 ml-1 border-l-2 border-gray-50 min-h-[10px]">
                                                        {(pages[folder.id] || []).length === 0 && (
                                                            <div className="h-8 flex items-center px-4 text-[10px] font-bold text-gray-300 uppercase tracking-widest italic opacity-50">Пусто</div>
                                                        )}
                                                        {(pages[folder.id] || []).map(page => (
                                                            <SortableItem key={page.id} id={page.id}>
                                                                <div
                                                                    onClick={() => selectPage(page.id)}
                                                                    className={`w-full group/page relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${activePageId === page.id ? 'bg-[#F3D382] shadow-sm' : 'hover:bg-gray-100/50'}`}
                                                                >
                                                                    <span className={`text-[13px] font-bold tracking-tight ${activePageId === page.id ? 'text-[#8E7024]' : 'text-gray-500 hover:text-gray-900 transition-colors'}`}>
                                                                        {page.title}
                                                                    </span>
                                                                    <div className="relative">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); setOpenPageMenu(openPageMenu === page.id ? null : page.id); }}
                                                                            className={`context-menu-trigger p-1 rounded-md transition-opacity ${activePageId === page.id ? 'text-[#8E7024]' : 'text-gray-400 opacity-0 group-hover/page:opacity-100'}`}
                                                                        >
                                                                            <ChevronDown size={14} />
                                                                        </button>
                                                                        {openPageMenu === page.id && (
                                                                            <div className="context-menu-content absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-50 overflow-hidden">
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); setEditingPageId(page.id); setFormTitle(page.title); setOpenPageMenu(null); }}
                                                                                    className="w-full text-left px-5 py-2.5 text-[13px] font-bold text-gray-800 hover:bg-gray-50 transition-colors"
                                                                                >
                                                                                    Настройки страницы
                                                                                </button>
                                                                                <button onClick={(e) => { e.stopPropagation(); handleDeletePage(folder.id, page.id); setOpenPageMenu(null); }} className="w-full text-left px-5 py-2.5 text-[13px] font-bold text-red-500 hover:bg-red-50 transition-colors">Удалить</button>
                                                                            </div>
                                                                        )}
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

                        {/* Add Menu */}
                        <div className="relative mt-8">
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
                <div className="flex-1 flex flex-col bg-white overflow-hidden m-6 rounded-[40px] border border-gray-100 shadow-sm relative">
                    {activePageId ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="h-20 border-b border-gray-50 px-10 flex items-center justify-between bg-white shrink-0">
                                <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">{currentPage?.title}</h1>
                                <div className="flex items-center gap-4">
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

                            <div className="h-24 border-t border-gray-100 px-10 flex items-center justify-between bg-white shrink-0">
                                <div className="flex items-center gap-4">
                                    <button className="flex items-center gap-2 border-2 border-gray-100 px-6 py-3 rounded-2xl font-black text-gray-400 text-[11px] hover:border-gray-900 hover:text-gray-900 transition-all uppercase tracking-[0.2em]">
                                        ДОБАВИТЬ <ChevronDown size={14} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-10">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[11px] font-black text-green-600 uppercase tracking-widest">Опубликовано</span>
                                        <div className="w-12 h-6 bg-green-50 rounded-full p-1 relative cursor-pointer border border-green-100">
                                            <div className="w-4 h-4 bg-green-500 rounded-full absolute right-1" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => selectPage(null)} className="px-6 py-3 text-[11px] font-black text-gray-300 hover:text-gray-900 uppercase tracking-widest transition-all">ОТМЕНА</button>
                                        <button
                                            onClick={handleSaveContent}
                                            className="bg-[#F3D382] text-[#8E7024] px-10 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-[#EDC561] hover:translate-y-[-2px] transition-all active:scale-95"
                                        >
                                            СОХРАНИТЬ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-200 gap-4">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                                <Box size={32} className="opacity-20" />
                            </div>
                            <p className="font-black text-xs uppercase tracking-[0.3em] opacity-30">Выберите страницу, чтобы начать</p>
                        </div>
                    )}

                    {/* MODALS (SIMPLE) */}
                    {(isAddFolderModalOpen || isAddPageModalOpen || editingPageId) && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-6">
                            <div className="bg-white rounded-[40px] w-full max-w-md p-10 space-y-8 animate-in zoom-in duration-200 border border-white/20">
                                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                                    {isAddFolderModalOpen ? (editingFolderId ? 'Редактировать папку' : 'Новая папка') :
                                        (editingPageId ? 'Редактировать страницу' : 'Новая страница')}
                                </h3>
                                <input
                                    autoFocus
                                    className="w-full bg-gray-50 border-none p-5 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none text-lg font-bold placeholder:text-gray-300"
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
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => { setIsAddFolderModalOpen(false); setIsAddPageModalOpen(null); setEditingFolderId(null); setEditingPageId(null); setFormTitle(''); }}
                                        className="flex-1 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest"
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
                                        className="flex-1 bg-[#F3D382] text-[#8E7024] py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg"
                                    >
                                        {isAddFolderModalOpen && editingFolderId || editingPageId ? 'Сохранить' : 'Создать'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
