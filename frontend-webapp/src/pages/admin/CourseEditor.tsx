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
        <div className="min-h-dvh bg-background pb-32 animate-in fade-in duration-500">
            <header className="sticky top-0 z-50 bg-background/90 ios-blur border-b border-border px-4 pt-5 pb-4">
                <div className="max-w-xl mx-auto flex items-center gap-3">
                    <button
                        onClick={() => editor.navigate('/courses')}
                        className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-bold truncate">{editor.course?.title || 'Редактор курса'}</h1>
                        <p className="text-[10px] text-muted-foreground font-medium">Учебный план</p>
                    </div>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-4 py-6 space-y-3">
                {editor.modules.length === 0 ? (
                    <div className="py-24 text-center flex flex-col items-center justify-center space-y-6 bg-card border border-dashed border-border rounded-lg">
                        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                            <span className="material-symbols-outlined text-4xl">folder_off</span>
                        </div>
                        <div className="space-y-1 max-w-[240px]">
                            <p className="text-sm font-bold">Учебный план пуст</p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">Добавьте первый модуль, чтобы начать.</p>
                        </div>
                        <Button
                            onClick={editor.openNewModuleModal}
                            variant="secondary"
                            className="rounded-lg h-10 px-6 font-bold text-xs"
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
                    className="w-full py-4 border border-dashed border-border rounded-lg text-xs font-bold text-muted-foreground flex items-center justify-center gap-2 hover:bg-muted/60 hover:border-primary/25 transition-all active:scale-[0.99] mt-4"
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
