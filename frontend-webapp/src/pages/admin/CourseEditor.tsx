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
        <div className="min-h-dvh overflow-x-clip bg-background pb-32 animate-in fade-in duration-500">
            <header className="sticky top-0 z-50 bg-background/90 ios-blur border-b border-border px-4 pt-5 pb-4">
                <div className="max-w-xl mx-auto flex items-center gap-3">
                    <button
                        onClick={() => editor.navigate('/courses')}
                        className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                        aria-label="Вернуться к курсам"
                    >
                        <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-bold truncate">{editor.course?.title || 'Редактор курса'}</h1>
                        <p className="text-sm text-muted-foreground font-medium">Учебный план</p>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-xl space-y-3 px-3 py-6 sm:px-4">
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
                            className="h-11 rounded-lg px-6 text-xs font-medium"
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
                    className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border text-xs font-medium text-muted-foreground transition-all hover:border-primary/25 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 active:scale-[0.99]"
                >
                    <span className="material-symbols-outlined">create_new_folder</span>
                    Добавить модуль
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
