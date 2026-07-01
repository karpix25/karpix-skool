import React from 'react';
import { Plus } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { Button } from '../../components/ui/button';
import { CourseEditorSkeleton } from './course-editor/CourseEditorSkeleton';
import { ModuleDialog } from './course-editor/ModuleDialog';
import { SortableModule } from './course-editor/SortableModule';
import { useCourseEditor } from './course-editor/useCourseEditor';

export const CourseEditor: React.FC = () => {
    const editor = useCourseEditor();

    if (editor.isLoading) return <CourseEditorSkeleton />;

    return (
        <div className="min-h-screen bg-background pb-32 animate-in fade-in duration-500">
            <header className="sticky top-0 z-50 bg-background/80 ios-blur border-b border-slate-200 dark:border-slate-800 px-4 pt-6 pb-4">
                <div className="max-w-xl mx-auto flex items-center gap-3">
                    <button
                        onClick={() => editor.navigate('/courses')}
                        className="p-1 -ml-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
                    >
                        <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-bold tracking-tight truncate">{editor.course?.title || 'Редактор курса'}</h1>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Учебный план</p>
                    </div>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-4 py-6 space-y-3">
                {editor.modules.length === 0 ? (
                    <div className="py-24 text-center flex flex-col items-center justify-center space-y-6 bg-slate-50 dark:bg-slate-900/20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                            <span className="material-symbols-outlined text-4xl">folder_off</span>
                        </div>
                        <div className="space-y-1 max-w-[240px]">
                            <p className="text-sm font-bold">Учебный план пуст</p>
                            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Добавьте первый модуль, чтобы начать.</p>
                        </div>
                        <Button
                            onClick={editor.openNewModuleModal}
                            variant="secondary"
                            className="rounded-xl h-10 px-6 font-bold text-xs uppercase tracking-widest"
                        >
                            <Plus size={14} className="mr-2" /> Новый модуль
                        </Button>
                    </div>
                ) : (
                    <DndContext
                        sensors={editor.sensors}
                        collisionDetection={closestCenter}
                        onDragOver={editor.handleDragOver}
                        onDragEnd={editor.handleDragEnd}
                    >
                        <SortableContext items={editor.modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                                {editor.modules.map((module) => (
                                    <SortableModule
                                        key={module.id}
                                        module={module}
                                        courseId={editor.courseId!}
                                        isExpanded={editor.expandedModules.has(module.id)}
                                        onToggle={() => editor.toggleModule(module.id)}
                                        onAddLesson={() => editor.navigate(`/courses/${editor.courseId}/lessons/new?moduleId=${module.id}`)}
                                        onTogglePublish={editor.handleTogglePublish}
                                        onDeleteModule={editor.handleDeleteModule}
                                        onDeleteLesson={editor.handleDeleteLesson}
                                        onEditSettings={() => editor.openEditModuleModal(module)}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}

                <button
                    onClick={editor.openNewModuleModal}
                    className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800/20 hover:border-slate-400 dark:hover:border-slate-600 transition-all active:scale-[0.98] mt-4"
                >
                    <span className="material-symbols-outlined">create_new_folder</span>
                    ДОБАВИТЬ МОДУЛЬ
                </button>
            </main>

            <ModuleDialog
                open={editor.isModuleModalOpen}
                editingModule={editor.editingModule}
                moduleForm={editor.moduleForm}
                onOpenChange={(open) => {
                    if (!open) editor.closeModuleModal();
                    else editor.setIsModuleModalOpen(true);
                }}
                onFormChange={editor.setModuleForm}
                onSave={editor.saveModule}
                onDelete={editor.handleDeleteModule}
            />
        </div>
    );
};
